/**
 * Nom du module/fichier : SupabaseMaterialRepository.ts
 * 
 * Données en entrée : 
 *   - Requêtes SQL / Supabase vers la table `TypeMateriel`.
 *   - Identifiants et objets de données matérielles.
 * 
 * Données en sortie : 
 *   - Résultats bruts de la base de données.
 *   - Erreurs éventuelles de connexion ou de contraintes.
 * 
 * Objectif principal : Réaliser concrètement les opérations de stockage sur Supabase. C'est le "bras armé" qui exécute les ordres (ajouter, lister, supprimer) en parlant le langage technique de la base de données.
 * 
 * Ce que ça fait : 
 *   - `getAll` : Demande à Supabase de donner tout le matériel rangé par nom.
 *   - `getLinkedActivities` : Fait une recherche croisée complexe pour savoir quelles leçons utilisent un matériel donné.
 *   - `create`/`update`/`delete` : Modifie physiquement les lignes dans le tableau `TypeMateriel`.
 */

import { supabase } from '../../../lib/database';
import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IMaterialRepository, TypeMateriel, MaterialActivity } from './IMaterialRepository';

/**
 * Implémentation réelle du dépôt de matériel utilisant la technologie Supabase.
 */
export class SupabaseMaterialRepository implements IMaterialRepository {

    /**
     * Récupère tout le matériel de l'école.
     */
    async getAll(): Promise<TypeMateriel[]> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Trouve les leçons liées à un matériel (ex: 'Compas' -> lié à 'Géométrie').
     */
    async getLinkedActivities(materialId: string): Promise<MaterialActivity[]> {
        const { data, error } = await supabase
            .from('ActiviteMateriel')
            .select(`
        activite_id,
        Activite:activite_id (
          id,
          titre,
          Module:module_id (nom),
          ActiviteMateriel (
            TypeMateriel (
              id,
              nom,
              acronyme
            )
          )
        )
      `)
            .eq('type_materiel_id', materialId);

        if (error) throw error;

        // On nettoie les données pour ne renvoyer que les activités valides
        const activities = (data as any[])?.map(item => item.Activite).filter(Boolean) || [];

        return activities;
    }

    /**
     * Crée une nouvelle fiche matériel.
     */
    async create(materialData: TablesInsert<'TypeMateriel'>): Promise<TypeMateriel> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .insert([materialData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Met à jour un matériel (ex: corriger une faute d'orthographe ou changer l'acronyme).
     */
    async update(id: string, materialData: TablesUpdate<'TypeMateriel'>): Promise<TypeMateriel> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .update(materialData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Supprime un matériel de la bibliothèque.
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE FLUX :
 * 
 * 1. APPEL -> Le service demande : "Donne-moi tout le matériel".
 * 2. REQUÊTE -> Le Repository envoie une commande `SELECT *` à Supabase.
 * 3. RÉCEPTION -> Supabase renvoie les données ou une erreur (ex: problème réseau).
 * 4. RÉPONSE -> Le Repository traduit cette réponse en un format propre (TypeMateriel) pour l'application.
 */
