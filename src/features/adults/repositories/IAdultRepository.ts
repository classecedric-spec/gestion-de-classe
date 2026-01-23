import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

/**
 * Repository interface for Adult management
 */
export interface IAdultRepository {
    /**
     * Fetch all adults ordered by name
     */
    getAll(): Promise<Tables<'Adulte'>[]>;

    /**
     * Create a new adult
     */
    create(adultData: TablesInsert<'Adulte'>): Promise<Tables<'Adulte'>>;

    /**
     * Update an existing adult
     */
    update(id: string, adultData: TablesUpdate<'Adulte'>): Promise<Tables<'Adulte'>>;

    /**
     * Delete an adult
     */
    delete(id: string): Promise<void>;

    /**
     * Fetch adult tracking for today
     */
    fetchTrackingToday(): Promise<any[]>;

    /**
     * Add tracking activity for adult
     */
    addActivity(adulteId: string, activiteId: string, userId: string): Promise<void>;

    /**
     * Delete tracking entry
     */
    deleteSuivi(id: string): Promise<void>;
}
