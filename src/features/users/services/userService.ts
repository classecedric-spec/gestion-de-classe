/**
 * Nom du module/fichier : userService.ts
 * 
 * Données en entrée : 
 *   - Identifiant de l'utilisateur (userId).
 *   - Clés de préférences (ex: 'theme', 'last_group').
 *   - Données de profil (Nom, Prénom).
 * 
 * Données en sortie : 
 *   - Profil complet de l'enseignant.
 *   - Valeurs des préférences sauvegardées.
 * 
 * Objectif principal : Gérer la "Fiche d'Identité" et les "Goûts" de l'enseignant. Ce service permet de récupérer son nom pour l'afficher, de changer son mot de passe ou de retenir ses réglages personnels (comme le dernier groupe d'élèves qu'il a consulté) pour que l'app se souvienne de lui à chaque connexion.
 * 
 * Ce que ça pilote : 
 *   - L'affichage du profil dans les paramètres.
 *   - La mémorisation du contexte de travail (dernier groupe sélectionné).
 *   - Le stockage des préférences (Thème visuel, options d'affichage).
 */

import { IUserRepository } from '../repositories/IUserRepository';
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository';
import { Tables, TablesUpdate } from '../../../types/supabase';

/**
 * Service de gestion des comptes et préférences utilisateurs.
 */
export class UserService {
    constructor(private repository: IUserRepository) { }

    /**
     * PROFIL : Récupère les informations publiques de l'enseignant (Nom, Prénom...).
     */
    async getProfile(userId: string): Promise<Tables<'CompteUtilisateur'> | null> {
        return await this.repository.getProfile(userId);
    }

    /**
     * MISE À JOUR : Modifie les informations du compte.
     */
    async updateProfile(userId: string, data: Partial<TablesUpdate<'CompteUtilisateur'>>): Promise<void> {
        return await this.repository.updateProfile(userId, data);
    }

    /**
     * MÉMOIRE : Retient quel groupe d'élèves l'enseignant utilisait en dernier.
     */
    async updateLastSelectedGroup(userId: string, groupId: string): Promise<void> {
        return await this.repository.updateLastSelectedGroup(userId, groupId);
    }

    /**
     * LECTURE PRÉFÉRENCES : Récupère un réglage précis (ex: 'dark-mode').
     */
    async getUserPreferences(userId: string, key: string): Promise<any> {
        return await this.repository.getUserPreferences(userId, key);
    }

    /**
     * SAUVEGARDE PRÉFÉRENCES : Enregistre un réglage utilisateur.
     */
    async saveUserPreferences(userId: string, key: string, value: any): Promise<void> {
        return await this.repository.saveUserPreferences(userId, key, value);
    }
}

// Instance unique pour l'application
export const userService = new UserService(new SupabaseUserRepository());

/**
 * LOGIGRAMME DE PERSONNALISATION :
 * 
 * 1. ACTION -> L'enseignant change le thème de l'application en "Mode Sombre".
 * 2. APPEL -> Le composant appelle `userService.saveUserPreferences(id, 'theme', 'dark')`.
 * 3. STOCKAGE -> Le service demande au dépôt d'enregistrer cette info dans la table `UserPreference`.
 * 4. CONNEXION -> À la prochaine ouverture de l'app, le service relira cette valeur pour appliquer le bon thème dès le départ.
 */
