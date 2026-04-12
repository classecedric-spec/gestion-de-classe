/**
 * Nom du module/fichier : SupabaseActivityTypeRepository.ts
 * 
 * Données en entrée : 
 *   - Requêtes de la couche service (Libellés, IDs, UserID).
 * 
 * Données en sortie : 
 *   - Objets de type ActivityType provenant de la base de données.
 *   - Promesses (sauvegarde effectuée ou erreur).
 * 
 * Objectif principal : Cette classe est l'implémentation concrète (avec la technologie Supabase) du contrat définit dans "IActivityTypeRepository". Elle s'occupe de traduire les demandes de l'application en requêtes SQL compréhensibles par la base de données Postgres, spécifiquement pour la table des types d'activités des adultes.
 */

import { supabase } from '../../../lib/database';
import { IActivityTypeRepository, ActivityType } from './IActivityTypeRepository';

/**
 * Implémentation du dépôt pour les types d'activités via Supabase.
 */
export class SupabaseActivityTypeRepository implements IActivityTypeRepository {

    /**
     * Lit tous les types d'activités enregistrés.
     */
    async getAll(userId: string): Promise<ActivityType[]> {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .select('*')
            .eq('user_id', userId)
            .order('created_at');

        if (error) throw error;
        return (data as any) || [];
    }

    /**
     * Ajoute un nouveau libellé d'activité (ex: "Cantine").
     */
    async create(label: string, userId: string): Promise<ActivityType> {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .insert([{ label, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data as any;
    }

    /**
     * Ajoute plusieurs types d'activités d'un coup (utilisé lors du premier démarrage ou import).
     */
    async bulkCreate(labels: string[], userId: string): Promise<ActivityType[]> {
        const toInsert = labels.map(label => ({ label, user_id: userId }));

        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .insert(toInsert)
            .select();

        if (error) throw error;
        return data as any;
    }

    /**
     * Modifie le nom d'un type d'activité existant par son ID.
     */
    async update(id: string, label: string): Promise<ActivityType> {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .update({ label })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as any;
    }

    /**
     * Supprime un type d'activité définitivement dans la base.
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CONNEXION : La classe se connecte à la table "TypeActiviteAdulte" via le client Supabase.
 * 2. TRANSACTION : Pour chaque méthode (create, update, delete), une commande est envoyée au serveur.
 * 3. RETOUR : Si la base répond avec un succès, les données sont renvoyées au format TypeScript correct vers le Service.
 * 4. ERREUR : Si la base de données rencontre un problème (ex : doublon), une erreur est "lancée" (throw) pour être traitée plus haut.
 */
