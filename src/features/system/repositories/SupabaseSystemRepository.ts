/**
 * Nom du module/fichier : SupabaseSystemRepository.ts
 * 
 * Données en entrée : Identifiants utilisateur et données de structures scolaires.
 * 
 * Données en sortie : Confirmations d'écritures ou de suppressions en base de données.
 * 
 * Objectif principal : Exécuter techniquement les commandes de maintenance sur la base de données Supabase. Ce fichier contient le code de "bas niveau" qui discute directement avec les tables SQL pour créer une classe entière de test, réparer des lignes corrompues ou vider le compte de l'utilisateur.
 * 
 * Ce que ça fait : 
 *   - `checkAndFixProgressions` : Corrige les états de progression vides.
 *   - `generateDemoData` : Crée une structure complète (Niveaux, Classes, Groupes, Élèves, Activités) en une seule fois.
 *   - `hardReset` : Vide systématiquement toutes les tables liées à l'utilisateur pour une remise à zéro usine.
 */

import { ISystemRepository } from './ISystemRepository';
import { supabase } from '../../../lib/database';

export class SupabaseSystemRepository implements ISystemRepository {

    /**
     * RÉPARATION : Trouve les progressions qui n'ont pas d'état ("etat is null") et les initialise à "a_commencer".
     */
    async checkAndFixProgressions(): Promise<number> {
        const { data: invalidProgs, error } = await supabase
            .from('Progression')
            .select('id, etat')
            // @ts-ignore
            .or('etat.is.null,etat.eq.""');

        if (error) throw error;

        if (!invalidProgs || invalidProgs.length === 0) {
            return 0;
        }

        const { error: updateError } = await supabase
            .from('Progression')
            .update({ etat: 'a_commencer' } as any)
            .in('id', invalidProgs.map(p => p.id));

        if (updateError) throw updateError;

        return invalidProgs.length;
    }

