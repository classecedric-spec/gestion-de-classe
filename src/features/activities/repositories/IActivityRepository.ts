/**
 * Nom du module/fichier : IActivityRepository.ts
 * 
 * Données en entrée : Définitions des types de données pour les activités, le matériel et les niveaux.
 * 
 * Données en sortie : Un contrat (interface) listant toutes les fonctions obligatoires pour gérer les activités en base de données.
 * 
 * Objectif principal : Définir une structure stricte que tout système de stockage (Supabase ou autre) devra respecter. Cela permet de s'assurer que le service `activityService` peut fonctionner avec n'importe quel dépôt de données tant qu'il suit ces règles.
 * 
 * Ce que ça affiche : Rien. C'est un fichier de structure (contrat).
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

/**
 * Définition d'une activité 'complète' avec son module parent et ses réglages par niveau scolaire.
 * On utilise 'Pick' pour ne prendre que les colonnes nécessaires et optimiser les performances.
 */
export type ActivityWithRelations = Tables<'Activite'> & {
    Module: Pick<Tables<'Module'>, 'nom' | 'statut'> | null;
    ActiviteNiveau: (Tables<'ActiviteNiveau'> & {
        Niveau: Pick<Tables<'Niveau'>, 'nom' | 'ordre'> | null
    })[];
};

/**
 * Structure de données pour la saisie des exigences par niveau (ex: MS, GS).
 */
export interface ActivityLevelInput {
    niveau_id: string;
    nombre_exercices: number | string;
    nombre_erreurs: number | string;
    statut_exigence: string;
}

/**
 * Le contrat (Interface) : liste toutes les actions possibles sur les activités.
 * Toute base de données utilisée devra obligatoirement implémenter ces fonctions.
 */
export interface IActivityRepository {
    // Gestion des modules et matériels
    getModule(id: string, userId: string): Promise<{ nom: string } | null>;
    getMaterialTypes(): Promise<Tables<'TypeMateriel'>[]>;
    getActivityMaterials(activityId: string, userId: string): Promise<{ type_materiel_id: string }[]>;
    createMaterialType(name: string, userId: string): Promise<Tables<'TypeMateriel'>>;
    updateMaterialType(id: string, name: string, userId: string): Promise<void>;
    deleteMaterialType(id: string, userId: string): Promise<void>;

    // Gestion des niveaux scolaires
    getLevels(): Promise<Tables<'Niveau'>[]>;
    getActivityLevels(activityId: string, userId: string): Promise<any[]>;

    // Actions de base sur les activités (C.R.U.D)
    createActivity(data: TablesInsert<'Activite'>, userId: string): Promise<Tables<'Activite'>>;
    createActivities(data: TablesInsert<'Activite'>[], userId: string): Promise<Tables<'Activite'>[]>;
    getActivityCount(moduleId: string, userId: string): Promise<number>;
    getMaxActivityOrder(moduleId: string, userId: string): Promise<number>;
    updateActivity(id: string, data: TablesUpdate<'Activite'>, userId: string): Promise<void>;
    upsertActivities(data: TablesInsert<'Activite'>[], userId: string): Promise<void>;
    deleteActivity(id: string, userId: string): Promise<void>;
    getActivities(userId: string): Promise<ActivityWithRelations[]>;

    // Gestion des relations (liens entre tables)
    clearActivityMaterials(activityId: string, userId: string): Promise<void>;
    addActivityMaterials(links: TablesInsert<'ActiviteMateriel'>[]): Promise<void>;

    clearActivityLevels(activityId: string, userId: string): Promise<void>;
    addActivityLevels(links: TablesInsert<'ActiviteNiveau'>[]): Promise<void>;

    // Mises à jour ciblées
    updateActivityField(id: string, field: string, value: any): Promise<void>;
    updateActivityLevelField(id: string, field: string, value: any): Promise<void>;

    // Activités personnalisées (Custom)
    getCustomActivities(userId: string): Promise<Tables<'custom_activities'>[]>;
    createCustomActivity(title: string, userId: string): Promise<Tables<'custom_activities'>>;
    deleteCustomActivity(id: string, userId: string): Promise<void>;
}

/**
 * LOGIGRAMME DE STRUCTURE :
 * 1. Le développeur définit les types de données complexes (ActivityWithRelations).
 * 2. Il liste toutes les fonctions nécessaires au métier (getActivities, createActivity, etc.).
 * 3. Ce fichier sert de 'guide' pour créer le fichier `SupabaseActivityRepository.ts`.
 * 4. Si demain on change de base de données, il suffira de recréer un fichier suivant cette interface.
 */
