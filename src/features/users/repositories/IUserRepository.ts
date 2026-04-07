/**
 * Nom du module/fichier : IUserRepository.ts
 * 
 * Données en entrée : N/A (Interface technique).
 * 
 * Données en sortie : N/A (Contrat d'accès aux données utilisateur).
 * 
 * Objectif principal : Définir les missions obligatoires pour gérer les données des enseignants. Cette interface garantit que, quel que soit le système de stockage utilisé (Supabase, fichier local, autre), l'application pourra toujours demander le profil ou sauvegarder une préférence de la même manière.
 * 
 * Ce que ça définit : 
 *   - L'accès au profil.
 *   - La mise à jour des infos personnelles.
 *   - La gestion des préférences et du dernier groupe consulté.
 */

import { Tables, TablesUpdate } from '../../../types/supabase';

export interface IUserRepository {
    /**
     * Mission : Charger les informations de compte de l'utilisateur.
     */
    getProfile(userId: string): Promise<Tables<'CompteUtilisateur'> | null>;

    /**
     * Mission : Mettre à jour les détails du profil.
     */
    updateProfile(userId: string, data: Partial<TablesUpdate<'CompteUtilisateur'>>): Promise<void>;

    /**
     * Mission : Enregistrer l'identifiant du dernier groupe de travail utilisé.
     */
    updateLastSelectedGroup(userId: string, groupId: string): Promise<void>;

    /**
     * Mission : Récupérer un réglage spécifique (ex: 'theme').
     */
    getUserPreferences(userId: string, key: string): Promise<any>;

    /**
     * Mission : Sauvegarder un nouveau réglage.
     */
    saveUserPreferences(userId: string, key: string, value: any): Promise<void>;
}

/**
 * LOGIGRAMME DE RÉFÉRENCE :
 * 
 * 1. DÉFINITION -> L'interface impose d'avoir une fonction `getProfile`.
 * 2. UTILISATION -> Le `userService` appelle cette fonction.
 * 3. SOUPLESSE -> On peut changer la manière dont on stocke les profils sans jamais casser le reste de l'application.
 */
