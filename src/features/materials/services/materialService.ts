import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IMaterialRepository, TypeMateriel, MaterialActivity } from '../repositories/IMaterialRepository';
import { SupabaseMaterialRepository } from '../repositories/SupabaseMaterialRepository';

// Re-export types for backward compatibility
export type { TypeMateriel, MaterialActivity };
export type TypeMaterielInsert = TablesInsert<'TypeMateriel'>;
export type TypeMaterielUpdate = TablesUpdate<'TypeMateriel'>;

/**
 * Service for Material management
 * Handles business logic for managing material types
 */
export class MaterialService {
    constructor(private repository: IMaterialRepository) { }

    /**
     * Fetch all materials ordered by name
     */
    async fetchAll(): Promise<TypeMateriel[]> {
        return await this.repository.getAll();
    }

    /**
     * Fetch linked activities for a material
     * Business logic: Sorts activities alphabetically by title
     */
    async fetchLinkedActivities(materialId: string): Promise<MaterialActivity[]> {
        const activities = await this.repository.getLinkedActivities(materialId);

        // Business logic: Sort activities alphabetically by title
        return activities.sort((a, b) =>
            (a.titre || '').localeCompare(b.titre || '')
        );
    }

    /**
     * Create a new material
     * Business logic: Ensures user_id is provided and validates name
     */
    async create(materialData: Omit<TablesInsert<'TypeMateriel'>, 'user_id'>, userId: string): Promise<TypeMateriel> {
        // Validation
        if (!materialData.nom || materialData.nom.trim().length === 0) {
            throw new Error('Le nom du matériel est requis');
        }

        return await this.repository.create({
            ...materialData,
            nom: materialData.nom.trim(),
            user_id: userId
        });
    }

    /**
     * Update an existing material
     * Business logic: Validates name if provided
     */
    async update(id: string, materialData: TablesUpdate<'TypeMateriel'>): Promise<TypeMateriel> {
        // Validation if name is being updated
        if (materialData.nom !== undefined) {
            if (!materialData.nom || materialData.nom.trim().length === 0) {
                throw new Error('Le nom du matériel est requis');
            }
            materialData.nom = materialData.nom.trim();
        }

        return await this.repository.update(id, materialData);
    }

    /**
     * Delete a material
     */
    async delete(id: string): Promise<boolean> {
        await this.repository.delete(id);
        return true;
    }
}

// Export singleton instance
export const materialService = new MaterialService(new SupabaseMaterialRepository());

// Export default for backward compatibility
export default materialService;
