import { ModuleWithRelations } from '../../../pages/Modules/utils/moduleHelpers';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export interface IModuleRepository {
    /**
     * Fetch all modules with their full hierarchy:
     * Module -> SousBranche -> Branche
     * Module -> Activite -> ActiviteNiveau, ActiviteMateriel, Progression
     */
    getAllModulesWithDetails(): Promise<ModuleWithRelations[]>;

    /**
     * Delete a module by ID
     */
    deleteModule(moduleId: string): Promise<void>;

    /**
     * Update the status of a module
     */
    updateModuleStatus(moduleId: string, newStatus: string): Promise<void>;

    /**
     * Get active modules (simplified)
     */
    getActiveModules(): Promise<any[]>;

    /**
     * Get all branches
     */
    getBranches(): Promise<Tables<'Branche'>[]>;
    getModuleWithDetails(moduleId: string): Promise<any>;
    createModule(data: TablesInsert<'Module'>): Promise<Tables<'Module'>>;
    updateModule(id: string, data: TablesUpdate<'Module'>): Promise<void>;
    getDetailedLateActivities(classId: string): Promise<any[]>;
}
