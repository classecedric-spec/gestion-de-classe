import { TablesInsert } from '../../../types/supabase';
import { ITrackingRepository, ProgressionWithDetails, StudentBasicInfo } from '../repositories/ITrackingRepository';
import { SupabaseTrackingRepository } from '../repositories/SupabaseTrackingRepository';

// Re-export types for backward compatibility
export type { ProgressionWithDetails, StudentBasicInfo };

/**
 * Service for Pedagogical Tracking (Suivi & Mobile)
 * Handles business logic and delegates data access to repository
 */
export class TrackingService {
    constructor(private repository: ITrackingRepository) { }

    /**
     * Fetch help requests for a list of students
     * Business logic: Filters based on is_suivi and module status
     */
    async fetchHelpRequests(studentIds: string[]): Promise<ProgressionWithDetails[]> {
        const states = ['besoin_d_aide', 'a_verifier', 'ajustement'];
        const progressions = await this.repository.fetchProgressions(studentIds, states);

        // Business logic: Filter based on tracking status and module state
        return progressions.filter(req => {
            // Always include if marked for tracking
            if (req.is_suivi) return true;

            // Safety check for module existence
            if (!req.activite?.Module) return true;

            // Only include if module is currently active
            return req.activite.Module.statut === 'en_cours';
        });
    }

    /**
     * Find students who have finished an activity (potential helpers)
     */
    async findHelpers(activityId: string, studentIds: string[]): Promise<StudentBasicInfo[]> {
        return await this.repository.findStudentsByActivityStatus(activityId, studentIds, 'termine');
    }

    /**
     * Update the status of a progression (validation, rejection, etc.)
     */
    async updateProgressionStatus(id: string, newState: string, isSuivi: boolean = false): Promise<boolean> {
        await this.repository.updateProgressionStatus(id, newState, isSuivi);
        return true;
    }

    /**
     * Delete a progression (e.g. removing a manual follow-up)
     */
    async deleteProgression(id: string): Promise<boolean> {
        await this.repository.deleteProgression(id);
        return true;
    }

    /**
     * Create multiple new progressions (e.g. for auto-suivi)
     */
    async createProgressions(progressions: TablesInsert<'Progression'>[]): Promise<boolean> {
        // Business validation: ensure progressions array is not empty
        if (!progressions || progressions.length === 0) {
            throw new Error('Au moins une progression doit être fournie');
        }

        await this.repository.createProgressions(progressions);
        return true;
    }

    /**
     * Upsert a single progression
     */
    async upsertProgression(progression: TablesInsert<'Progression'>): Promise<void> {
        return await this.repository.upsertProgression(progression);
    }

    /**
     * Fetch group info by ID
     */
    async fetchGroupInfo(groupId: string): Promise<{ nom: string } | null> {
        return await this.repository.getGroupInfo(groupId);
    }

    /**
     * Fetch students in a group
     */
    async fetchStudentsInGroup(groupId: string) {
        return await this.repository.getStudentsInGroup(groupId);
    }

    /**
     * Save user preferences (manual indices or skips)
     */
    async saveUserPreference(userId: string, key: string, value: any): Promise<void> {
        await this.repository.saveUserPreference(userId, key, value);
    }

    /**
     * Load user preference
     */
    async loadUserPreference(userId: string, key: string): Promise<any | null> {
        return await this.repository.loadUserPreference(userId, key);
    }

    // ==================== PEDAGOGICAL DATA ====================

    async getStudentsForPedago(groupId: string): Promise<any[]> {
        return await this.repository.getStudentsForPedago(groupId);
    }

    async fetchModulesForStudent(levelId: string | null): Promise<any[]> {
        return await this.repository.fetchModulesForStudent(levelId);
    }

    async fetchActivitiesForModule(moduleId: string): Promise<any[]> {
        return await this.repository.fetchActivitiesForModule(moduleId);
    }

    async fetchGroupProgressions(studentIds: string[]): Promise<any[]> {
        return await this.repository.fetchGroupProgressions(studentIds);
    }

    async fetchStudentProgressionsMap(studentId: string): Promise<Record<string, string>> {
        return await this.repository.fetchStudentProgressionsMap(studentId);
    }

    async getMobileModules(): Promise<any[]> {
        return await this.repository.fetchMobileModules();
    }

    // ==================== TBI DASHBOARD DATA ====================

    async getModulesWithProgressions(studentId: string, levelId?: string): Promise<any[]> {
        return await this.repository.getModulesWithProgressions(studentId, levelId);
    }

    async getModuleActivitiesAndProgressions(moduleId: string, studentId: string): Promise<{ activities: any[], progressions: any[] }> {
        return await this.repository.getModuleActivitiesAndProgressions(moduleId, studentId);
    }

    async getHelpRequests(studentIds: string[]): Promise<any[]> {
        const data = await this.repository.getHelpRequests(studentIds);
        return data.filter((req: any) => {
            if (req.is_suivi) return true;
            return req.activite?.Module?.statut === 'en_cours';
        });
    }

    async getProgressionStatsForActivities(activityIds: string[]): Promise<{ activite_id: string, etat: string }[]> {
        return await this.repository.getProgressionStatsForActivities(activityIds);
    }

    async fetchProgressionsByActivity(activityId: string): Promise<any[]> {
        return await this.repository.fetchProgressionsByActivity(activityId);
    }

    async fetchStudentProgressDetails(studentId: string): Promise<any[]> {
        return await this.repository.fetchStudentProgressDetails(studentId);
    }

    async getActivitiesByModules(moduleIds: string[]): Promise<any[]> {
        return await this.repository.getActivitiesByModules(moduleIds);
    }

    async getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[]): Promise<any[]> {
        return await this.repository.getProgressionsForStudentsAndActivities(studentIds, activityIds);
    }
}

// Export singleton instance
export const trackingService = new TrackingService(new SupabaseTrackingRepository());
