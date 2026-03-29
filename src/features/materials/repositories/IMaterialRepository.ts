import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { TypeMateriel, MaterialActivity } from '../types/material.types';

/**
 * Repository interface for Material management
 */
export interface IMaterialRepository {
    /**
     * Fetch all materials ordered by name
     */
    getAll(): Promise<TypeMateriel[]>;

    /**
     * Fetch activities linked to a specific material
     * Returns activities with their module and all linked materials
     */
    getLinkedActivities(materialId: string): Promise<MaterialActivity[]>;

    /**
     * Create a new material
     */
    create(materialData: TablesInsert<'TypeMateriel'>): Promise<TypeMateriel>;

    /**
     * Update an existing material
     */
    update(id: string, materialData: TablesUpdate<'TypeMateriel'>): Promise<TypeMateriel>;

    /**
     * Delete a material
     */
    delete(id: string): Promise<void>;
}

// Re-export types
export type { TypeMateriel, MaterialActivity };
