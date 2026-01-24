import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

// Define complex types for joined queries
export type ActivityWithRelations = Tables<'Activite'> & {
    Module: Pick<Tables<'Module'>, 'nom' | 'statut'> | null;
    ActiviteNiveau: (Tables<'ActiviteNiveau'> & {
        Niveau: Pick<Tables<'Niveau'>, 'nom' | 'ordre'> | null
    })[];
};

// Interface for Activity Levels input
export interface ActivityLevelInput {
    niveau_id: string;
    nombre_exercices: number | string;
    nombre_erreurs: number | string;
    statut_exigence: string;
}

export interface IActivityRepository {
    getModule(id: string): Promise<{ nom: string } | null>;
    getMaterialTypes(): Promise<Tables<'TypeMateriel'>[]>;
    getActivityMaterials(activityId: string): Promise<{ type_materiel_id: string }[]>;
    createMaterialType(name: string, userId: string): Promise<Tables<'TypeMateriel'>>;
    updateMaterialType(id: string, name: string): Promise<void>;
    deleteMaterialType(id: string): Promise<void>;

    // Note: This duplicates functionality from LevelRepository, but keeps ActivityService independent for now
    getLevels(): Promise<Tables<'Niveau'>[]>;
    getActivityLevels(activityId: string): Promise<any[]>;

    createActivity(data: TablesInsert<'Activite'>): Promise<Tables<'Activite'>>;
    createActivities(data: TablesInsert<'Activite'>[]): Promise<Tables<'Activite'>[]>;
    getActivityCount(moduleId: string): Promise<number>;
    getMaxActivityOrder(moduleId: string): Promise<number>;
    updateActivity(id: string, data: TablesUpdate<'Activite'>): Promise<void>;
    upsertActivities(data: TablesInsert<'Activite'>[]): Promise<void>;
    deleteActivity(id: string): Promise<void>;
    getActivities(): Promise<ActivityWithRelations[]>;

    // Relation management
    clearActivityMaterials(activityId: string): Promise<void>;
    addActivityMaterials(links: TablesInsert<'ActiviteMateriel'>[]): Promise<void>;

    clearActivityLevels(activityId: string): Promise<void>;
    addActivityLevels(links: TablesInsert<'ActiviteNiveau'>[]): Promise<void>;

    updateActivityField(id: string, field: string, value: any): Promise<void>;
    updateActivityLevelField(id: string, field: string, value: any): Promise<void>;

    // Custom Activities
    getCustomActivities(): Promise<Tables<'custom_activities'>[]>;
    createCustomActivity(title: string, userId: string): Promise<Tables<'custom_activities'>>;
    deleteCustomActivity(id: string): Promise<void>;
}
