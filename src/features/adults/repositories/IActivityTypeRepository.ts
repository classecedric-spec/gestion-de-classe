/**
 * Nom du module/fichier : IActivityTypeRepository.ts
 * 
 * Données en entrée : Définition des méthodes de gestion des types d'activité.
 * 
 * Données en sortie : Une interface TypeScript imposant un contrat de service.
 * 
 * Objectif principal : Ce fichier définit le "plan de construction" (l'interface) pour tout dépôt de données gérant les types d'activités des adultes (ex: Repas, Animation, Aide...). Il garantit qu'importe le support de stockage (Supabase, Mémoire, etc.), les fonctions de base (Lister, Créer, Modifier, Supprimer) seront toujours présentes et nommées de la même manière.
 */

import { ActivityType } from '../types/adult.types';

/**
 * Contrat de service pour la gestion des types d'activités.
 */
export interface IActivityTypeRepository {
    /**
     * Récupère la liste complète des types d'activités, triés par date de création.
     */
    getAll(userId: string): Promise<ActivityType[]>;

    /**
     * Enregistre un nouveau type d'activité.
     */
    create(label: string, userId: string): Promise<ActivityType>;

    /**
     * Permet la création de plusieurs types d'activités en une seule opération (gain de temps).
     */
    bulkCreate(labels: string[], userId: string): Promise<ActivityType[]>;

    /**
     * Met à jour le nom d'un type d'activité existant.
     */
    update(id: string, label: string): Promise<ActivityType>;

    /**
     * Supprime définitivement un type d'activité de la base de données.
     */
    delete(id: string): Promise<void>;
}

// Ré-exportation du type pour faciliter l'usage dans les couches supérieures.
export type { ActivityType };

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ARCHITECTURE : Ce fichier ne contient pas de code "vivant", seulement des règles de nommage.
 * 2. STANDARDISATION : Il impose aux développeurs de respecter un format unique pour manipuler les types d'activités.
 * 3. ÉVOLUTION : Si demain on change de base de données, on devra créer un nouveau fichier qui "implémente" ce contrat.
 */
