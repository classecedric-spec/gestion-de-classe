import { IModuleRepository } from '../repositories/IModuleRepository';
import { SupabaseModuleRepository } from '../repositories/SupabaseModuleRepository';
import { ModuleWithRelations } from '../../../pages/Modules/utils/moduleHelpers';
import { Tables } from '../../../types/supabase';

export class ModuleService {
    constructor(private repository: IModuleRepository) { }

    /**
     * Fetch all modules with associated data (Branches, Activities, Progress)
     */
    async getAllModules(): Promise<ModuleWithRelations[]> {
        return await this.repository.getAllModulesWithDetails();
    }

    /**
     * Delete a module
     */
    async deleteModule(moduleId: string): Promise<void> {
        await this.repository.deleteModule(moduleId);
    }

    /**
     * Toggle module status
     * Logic extracted from hook: preparation -> en_cours -> archive -> en_cours
     */
    async toggleModuleStatus(module: ModuleWithRelations): Promise<ModuleWithRelations> {
        const currentStatus = module.statut || 'en_preparation';
        let newStatus = 'en_cours';

        if (currentStatus === 'en_preparation') newStatus = 'en_cours';
        else if (currentStatus === 'en_cours') newStatus = 'archive';
        else if (currentStatus === 'archive') newStatus = 'en_cours';

        await this.repository.updateModuleStatus(module.id, newStatus);

        return { ...module, statut: newStatus };
    }

    /**
     * Get all active modules
     */
    async getActiveModules(): Promise<any[]> {
        return await this.repository.getActiveModules();
    }

    /**
     * Get all branches
     */
    async getBranches(): Promise<Tables<'Branche'>[]> {
        return await this.repository.getBranches();
    }

    async getModuleDetails(moduleId: string): Promise<ModuleWithRelations> {
        return await this.repository.getModuleWithDetails(moduleId);
    }

    async createModule(data: any): Promise<Tables<'Module'>> {
        return await this.repository.createModule(data);
    }

    async updateModule(id: string, data: any): Promise<void> {
        return await this.repository.updateModule(id, data);
    }
}

export const moduleService = new ModuleService(new SupabaseModuleRepository());
