import { ActivityType } from '../types/adult.types';
import { IActivityTypeRepository } from '../repositories/IActivityTypeRepository';
import { SupabaseActivityTypeRepository } from '../repositories/SupabaseActivityTypeRepository';

/**
 * Service for Activity Type management
 * Handles business logic for managing activity types for adults
 */
export class ActivityTypeService {
    constructor(private repository: IActivityTypeRepository) { }

    // Default activity types to seed
    private readonly DEFAULT_TYPES = [
        "Observation de la classe",
        "Présentation",
        "Accompagnement individualisé",
        "Entretien famille",
        "Autre"
    ];

    /**
     * Fetch all activity types
     */
    async fetchAll(): Promise<ActivityType[]> {
        return await this.repository.getAll();
    }

    /**
     * Seed default activity types if none exist
     * Business logic: Only seeds if no types exist
     */
    async seedDefaults(userId: string): Promise<ActivityType[]> {
        const existing = await this.repository.getAll();

        if (existing.length > 0) {
            return existing;
        }

        return await this.repository.bulkCreate(this.DEFAULT_TYPES, userId);
    }

    /**
     * Create a new activity type
     * Business logic: Validates that label is not empty
     */
    async create(label: string, userId: string): Promise<ActivityType> {
        // Validation
        if (!label || label.trim().length === 0) {
            throw new Error('Le libellé du type d\'activité est requis');
        }

        return await this.repository.create(label.trim(), userId);
    }

    /**
     * Update an activity type
     * Business logic: Validates that label is not empty
     */
    async update(id: string, label: string): Promise<ActivityType> {
        // Validation
        if (!label || label.trim().length === 0) {
            throw new Error('Le libellé du type d\'activité est requis');
        }

        return await this.repository.update(id, label.trim());
    }

    /**
     * Delete an activity type
     */
    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }
}

// Export singleton instance
export const activityTypeService = new ActivityTypeService(new SupabaseActivityTypeRepository());

// Re-export type
export type { ActivityType };
