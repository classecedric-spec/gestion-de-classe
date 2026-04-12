/**
 * Nom du module/fichier : SupabaseStudentRepository.ts
 * 
 * Données en entrée : Les ordres de mission envoyés par le service métier (ex: un identifiant d'élève, des coordonnées parentales ou une affectation de groupe).
 * 
 * Données en sortie : Les données réelles extraites de la base de données distante (Supabase) ou une confirmation technique de succès.
 * 
 * Objectif principal : Servir de "bras armé" technique pour la manipulation des données. Ce fichier est le seul à connaître les secrets de la base de données (noms des tables, structure SQL). Il traduit les besoins métier ("Trouve cet élève") en requêtes informatiques précises (".from('Eleve').select('*')..."). Il gère également les jointures complexes pour récupérer d'un seul coup les informations de la classe et des groupes d'un enfant.
 * 
 * Ce que ça affiche : Rien, c'est un moteur de données (Couche Infrastructure).
 */

import { supabase } from '../../../lib/database';
import { fetchDelta } from '../../../lib/sync';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IStudentRepository } from './IStudentRepository';

/**
 * Implémentation du dépôt d'élèves utilisant la technologie Supabase (PostgreSQL).
 */
export class SupabaseStudentRepository implements IStudentRepository {
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseStudentRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }
    
    /**
     * Recherche un élève spécifique par son identifiant unique.
     */
    async findById(id: string, userId: string): Promise<Tables<'Eleve'> | null> {
        if (!this.validateUserId(userId)) return null;
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('id', id)
            .eq('titulaire_id', userId)
            .single();

        if (error) throw error;
        return data as Tables<'Eleve'> | null;
    }

    /**
     * Récupère la liste intégrale de tous les élèves (sans filtre particulier).
     */
    async findAll(userId: string): Promise<Tables<'Eleve'>[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('titulaire_id', userId)
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Crée une nouvelle ligne dans le registre des élèves.
     */
    async create(student: TablesInsert<'Eleve'>, userId: string): Promise<Tables<'Eleve'>> {
        if (!this.validateUserId(userId)) throw new Error("userId required");
        const { data, error } = await supabase
            .from('Eleve')
            .insert({ ...student, titulaire_id: userId })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Met à jour les informations d'un élève existant (ex: changement de niveau ou de mail parent).
     */
    async update(id: string, student: TablesUpdate<'Eleve'>, userId: string): Promise<Tables<'Eleve'>> {
        const { data, error } = await supabase
            .from('Eleve')
            .update(student)
            .eq('id', id)
            .eq('titulaire_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Supprime définitivement l'élève de la base de données.
     */
    async delete(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Eleve')
            .delete()
            .eq('id', id)
            .eq('titulaire_id', userId);

        if (error) throw error;
    }

    /**
     * Liste tous les groupes auxquels un élève appartient en interrogeant la table de liaison.
     */
    async getLinkedGroupIds(studentId: string, userId: string): Promise<string[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('groupe_id')
            .eq('eleve_id', studentId)
            .eq('user_id', userId);

        if (error) throw error;
        return data ? data.map(g => g.groupe_id as string) : [];
    }

    /**
     * Récupère le détail des liens entre un élève et ses groupes (utile pour les suppressions ciblées).
     */
    async getStudentGroupLinks(studentId: string, userId: string): Promise<{ id: string, groupe_id: string }[]> {
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('id, groupe_id')
            .eq('eleve_id', studentId)
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Crée un nouveau lien technique entre un élève et un groupe de soutien/classe.
     */
    async linkToGroup(studentId: string, groupId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('EleveGroupe').insert({
            eleve_id: studentId,
            groupe_id: groupId,
            user_id: userId
        });
        if (error) throw error;
    }

    /**
     * Supprime un lien spécifique entre un élève et un groupe.
     */
    async unlinkFromGroup(linkId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('EleveGroupe')
            .delete()
            .eq('id', linkId)
            .eq('user_id', userId);
        if (error) throw error;
    }

    /**
     * Supprime plusieurs liens d'un coup (nettoyage massif).
     */
    async unlinkMultiFromGroup(linkIds: string[], userId: string): Promise<void> {
        if (linkIds.length === 0) return;
        const { error } = await supabase
            .from('EleveGroupe')
            .delete()
            .in('id', linkIds)
            .eq('user_id', userId);
        if (error) throw error;
    }

    /**
     * Filtre la liste des élèves pour ne garder que ceux d'une classe précise.
     */
    async findByClass(classId: string, userId: string): Promise<Tables<'Eleve'>[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('classe_id', classId)
            .eq('titulaire_id', userId)
            .order('nom');

        if (error) throw error;
        return data as Tables<'Eleve'>[] || [];
    }

    /**
     * Récupère tous les élèves d'un groupe en incluant leur niveau scolaire.
     */
    async findByGroup(groupId: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                Niveau (nom, ordre),
                EleveGroupe!inner(groupe_id)
            `)
            .eq('EleveGroupe.groupe_id', groupId)
            .eq('titulaire_id', userId)
            .order('prenom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Récupère tous les élèves rattachés à une liste de groupes.
     */
    async findByGroups(groupIds: string[], userId: string): Promise<any[]> {
        if (groupIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *, EleveGroupe!inner(groupe_id)
            `)
            .in('EleveGroupe.groupe_id', groupIds)
            .eq('titulaire_id', userId);

        if (error) throw error;
        return data || [];
    }

    /**
     * REQUÊTE RICHE : Récupère d'un seul coup tout ce qui concerne les élèves d'un professeur.
     * Cette requête fait des "jointures" pour ramener les infos de classe, les professeurs secondaires 
     * et les noms des groupes de soutien en un seul aller-retour réseau.
     */
    async findAllForTeacher(teacherId: string): Promise<any[]> {
        if (!this.validateUserId(teacherId)) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                Classe (
                    nom,
                    ClasseAdulte (
                        role,
                        Adulte (id, nom, prenom)
                    )
                ),
                Niveau (nom, ordre),
                EleveGroupe (
                    Groupe (id, nom)
                )
            `)
            .eq('titulaire_id', teacherId)
            .order('nom', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Met à jour uniquement l'indicateur d'importance (couleur d'alerte) d'un élève.
     */
    async updateImportance(id: string, importance: number | null, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Eleve')
            .update({ importance_suivi: importance })
            .eq('id', id)
            .eq('titulaire_id', userId);

        if (error) throw error;
    }

    /**
     * SYNCHRONISATION OPTIMISÉE : Demande à Supabase uniquement les fiches élèves 
     * qui ont été modifiées depuis la dernière fois.
     */
    async getStudentsDelta(teacherId: string): Promise<{ delta: any[], isFirstSync: boolean }> {
        const { delta, isFirstSync } = await fetchDelta(
            'Eleve',
            'id, nom, prenom, photo_url, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, trust_trend, parent1_nom, parent1_prenom, parent1_email, parent2_nom, parent2_prenom, parent2_email, nom_parents, access_token, Niveau(nom, ordre), Classe(nom)',
            { titulaire_id: teacherId }
        );
        return { delta, isFirstSync };
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le Service `StudentService` ordonne : "Récupère-moi tous les élèves du Professeur Martin".
 * 2. Le Repository prépare la requête technique (Jointures SQL complètes).
 * 3. Il contacte le serveur Supabase distant.
 * 4. Il attend la réponse. 
 *    - Si le serveur met trop de temps ou renvoie une erreur (ex: jeton expiré), il lance une exception `throw error`.
 * 5. Une fois les données reçues, il les transforme en une liste d'objets propres.
 * 6. Il renvoie cette liste au service, qui la transmettra finalement aux composants visuels.
 */
