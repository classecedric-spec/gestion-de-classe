/**
 * Nom du module/fichier : IModuleRepository.ts
 * 
 * Données en entrée : N/A (Interface technique).
 * 
 * Données en sortie : N/A (Définit les contrats de données pour les modules pédagogiques).
 * 
 * Objectif principal : Définir le "Contrat technique" pour la gestion des Modules (les grandes unités d'apprentissage). Cette interface liste toutes les capacités que doit posséder le système pour lire ou modifier un module, ses activités liées et ses branches parentes.
 * 
 * Ce que ça affiche : Rien (c'est une structure purement technique).
 */

import { ModuleWithRelations } from '../../../pages/Modules/utils/moduleHelpers';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

/**
 * INTERFACE DU RÉPERTOIRE DES MODULES :
 * Liste les missions que le système de stockage doit savoir accomplir 
 * pour gérer les parcours pédagogiques.
 */
export interface IModuleRepository {
    /**
     * LECTURE GLOBALE :
     * Récupérer tous les modules avec leurs relations complètes (Sous-branches, Activités, Matériel, etc.).
     */
    getAllModulesWithDetails(userId: string): Promise<ModuleWithRelations[]>;

    /**
     * SUPPRESSION :
     * Effacer un module via son identifiant.
     */
    deleteModule(moduleId: string, userId: string): Promise<void>;

    /**
     * ÉTAT :
     * Mettre à jour si le module est "Actif", "Terminé", etc.
     */
    updateModuleStatus(moduleId: string, newStatus: string, userId: string): Promise<void>;

    /**
     * FILTRAGE :
     * Récupérer uniquement les modules en cours d'utilisation.
     */
    getActiveModules(userId: string): Promise<any[]>;

    /**
     * RÉFÉRENTIELS :
     * Récupérer la liste des matières principales (Branches).
     */
    getBranches(userId: string): Promise<Tables<'Branche'>[]>;

    /**
     * LECTURE UNITAIRE :
     * Obtenir les détails complets d'un seul module précis.
     */
    getModuleWithDetails(moduleId: string, userId: string): Promise<any>;

    /**
     * ACTIONS DE CRÉATION ET MISE À JOUR
     */
    createModule(data: TablesInsert<'Module'>, userId: string): Promise<Tables<'Module'>>;
    updateModule(id: string, data: TablesUpdate<'Module'>, userId: string): Promise<void>;

    /**
     * SUIVI :
     * Identifier les activités qui sont en retard pour une classe donnée.
     */
    getDetailedLateActivities(classId: string, userId: string): Promise<any[]>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le programme souhaite manipuler un module d'apprentissage (ex: "Mesures et Longueurs").
 * 2. Il consulte ce fichier `IModuleRepository` pour savoir quelles actions sont permises.
 * 3. Ce fichier définit que pour gérer un module, le programme DOIT être capable de le créer, le supprimer, le lister avec ses activités, et suivre les retards.
 */
