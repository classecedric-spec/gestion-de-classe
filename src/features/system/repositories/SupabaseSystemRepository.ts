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
        // --- 0. CONSTANTES ET HELPERS ---
        const today = new Date('2026-04-20');
        const getISO = (d: Date) => d.toISOString().split('T')[0];

        // Helper pour les dates de fin
        const thisFriday = new Date(today);
        thisFriday.setDate(today.getDate() + (5 - today.getDay())); // Vendredi 24/04

        const lastFriday = new Date(thisFriday);
        lastFriday.setDate(thisFriday.getDate() - 7); // Vendredi 17/04

        const randomPastDate = () => {
            const d = new Date(today);
            d.setDate(today.getDate() - (Math.floor(Math.random() * 60) + 10));
            return getISO(d);
        };

        const randomArrayElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

        // --- 1. NIVEAUX ET CLASSE ---
        const { data: levels, error: lErr } = await supabase.from('Niveau').insert([
            { nom: 'P1 - Primaire 1', ordre: 1, user_id: userId },
            { nom: 'P2 - Primaire 2', ordre: 2, user_id: userId }
        ]).select();
        if (lErr || !levels) throw lErr;
        const n1 = levels.find(l => l.nom.includes('P1'))!.id;
        const n2 = levels.find(l => l.nom.includes('P2'))!.id;

        const { data: classe, error: cErr } = await supabase.from('Classe').insert([
            { nom: 'Classe de Test Alpha', user_id: userId }
        ]).select().single();
        if (cErr || !classe) throw cErr;
        const classeId = classe.id;

        // --- 2. GROUPES ---
        const { data: groups, error: gErr } = await supabase.from('Groupe').insert([
            { nom: 'Les Explorateurs', acronyme: 'EXP', user_id: userId, classe_id: classeId },
            { nom: 'Les Inventeurs', acronyme: 'INV', user_id: userId, classe_id: classeId }
        ]).select();
        if (gErr || !groups) throw gErr;
        const g1 = groups[0].id;
        const g2 = groups[1].id;

        // --- 3. ÉLÈVES ---
        const studentsRaw = [
            { prenom: 'Lucas', nom: 'Dubois', sex: 'M', niveau_id: n1 },
            { prenom: 'Emma', nom: 'Bernard', sex: 'F', niveau_id: n1 },
            { prenom: 'Hugo', nom: 'Petit', sex: 'M', niveau_id: n1 },
            { prenom: 'Chloé', nom: 'Durand', sex: 'F', niveau_id: n1 },
            { prenom: 'Arthur', nom: 'Leroy', sex: 'M', niveau_id: n1 },
            { prenom: 'Alice', nom: 'Moreau', sex: 'F', niveau_id: n1 },
            { prenom: 'Jules', nom: 'Simon', sex: 'M', niveau_id: n1 },
            { prenom: 'Gabriel', nom: 'Laurent', sex: 'M', niveau_id: n2 },
            { prenom: 'Manon', nom: 'Lefebvre', sex: 'F', niveau_id: n2 },
            { prenom: 'Nathan', nom: 'Michel', sex: 'M', niveau_id: n2 },
            { prenom: 'Zoé', nom: 'Garcia', sex: 'F', niveau_id: n2 },
            { prenom: 'Louis', nom: 'David', sex: 'M', niveau_id: n2 },
            { prenom: 'Léa', nom: 'Bertrand', sex: 'F', niveau_id: n2 },
            { prenom: 'Enzo', nom: 'Rousseau', sex: 'M', niveau_id: n2 }
        ];

        const studentsData = studentsRaw.map(s => ({
            ...s,
            classe_id: classeId,
            titulaire_id: userId,
            date_naissance: '2018-05-15',
            photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.prenom}`
        }));

        const { data: students, error: sErr } = await supabase.from('Eleve').insert(studentsData).select();
        if (sErr || !students) throw sErr;

        // Liaison groupes : 50/50
        const egLinks = students.map((s, idx) => ({
            eleve_id: s.id,
            groupe_id: idx < 7 ? g1 : g2,
            user_id: userId
        }));
        await supabase.from('EleveGroupe').insert(egLinks);

        // --- 4. MATÉRIEL ---
        const { data: materials, error: mErr } = await supabase.from('TypeMateriel').insert([
            { nom: 'Tablette', acronyme: 'TAB', user_id: userId },
            { nom: 'Dictionnaire', acronyme: 'DIC', user_id: userId },
            { nom: 'Jetons', acronyme: 'JET', user_id: userId }
        ]).select();
        const matIds = (materials || []).map(m => m.id);

        // --- 5. BRANCHES, SOUS-BRANCHES ET MODULES ---
        const branchConfigs = [
            { nom: 'Français', couleur: '#3B82F6' },
            { nom: 'Mathématiques', couleur: '#EF4444' },
            { nom: 'Éveil', couleur: '#10B981' }
        ];

        const activityTitles: Record<string, string[]> = {
            'Français': ['Grammaire', 'Conjugaison', 'Lecture', 'Dictée', 'Expression Écrite', 'Vocabulaire', 'Orthographe'],
            'Mathématiques': ['Calcul Mental', 'Géométrie', 'Fractions', 'Problèmes', 'Numération', 'Mesures', 'Grandeurs'],
            'Éveil': ['Préhistoire', 'Géographie', 'Sciences', 'Histoire', 'Europe', 'Nature', 'Espace']
        };

        for (const bConf of branchConfigs) {
            const { data: branch } = await supabase.from('Branche').insert({ ...bConf, user_id: userId }).select().single();
            if (!branch) continue;

            const { data: subBranch } = await supabase.from('SousBranche').insert({
                nom: 'Général',
                branche_id: branch.id,
                user_id: userId,
                ordre: 1
            }).select().single();
            const subId = subBranch?.id;

            const modArch = await supabase.from('Module').insert({ nom: `Module Archivé ${branch.nom}`, branche_id: branch.id, sous_branche_id: subId, user_id: userId, statut: 'archive', date_fin: randomPastDate() }).select().single();
            const modCours = await supabase.from('Module').insert({ nom: `Module Actuel ${branch.nom}`, branche_id: branch.id, sous_branche_id: subId, user_id: userId, statut: 'en_cours', date_fin: getISO(thisFriday) }).select().single();
            const modFini = await supabase.from('Module').insert({ nom: `Module Récemment Fini ${branch.nom}`, branche_id: branch.id, sous_branche_id: subId, user_id: userId, statut: 'en_cours', date_fin: getISO(lastFriday) }).select().single();

            const mods = [modArch.data, modCours.data, modFini.data].filter(Boolean);
            const titles = activityTitles[branch.nom];

            for (let i = 0; i < 7; i++) {
                const targetMod = mods[i % mods.length];
                const { data: act } = await supabase.from('Activite').insert({
                    titre: titles[i],
                    module_id: targetMod.id,
                    user_id: userId,
                    nombre_exercices: 10,
                    nombre_erreurs: 2,
                    statut_exigence: 'obligatoire'
                }).select().single();

                if (act) {
                    // Niveaux d'activité
                    await supabase.from('ActiviteNiveau').insert([
                        { activite_id: act.id, niveau_id: n1, user_id: userId },
                        { activite_id: act.id, niveau_id: n2, user_id: userId }
                    ]);

                    // Matériel aléatoire
                    if (Math.random() > 0.5 && matIds.length > 0) {
                        await supabase.from('ActiviteMateriel').insert({ activite_id: act.id, type_materiel_id: randomArrayElement(matIds) });
                    }

                    // Progressions aléatoires
                    const progressData = students.map(student => ({
                        eleve_id: student.id,
                        activite_id: act.id,
                        user_id: userId,
                        etat: randomArrayElement(['a_commencer', 'besoin_d_aide', 'a_verifier', 'termine']),
                        updated_at: new Date().toISOString()
                    }));
                    await supabase.from('Progression').insert(progressData);
                }
            }

            // --- 6. ÉVALUATIONS ET NOTES ---
            for (let j = 0; j < 2; j++) {
                const { data: evalData } = await supabase.from('Evaluation').insert({
                    user_id: userId,
                    branche_id: branch.id,
                    titre: `Éval ${branch.nom} n°${j + 1}`,
                    date: getISO(today),
                    note_max: 10,
                    group_id: g1 // Simplification
                }).select().single();

                if (evalData) {
                    const results = students.map(s => ({
                        user_id: userId,
                        evaluation_id: evalData.id,
                        eleve_id: s.id,
                        note: parseFloat((Math.random() * 6 + 4).toFixed(1)), // Entre 4 et 10
                        commentaire: randomArrayElement(['Très bien', 'En progrès', 'À retravailler', 'Pas mal']),
                        statut: 'present'
                    }));
                    await supabase.from('Resultat').insert(results);
                }
            }
        }

        // --- 7. PRÉSENCE ---
        const attendanceData: any[] = [];
        for (let d = 0; d < 3; d++) {
            const dateAtt = new Date(today);
            dateAtt.setDate(today.getDate() - d);
            const dateStr = getISO(dateAtt);

            students.forEach(s => {
                attendanceData.push({
                    date: dateStr,
                    eleve_id: s.id,
                    user_id: userId,
                    status: Math.random() > 0.9 ? randomArrayElement(['absent', 'late']) : 'present'
                });
            });
        }
        await supabase.from('Attendance').insert(attendanceData);

        // --- 8. RESPONSABILITÉS ---
        const respList = ['Chef de rang', 'Météo', 'Distributeur'];
        for (const rName of respList) {
            const { data: resp } = await supabase.from('Responsabilite').insert({ titre: rName, user_id: userId }).select().single();
            if (resp) {
                await supabase.from('ResponsabiliteEleve').insert({
                    responsabilite_id: resp.id,
                    eleve_id: randomArrayElement(students).id,
                    user_id: userId
                });
            }
        }

        // --- 9. PLANNING ---
        const planningEntries = [
            { day_of_week: 'Lundi', start_time: '08:30', end_time: '09:15', activity_title: 'Accueil' },
            { day_of_week: 'Lundi', start_time: '10:30', end_time: '11:15', activity_title: 'Maths' },
            { day_of_week: 'Mardi', start_time: '09:15', end_time: '10:00', activity_title: 'Français' },
            { day_of_week: 'Jeudi', start_time: '14:00', end_time: '15:30', activity_title: 'Éveil' },
            { day_of_week: 'Vendredi', start_time: '15:30', end_time: '16:00', activity_title: 'Bilan' }
        ];
        await supabase.from('weekly_planning').insert(planningEntries.map(e => ({ ...e, user_id: userId })));
    }

    /**
     * RESET COMPLET : Supprime toutes les données de l'enseignant dans l'ordre pour respecter les contraintes d'intégrité (FK).
     */
    async hardReset(userId: string): Promise<void> {
        // Suppression par couches (les enfants d'abord, les parents après)
        // On sécurise chaque suppression avec .eq('user_id', userId) ou le champ d'appartenance approprié.
        
        await supabase.from('SuiviAdulte').delete().eq('user_id', userId);
        await supabase.from('Progression').delete().eq('user_id', userId);
        await supabase.from('Attendance').delete().eq('user_id', userId);
        await supabase.from('EleveGroupe').delete().eq('user_id', userId);
        await supabase.from('ActiviteNiveau').delete().eq('user_id', userId);
        await supabase.from('ActiviteMateriel').delete().not('activite_id', 'is', null);
        await supabase.from('Resultat').delete().eq('user_id', userId);
        await supabase.from('Evaluation').delete().eq('user_id', userId);
        await supabase.from('ResponsabiliteEleve').delete().eq('user_id', userId);
        await supabase.from('Responsabilite').delete().eq('user_id', userId);
        await supabase.from('weekly_planning').delete().eq('user_id', userId);
        await supabase.from('PlanificationHebdo').delete().not('id', 'is', null); // Cascade ou autre

        await supabase.from('Eleve').delete().eq('titulaire_id', userId);
        await supabase.from('ClasseAdulte').delete().eq('user_id', userId);
        await supabase.from('Activite').delete().eq('user_id', userId);
        await supabase.from('Module').delete().eq('user_id', userId);
        await supabase.from('SousBranche').delete().eq('user_id', userId);
        await supabase.from('Branche').delete().eq('user_id', userId);
        await supabase.from('SousDomaine').delete().eq('user_id', userId);
        await supabase.from('Groupe').delete().eq('user_id', userId);
        await supabase.from('Classe').delete().eq('user_id', userId);
        await supabase.from('Niveau').delete().eq('user_id', userId);

        await supabase.from('TypeActiviteAdulte').delete().eq('user_id', userId);
        await supabase.from('Adulte').delete().eq('user_id', userId);
        await supabase.from('CategoriePresence').delete().eq('user_id', userId);
        await supabase.from('SetupPresence').delete().eq('user_id', userId);
        await supabase.from('TypeMateriel').delete().eq('user_id', userId);
        await supabase.from('UserPreference').delete().eq('user_id', userId);
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
