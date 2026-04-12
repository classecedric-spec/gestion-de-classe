/**
 * Nom du module/fichier : SupabaseLevelRepository.ts
 * 
 * Données en entrée : 
 *   - Les requêtes SQL/NoSQL vers les tables 'Niveau' et 'Eleve'.
 *   - L'identifiant unique d'un niveau (ID).
 * 
 * Données en sortie : 
 *   - Des objets "Niveau" contenant les informations et le décompte des élèves rattachés.
 * 
 * Objectif principal : Exécuter physiquement les ordres de stockage pour les niveaux scolaires dans la base de données distante (Supabase). C'est ici que l'on traduit les besoins métier en langage de base de données.
 * 
 * Ce que ça affiche : Rien (c'est le cœur technique de la persistance des données).
 */

import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { LevelWithStudentCount } from '../../../types';
import { ILevelRepository } from './ILevelRepository';

/**
 * RÉPERTOIRE SUPABASE DES NIVEAUX :
 * Implémente le contrat `ILevelRepository` en utilisant les outils de Supabase.
 */
export class SupabaseLevelRepository implements ILevelRepository {
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseLevelRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }
    
    /**
     * LECTURE DES NIVEAUX :
     * Récupère la liste triée et demande à l'ordinateur de compter simultanément 
     * combien d'élèves sont inscrits dans chaque niveau.
     */
    async getLevels(userId: string): Promise<LevelWithStudentCount[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Niveau')
            .select('*, Eleve(count)')
            .eq('user_id', userId)
            .order('ordre', { ascending: true });

        if (error) throw error;
        return (data as unknown as LevelWithStudentCount[]) || [];
    }

    /**
     * LECTURE DES ÉLÈVES :
     * Filtre l'annuaire de l'école pour ne garder que les enfants d'un niveau précis.
     */
    async getStudentsByLevel(levelId: string, userId: string): Promise<Tables<'Eleve'>[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('niveau_id', levelId)
            .eq('titulaire_id', userId)
            .order('nom', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * CRÉATION :
     * Insère une nouvelle ligne dans la table 'Niveau'. 
     * Récupère immédiatement l'objet créé pour confirmer le succès.
     */
    async createLevel(level: TablesInsert<'Niveau'>, userId: string): Promise<LevelWithStudentCount> {
        if (!this.validateUserId(userId)) throw new Error("userId required");
        const { data, error } = await supabase
            .from('Niveau')
            .insert([{ ...level, user_id: userId }])
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data as unknown as LevelWithStudentCount;
    }

    /**
     * MISE À JOUR :
     * Modifie les champs d'un niveau existant identifié par son ID.
     */
    async updateLevel(id: string, updates: TablesUpdate<'Niveau'>, userId: string): Promise<LevelWithStudentCount> {
        const { data, error } = await supabase
            .from('Niveau')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data as unknown as LevelWithStudentCount;
    }

    /**
     * SUPPRESSION :
     * Efface définitivement le niveau du système.
     */
    async deleteLevel(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Niveau')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    }

    /**
     * RÉORGANISATION MASSIVE :
     * Utilise la fonction "Upsert" (Mettre à jour si existe, sinon créer) pour 
     * enregistrer le nouvel ordre de tous les niveaux d'un coup.
     */
    async updateOrders(updates: TablesUpdate<'Niveau'>[], userId: string): Promise<void> {
        // Pour garantir la sécurité, on s'assure que chaque mise à jour appartient à l'utilisateur
        const secureUpdates = updates.map(update => ({ ...update, user_id: userId }));
        
        const { error } = await supabase
            .from('Niveau')
            .upsert(secureUpdates as TablesInsert<'Niveau'>[], { onConflict: 'id' });
        if (error) throw error;
    }

    /**
     * CALCUL DU MAXIMUM :
     * Trouve la position la plus élevée (ex: 5) pour savoir que le prochain niveau 
     * devra porter le numéro 6.
     */
    async getMaxOrder(userId: string): Promise<number> {
        if (!this.validateUserId(userId)) return 0;
        const { data } = await supabase
            .from('Niveau')
            .select('ordre')
            .eq('user_id', userId)
            .order('ordre', { ascending: false })
            .limit(1);

        return (data && data.length > 0) ? (data[0].ordre || 0) : 0;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le service demande au dépôt (Repository) de créer un niveau "Maternelle".
 * 2. ÉTAPE SQL : Le dépôt prépare une commande d'insertion pour la table 'Niveau'.
 * 3. ÉTAPE SERVEUR : L'ordre est envoyé à Supabase via internet.
 * 4. ÉTAPE RETOUR : Le serveur renvoie les données complétées (avec la date de création et l'ID).
 * 5. FIN : Le dépôt renvoie cet objet propre au programme pour qu'il puisse l'afficher à l'écran.
 */
