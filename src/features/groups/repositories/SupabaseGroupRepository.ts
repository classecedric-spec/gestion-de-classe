/**
 * Nom du module/fichier : SupabaseGroupRepository.ts
 * 
 * Données en entrée : 
 *   - Identifiants uniques de groupes (ID).
 *   - Informations détaillées sur les groupes (nom, acronyme, couleur, position).
 *   - Identifiants de l'utilisateur (userId) pour sécuriser l'accès aux données.
 * 
 * Données en sortie : 
 *   - Données brutes de groupes extraites de la base de données.
 *   - Confirmations de réussite ou messages d'erreurs techniques en cas d'échec de connexion.
 * 
 * Objectif principal : Servir de "Traducteur" entre le langage de l'application et le langage technique de la base de données (Supabase). Ce fichier contient les véritables requêtes informatiques (SQL) qui vont lire, écrire, modifier ou supprimer les groupes dans le Cloud. Il met en œuvre les actions listées dans le contrat `IGroupRepository`.
 * 
 * Ce que ça affiche : Rien (couche d'accès physique aux données).
 */

import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGroupRepository } from './IGroupRepository';

/**
 * MOTEUR DE STOCKAGE SUPABASE :
 * Cette classe s'occupe de la communication réelle avec les serveurs distants pour la gestion des groupes.
 */
export class SupabaseGroupRepository implements IGroupRepository {

    /**
     * LECTURE INTÉGRALE : 
     * Récupère tous les groupes en respectant l'ordre de tri personnalisé de l'enseignant.
     */
    async getGroups(): Promise<Tables<'Groupe'>[]> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            // Tri prioritaire par position, puis par nom pour les groupes non classés.
            .order('ordre', { ascending: true })
            .order('nom', { ascending: true });
            
        if (error) throw error;
        return data || [];
    }

    /**
     * ISOLEMENT UTILISATEUR : 
     * S'assure de ne récupérer que les groupes appartenant au professeur identifié.
     */
    async getUserGroups(userId: string): Promise<Tables<'Groupe'>[]> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .eq('user_id', userId)
            .order('ordre', { ascending: true })
            .order('nom', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * RECHERCHE UNITAIRE : 
     * Extrait la fiche d'un seul groupe précis par son code ID.
     */
    async getGroup(id: string): Promise<Tables<'Groupe'> | null> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .eq('id', id)
            .maybeSingle(); // Retourne null proprement si le groupe a été supprimé.

        if (error) throw error;
        return data;
    }

    /**
     * ÉCRITURE (CRÉATION) : 
     * Envoie la commande d'insertion d'un nouveau groupe vers les serveurs Supabase.
     */
    async createGroup(group: TablesInsert<'Groupe'>): Promise<Tables<'Groupe'>> {
        const { data, error } = await supabase
            .from('Groupe')
            .insert(group)
            .select()
            .single(); // On récupère la fiche créée contenant l'ID généré par la base.

        if (error) throw error;
        return data;
    }

    /**
     * MODIFICATION : 
     * Envoie les changements (ex: changement de nom ou de couleur) pour un groupe existant.
     */
    async updateGroup(id: string, updates: TablesUpdate<'Groupe'>): Promise<Tables<'Groupe'>> {
        const { data, error } = await supabase
            .from('Groupe')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * SUPPRESSION DÉFINITIVE : 
     * Demande à la base de données d'effacer la ligne du groupe concerné.
     */
    async deleteGroup(id: string): Promise<void> {
        const { error } = await supabase
            .from('Groupe')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * MÉMOIRE DE TRI (DRAG & DROP) : 
     * Met à jour uniquement la position (le rang) d'un groupe dans une liste ordonnée.
     */
    async updateOrder(id: string, order: number): Promise<void> {
        const { error } = await supabase
            .from('Groupe')
            .update({ ordre: order } as any)
            .eq('id', id);

        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le `groupService` (le chef) donne un ordre : "Enregistre ce nouveau groupe : Soutien Lecture".
 * 2. Le `SupabaseGroupRepository` (l'exécutant) reçoit l'ordre.
 * 3. Il prépare une requête informatique précise : "INSÉRER DANS la table 'Groupe' les données suivantes : {nom: 'Soutien Lecture'}".
 * 4. Il envoie cette requête à travers internet jusqu'aux serveurs sécurisés de Supabase.
 * 5. La base de données Supabase traite la demande :
 *    - Si tout est bon : elle enregistre le groupe et renvoie une fiche complète avec l'ID officiel.
 *    - Si un problème survient (ex: coupure internet) : elle renvoie une erreur.
 * 6. Le `SupabaseGroupRepository` intercepte la réponse :
 *    - En cas de succès : il transmet la fiche groupe au reste du logiciel.
 *    - En cas d'erreur : il déclenche une alerte technique pour prévenir l'enseignant.
 */
