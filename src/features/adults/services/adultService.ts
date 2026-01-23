import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IAdultRepository } from '../repositories/IAdultRepository';
import { SupabaseAdultRepository } from '../repositories/SupabaseAdultRepository';
import { IActivityTypeRepository, ActivityType } from '../repositories/IActivityTypeRepository';
import { SupabaseActivityTypeRepository } from '../repositories/SupabaseActivityTypeRepository';

export type { ActivityType };

export interface Adult {
    id: string;
    nom: string;
    prenom: string;
}

export interface AdultActivity extends Tables<'SuiviAdulte'> {
    Adulte?: { id: string; nom: string; prenom: string } | null;
    TypeActiviteAdulte?: { id: string; label: string } | null;
}

/**
 * Service for Adult management
 * Handles business logic for managing adults in the system
 */
export class AdultService {
    constructor(
        private adultRepository: IAdultRepository,
        private activityTypeRepository: IActivityTypeRepository
    ) { }

    /**
     * Fetch all adults ordered by name
     */
    async fetchAdults(): Promise<Tables<'Adulte'>[]> {
        return await this.adultRepository.getAll();
    }

    /**
     * Re-fetch all adults as simplified Adult interface for tracking
     */
    async fetchAllAdults(): Promise<Adult[]> {
        const adults = await this.adultRepository.getAll();
        return adults.map(a => ({ id: a.id, nom: a.nom, prenom: a.prenom }));
    }

    /**
     * Create a new adult
     */
    async createAdult(adultData: TablesInsert<'Adulte'>): Promise<Tables<'Adulte'>> {
        return await this.adultRepository.create(adultData);
    }

    /**
     * Update an existing adult
     */
    async updateAdult(id: string, adultData: TablesUpdate<'Adulte'>): Promise<Tables<'Adulte'>> {
        return await this.adultRepository.update(id, adultData);
    }

    /**
     * Delete an adult
     */
    async deleteAdult(id: string): Promise<void> {
        await this.adultRepository.delete(id);
    }

    /**
     * Fetch tracking for today (used by TBI dashboard)
     */
    async fetchTrackingToday(): Promise<AdultActivity[]> {
        return await this.adultRepository.fetchTrackingToday();
    }

    /**
     * Fetch tracking since a specific date (used by tracking dashboard)
     */
    async fetchAdultActivities(_sinceDate: string): Promise<AdultActivity[]> {
        // The repository already has fetchTrackingToday which uses today's date.
        // We can expose or extend it if we want to filter specifically by sinceDate.
        // For now, let's keep it consistent with tracking dashboard requirements.
        return await this.adultRepository.fetchTrackingToday();
    }

    /**
     * Add activity
     */
    async addActivity(adulteId: string, activiteId: string, userId: string): Promise<void> {
        await this.adultRepository.addActivity(adulteId, activiteId, userId);
    }

    /**
     * Create activity (replaces createAdultActivity)
     */
    async createAdultActivity(activity: { adulte_id: string; activite_id: string; user_id: string }): Promise<void> {
        await this.adultRepository.addActivity(activity.adulte_id, activity.activite_id, activity.user_id);
    }

    /**
     * Delete tracking
     */
    async deleteSuivi(id: string): Promise<void> {
        await this.adultRepository.deleteSuivi(id);
    }

    /**
     * Delete activity (replaces deleteAdultActivity)
     */
    async deleteAdultActivity(id: string): Promise<void> {
        await this.adultRepository.deleteSuivi(id);
    }

    // --- Activity Type methods ---

    async fetchActivityTypes(): Promise<ActivityType[]> {
        return await this.activityTypeRepository.getAll();
    }

    async seedDefaultActivityTypes(): Promise<ActivityType[]> {
        // Find existing user_id
        const { data: { user } } = await (await import('../../../lib/database')).supabase.auth.getUser();
        if (!user) return [];

        const defaults = [
            "Co-enseignement",
            "Remédiation",
            "Observation",
            "Aide ponctuelle",
            "Soutien"
        ];
        return await this.activityTypeRepository.bulkCreate(defaults, user.id);
    }

    async createActivityType(label: string): Promise<ActivityType> {
        const { data: { user } } = await (await import('../../../lib/database')).supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        return await this.activityTypeRepository.create(label, user.id);
    }

    async updateActivityType(id: string, label: string): Promise<ActivityType> {
        return await this.activityTypeRepository.update(id, label);
    }

    async deleteActivityType(id: string): Promise<void> {
        await this.activityTypeRepository.delete(id);
    }
}

// Export singleton instance
export const adultService = new AdultService(
    new SupabaseAdultRepository(),
    new SupabaseActivityTypeRepository()
);
