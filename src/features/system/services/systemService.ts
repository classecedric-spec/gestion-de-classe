/**
 * Nom du module/fichier : systemService.ts
 * 
 * Données en entrée : 
 *   - `userId` : Identifiant de l'enseignant.
 * 
 * Données en sortie : 
 *   - Success/Failure des opérations de maintenance.
 *   - Nombre d'erreurs réparées.
 * 
 * Objectif principal : Agir comme le "Service de Maintenance" de l'application. Ce service s'occupe des tâches lourdes qui touchent à la structure même des données : réparer les progressions des élèves, générer un environnement de démonstration pour les nouveaux utilisateurs, ou faire une remise à zéro complète (Hard Reset).
 * 
 * Ce que ça pilote : 
 *   - L'outil de réparation des données (Fix Progressions).
 *   - Le bouton "Générer des données de démo".
 *   - Le bouton de "Remise à zéro" (Danger).
 */

import { ISystemRepository } from '../repositories/ISystemRepository';
import { SupabaseSystemRepository } from '../repositories/SupabaseSystemRepository';

/**
 * Service de maintenance système.
 */
export class SystemService {
    constructor(private repository: ISystemRepository) { }

    /**
     * RÉPARATION : Scanne la base de données pour trouver des élèves à qui il manquerait des indicateurs de progression et les crée.
     */
    async checkAndFixProgressions(): Promise<number> {
        return await this.repository.checkAndFixProgressions();
    }

    /**
     * DÉMONSTRATION : Remplit le compte de l'enseignant avec des élèves et des activités fictives pour tester l'application.
     */
    async generateDemoData(userId: string): Promise<void> {
        return await this.repository.generateDemoData(userId);
    }

    /**
     * NETTOYAGE RADICAL : Supprime absolument TOUTES les données de l'utilisateur (Classes, élèves, photos...).
     * ATTENTION : Action irréversible.
     */
    async hardReset(userId: string): Promise<void> {
        return await this.repository.hardReset(userId);
    }
}

// Singleton pour l'application
export const systemService = new SystemService(new SupabaseSystemRepository());

/**
 * LOGIGRAMME DE MAINTENANCE :
 * 
 * 1. DÉCLENCHEMENT -> L'enseignant clique sur "Réparer les données" dans les paramètres.
 * 2. ANALYSE -> Le service demande au dépôt de vérifier chaque élève.
 * 3. CORRECTION -> Si un élève n'a pas son tableau de suivi, le service le génère.
 * 4. BILAN -> L'application affiche le nombre de corrections effectuées (ex: "12 progressions réparées").
 */
