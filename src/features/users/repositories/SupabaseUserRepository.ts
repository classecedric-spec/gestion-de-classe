/**
 * Nom du module/fichier : SupabaseUserRepository.ts
 * 
 * Données en entrée : 
 *   - Identifiant utilisateur.
 *   - Objets de mise à jour (Partial<TablesUpdate>).
 *   - Clés/Valeurs de préférences.
 * 
 * Données en sortie : 
 *   - Données de profil lues depuis Supabase.
 *   - Confirmations de succès pour les écritures.
 * 
 * Objectif principal : Réaliser les opérations concrètes de lecture et d'écriture des données utilisateur sur la plateforme Supabase. Ce fichier traduit les besoins métier (ex: "sauvegarder une préférence") en requêtes SQL compréhensibles par la base de données (ex: `upsert`).
 * 
 * Ce que ça fait : 
 *   - `getProfile` : Récupère les champs essentiels du compte (nom, validation, école...).
 *   - `updateProfile` : Met à jour les informations du compte.
 *   - `updateLastSelectedGroup` : Enregistre spécifiquement le dernier groupe utilisé.
 *   - `getUserPreferences` / `saveUserPreferences` : Gère la table clé-valeur des réglages personnels.
 */

import { IUserRepository } from './IUserRepository';
import { supabase } from '../../../lib/database';
import { Tables, TablesUpdate } from '../../../types/supabase';

export class SupabaseUserRepository implements IUserRepository {

    /**
     * LECTURE PROFIL : Cherche les infos de base de l'enseignant.
     */
    async getProfile(userId: string): Promise<Tables<'CompteUtilisateur'> | null> {
        const { data, error } = await supabase
            .from('CompteUtilisateur')
            .select('prenom, nom, validation_admin, last_selected_group_id, nom_ecole, photo_url, photo_base64')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    /**
     * MISE À JOUR : Modifie les champs du profil spécifiés.
     */
    async updateProfile(userId: string, data: Partial<TablesUpdate<'CompteUtilisateur'>>): Promise<void> {
        const { error } = await supabase
            .from('CompteUtilisateur')
            .update(data)
            .eq('id', userId);

        if (error) throw error;
    }

    /**
     * MÉMOIRE GROUPE : Met à jour l'ID du groupe "favori" (le dernier ouvert).
     */
    async updateLastSelectedGroup(userId: string, groupId: string): Promise<void> {
        const { error } = await supabase
            .from('CompteUtilisateur')
            .update({ last_selected_group_id: groupId })
            .eq('id', userId);

        if (error) throw error;
    }

    /**
     * LECTURE RÉGLAGE : Cherche une valeur dans la table des préférences.
     */
    async getUserPreferences(userId: string, key: string): Promise<any> {
        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', userId)
            .eq('key', key)
            .maybeSingle();
        return data?.value || null;
    }

    /**
     * ÉCRITURE RÉGLAGE : Crée ou met à jour un réglage (upsert) pour éviter les doublons.
     */
    async saveUserPreferences(userId: string, key: string, value: any): Promise<void> {
        const { error } = await supabase.from('UserPreference').upsert({
            user_id: userId,
            key: key,
            value: value,
            updated_at: new Date().toISOString()
        } as any, { onConflict: 'user_id, key' });

        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE RÉCUPÉRATION :
 * 
 * 1. REQUÊTE -> L'app demande le profil de l'utilisateur "X".
 * 2. FILTRAGE -> Le dépôt fait un `.eq('id', userId)` pour ne pas lire le profil du voisin.
 * 3. SÉCURITÉ -> Supabase vérifie les droits (RLS) et renvoie les données.
 * 4. RETOUR -> Le dépôt renvoie l'objet ou `null` si l'utilisateur n'existe pas encore dans la table.
 */