    /**
     * GÉNÉRATION DÉMO : Crée un environnement pédagogique complet pour permettre à un nouvel utilisateur de tester l'app.
     * Étapes : Niveaux -> Classe -> Groupes -> Élèves -> Structure pédagogique -> Modules -> Activités.
     */
    async generateDemoData(userId: string): Promise<void> {
        // 1. Création des Niveaux par défaut (Niveau 1 et 2)
        const { data: levels, error: lErr } = await supabase.from('Niveau').insert([
            { nom: 'Niveau 1', ordre: 1, user_id: userId },
            { nom: 'Niveau 2', ordre: 2, user_id: userId }
        ]).select();
        if (lErr || !levels) throw lErr;
        const n1 = levels.find(l => l.nom === 'Niveau 1')!.id;
        const n2 = levels.find(l => l.nom === 'Niveau 2')!.id;

        // 2. Création de la Classe
        const { data: classe, error: cErr } = await supabase.from('Classe').insert([
            { nom: 'Classe de test', user_id: userId }
        ]).select().single();
        if (cErr || !classe) throw cErr;
        const classeId = classe.id;

        // 3. Création des Groupes de travail
        const { data: groups, error: gErr } = await supabase.from('Groupe').insert([
            { nom: 'Groupe A', acronyme: 'GA', user_id: userId, classe_id: classeId },
            { nom: 'Groupe B', acronyme: 'GB', user_id: userId, classe_id: classeId },
            { nom: 'Groupe AB', acronyme: 'GAB', user_id: userId, classe_id: classeId }
        ]).select();
        if (gErr || !groups) throw gErr;
        const gA = groups.find(g => g.nom === 'Groupe A')!.id;
        const gB = groups.find(g => g.nom === 'Groupe B')!.id;
        const gAB = groups.find(g => g.nom === 'Groupe AB')!.id;

        // 4. Création de 22 Élèves fictifs
        const studentsData = [];
        for (let i = 1; i <= 10; i++) {
            studentsData.push({
                nom: `1.${i}`,
                prenom: String.fromCharCode(64 + i),
                niveau_id: n1,
                classe_id: classeId,
                titulaire_id: userId,
                date_naissance: '2018-09-01'
            });
        }
        for (let i = 1; i <= 12; i++) {
            studentsData.push({
                nom: `2.${i}`,
                prenom: String.fromCharCode(76 + i),
                niveau_id: n2,
                classe_id: classeId,
                titulaire_id: userId,
                date_naissance: '2017-09-01'
            });
        }
        const { data: insertedStudents, error: sErr } = await supabase.from('Eleve').insert(studentsData).select();
        if (sErr || !insertedStudents) throw sErr;

        // Liaison des élèves aux groupes (A, B ou AB)
        const eleveGroupeLinks: any[] = [];
        insertedStudents.forEach(student => {
            const isN1 = student.nom!.startsWith('1.');
            if (isN1) {
                eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gA, user_id: userId });
                eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gAB, user_id: userId });
            } else {
                eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gB, user_id: userId });
                eleveGroupeLinks.push({ eleve_id: student.id, groupe_id: gAB, user_id: userId });
            }
        });
        await supabase.from('EleveGroupe').insert(eleveGroupeLinks);

        // 5. Création de la structure pédagogique (Français, Math, Eveil)
        const branchesConfig = [
            { nom: 'Français', subs: ['Lecture', 'Écriture', 'Grammaire'] },
            { nom: 'Mathématiques', subs: ['Numération', 'Géométrie', 'Calcul'] },
            { nom: 'Éveil', subs: ['Histoire', 'Géographie', 'Sciences'] }
        ];

        const allSubIds: string[] = [];
        for (const b of branchesConfig) {
            const { data: branch, error: bErr } = await supabase.from('Branche').insert({ nom: b.nom, user_id: userId }).select().single();
            if (bErr || !branch) throw bErr;
            for (const sName of b.subs) {
                const { data: sub, error: sbErr } = await supabase.from('SousBranche').insert({ nom: sName, branche_id: branch.id, user_id: userId }).select().single();
                if (sbErr || !sub) throw sbErr;
                allSubIds.push(sub.id);
            }
        }

        // 6. Création des Modules et Activités liées aux élèves (Progressions)
        const createModuleWithActivities = async (moduleName: string, subId: string, levelIds: string[]) => {
            const { data: mod } = await supabase.from('Module').insert({
                nom: moduleName,
                sous_branche_id: subId,
                user_id: userId,
                statut: 'en_cours'
            }).select().single();

            if (!mod) return;

            const activitiesToInsert = [1, 2, 3].map(i => ({
                titre: `${moduleName} - Act ${i}`,
                module_id: mod.id,
                user_id: userId,
                nombre_exercices: 10,
                nombre_erreurs: 2,
                statut_exigence: 'obligatoire'
            }));
            const { data: insertedActs } = await supabase.from('Activite').insert(activitiesToInsert).select();

            if (!insertedActs) return;

            for (const act of insertedActs) {
                const actLevels = levelIds.map(lId => ({
                    activite_id: act.id,
                    niveau_id: lId,
                    user_id: userId,
                    nombre_exercices: 10,
                    nombre_erreurs: 2,
                    statut_exigence: 'obligatoire'
                }));
                await supabase.from('ActiviteNiveau').insert(actLevels);

                const relevantStudents = insertedStudents.filter(s => levelIds.includes(s.niveau_id));
                const progressions = relevantStudents.map(s => ({
                    eleve_id: s.id,
                    activite_id: act.id,
                    etat: 'a_commencer',
                    user_id: userId
                }));
                if (progressions.length > 0) await supabase.from('Progression').insert(progressions);
            }
        };

        if (allSubIds.length > 0) {
            await createModuleWithActivities('Lecture Fondamentale', allSubIds[0], [n1]);
        }
        if (allSubIds.length > 5) {
            await createModuleWithActivities('Calcul Avancé', allSubIds[5], [n2]);
        }
    }

    /**
     * RESET COMPLET : Supprime toutes les données de l'enseignant dans l'ordre pour respecter les contraintes d'intégrité (FK).
     */
    async hardReset(_userId: string): Promise<void> {
        // Suppression par couches (les enfants d'abord, les parents après)
        await supabase.from('SuiviAdulte').delete().not('id', 'is', null);
        await supabase.from('Progression').delete().not('id', 'is', null);
        await supabase.from('Attendance').delete().not('id', 'is', null);
        await supabase.from('EleveGroupe').delete().not('id', 'is', null);
        await supabase.from('ActiviteNiveau').delete().not('id', 'is', null);
        await supabase.from('ActiviteMateriel').delete().not('id', 'is', null);

        await supabase.from('Eleve').delete().not('id', 'is', null);
        await supabase.from('ClasseAdulte').delete().not('id', 'is', null);
        await supabase.from('Activite').delete().not('id', 'is', null);
        await supabase.from('Module').delete().not('id', 'is', null);
        await supabase.from('SousBranche').delete().not('id', 'is', null);
        await supabase.from('Branche').delete().not('id', 'is', null);
        await supabase.from('SousDomaine').delete().not('id', 'is', null);
        await supabase.from('Groupe').delete().not('id', 'is', null);
        await supabase.from('Classe').delete().not('id', 'is', null);
        await supabase.from('Niveau').delete().not('id', 'is', null);

        await supabase.from('TypeActiviteAdulte').delete().not('id', 'is', null);
        await supabase.from('Adulte').delete().not('id', 'is', null);
        await supabase.from('CategoriePresence').delete().not('id', 'is', null);
        await supabase.from('SetupPresence').delete().not('id', 'is', null);
        await supabase.from('TypeMateriel').delete().not('id', 'is', null);
        await supabase.from('UserPreference').delete().not('id', 'is', null);
    }
}

/**
 * LOGIGRAMME DE RÉINITIALISATION :
 * 
 * 1. DANGER -> L'enseignant confirme vouloir tout effacer.
 * 2. RÉCURSION -> Le code commence par effacer les "détails" (ex: présences, progressions).
 * 3. NETTOYAGE -> Une fois les détails effacés, il supprime les "objets" (ex: élèves, classes).
 * 4. FINALISATION -> Il termine par les réglages de base (préférences, types de matériel).
 * 5. RÉSULTAT -> L'utilisateur se retrouve avec un compte vierge comme au premier jour.
 */
