/**
 * Nom du module/fichier : responsabiliteService.ts
 * 
 * Données en entrée : 
 *   - `userId` : L'identifiant de l'enseignant.
 *   - `titre` : Le nom de la responsabilité (ex: 'Chef de rang').
 *   - `eleveId` ou `eleveIds` : Les identifiants des enfants désignés.
 * 
 * Données en sortie : 
 *   - Liste des responsabilités avec les élèves assignés.
 *   - Confirmation des actions de création ou de suppression.
 * 
 * Objectif principal : Gérer le "Tableau des Responsabilités" (ou "Meteo des métiers") de la classe. Ce service permet de définir quels sont les petits rôles d'entraide dans la classe et d'y attacher un ou plusieurs élèves. Il communique avec Supabase pour garder trace de qui fait quoi.
 * 
 * Ce que ça orchestre : 
 *   - La récupération de la liste complète des rôles.
 *   - L'ajout d'un nouveau rôle.
 *   - L'assignation (individuelle ou groupée) d'élèves à un rôle précis.
 *   - Le retrait d'un élève d'une mission.
 */

import { supabase } from '../../../lib/database';

// Structure de base d'une responsabilité
export interface Responsabilite {
    id: string;
    titre: string;
    user_id: string;
    created_at: string;
}

// Structure d'un lien entre un élève et sa tâche
export interface ResponsabiliteEleve {
    id: string;
    responsabilite_id: string;
    eleve_id: string;
    user_id: string;
    created_at: string;
}

// Vue complète (Le rôle + les élèves qui l'occupent)
export interface ResponsabiliteWithEleves extends Responsabilite {
    eleves: {
        id: string;
        eleve_id: string;
        eleve: {
            id: string;
            nom: string;
            prenom: string;
            photo_url: string | null;
        }
    }[];
}

/**
 * SERVICE DE GESTION DES RESPONSABILITÉS
 */
export const responsabiliteService = {
    /**
     * LECTURE : Récupère tous les métiers de la classe et les enfants qui les font.
     */
    async getResponsibilities(userId: string): Promise<ResponsabiliteWithEleves[]> {
        const { data, error } = await supabase
            .from('Responsabilite')
            .select(`
                *,
                eleves:ResponsabiliteEleve(
                    id,
                    eleve_id,
                    eleve:Eleve(id, nom, prenom, photo_url)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * CRÉATION : Ajoute un nouveau métier (ex: 'Responsable Lumières').
     */
    async createResponsibility(userId: string, titre: string): Promise<Responsabilite> {
        const { data, error } = await supabase
            .from('Responsabilite')
            .insert({ titre, user_id: userId })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * SUPPRESSION : Efface un métier du tableau.
     */
    async deleteResponsibility(id: string): Promise<void> {
        const { error } = await supabase
            .from('Responsabilite')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * ASSIGNATION SIMPLE : Donne une mission à un élève.
     */
    async assignStudent(userId: string, responsabiliteId: string, eleveId: string): Promise<void> {
        const { error } = await supabase
            .from('ResponsabiliteEleve')
            .insert({
                responsabilite_id: responsabiliteId,
                eleve_id: eleveId,
                user_id: userId
            });

        if (error) throw error;
    },

    /**
     * ASSIGNATION GROUPÉE : Permet de désigner plusieurs élèves d'un coup pour une tâche.
     */
    async assignStudents(userId: string, responsabiliteId: string, eleveIds: string[]): Promise<void> {
        if (!eleveIds.length) return;

        const inserts = eleveIds.map(eleveId => ({
            responsabilite_id: responsabiliteId,
            eleve_id: eleveId,
            user_id: userId
        }));

        const { error } = await supabase
            .from('ResponsabiliteEleve')
            .insert(inserts);

        if (error) throw error;
    },

    /**
     * RETRAIT : Libère un élève de sa mission.
     */
    async unassignStudent(assignmentId: string): Promise<void> {
        const { error } = await supabase
            .from('ResponsabiliteEleve')
            .delete()
            .eq('id', assignmentId);

        if (error) throw error;
    },

    /**
     * MISE À JOUR : Modifie le titre d'un métier.
     */
    async updateResponsibility(id: string, titre: string): Promise<void> {
        const { error } = await supabase
            .from('Responsabilite')
            .update({ titre })
            .eq('id', id);

        if (error) throw error;
    }
};

/**
 * LOGIGRAMME DE GESTION :
 * 
 * 1. CHARGEMENT -> Le service demande à Supabase la liste des métiers.
 * 2. ÉDITION -> L'enseignant décide de créer "Responsable Plantes".
 * 3. ÉTAPE SQL : Le service insère la ligne dans la table `Responsabilite`.
 * 4. ASSIGNATION -> L'enseignant choisit "Alice" et "Bob".
 * 5. ÉTAPE SQL : Le service crée deux liens dans la table `ResponsabiliteEleve`.
 * 6. AFFICHAGE -> L'interface se met à jour pour montrer Alice et Bob à côté de "Responsable Plantes".
 */
