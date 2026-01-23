import { ActivityType } from '../types/adult.types';

/**
 * Repository interface for Activity Type management
 */
export interface IActivityTypeRepository {
    /**
     * Fetch all activity types ordered by creation date
     */
    getAll(): Promise<ActivityType[]>;

    /**
     * Create a new activity type
     */
    create(label: string, userId: string): Promise<ActivityType>;

    /**
     * Create multiple activity types at once
     */
    bulkCreate(labels: string[], userId: string): Promise<ActivityType[]>;

    /**
     * Update an activity type
     */
    update(id: string, label: string): Promise<ActivityType>;

    /**
     * Delete an activity type
     */
    delete(id: string): Promise<void>;
}

// Re-export type
export type { ActivityType };
