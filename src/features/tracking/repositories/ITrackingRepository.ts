import { TablesInsert, TablesUpdate, Tables } from '../../../types/supabase';
import { ProgressionWithDetails, StudentBasicInfo } from '../types/tracking.types';

/**
 * Repository interface for Tracking feature
 * Handles all data access operations for pedagogical tracking
 */
export interface ITrackingRepository {
    // ==================== PROGRESSIONS ====================

    /**
     * Fetch progressions for given students with specific states
     * Includes related student, activity, module, and branch information
     */
    fetchProgressions(studentIds: string[], states: string[]): Promise<ProgressionWithDetails[]>;

    /**
     * Update the status of a progression
     */
    updateProgressionStatus(id: string, newState: string, isSuivi: boolean): Promise<void>;

    /**
     * Delete a progression record
     */
    deleteProgression(id: string): Promise<void>;

    /**
     * Create multiple progression records at once
     */
    createProgressions(progressions: TablesInsert<'Progression'>[]): Promise<void>;

    /**
     * Upsert a progression record (insert or update on conflict)
     */
    upsertProgression(progression: TablesInsert<'Progression'>): Promise<void>;

    // ==================== HELPERS ====================

    /**
     * Find students who have a specific status for an activity
     * Used to find potential helpers (students who finished an activity)
     */
    findStudentsByActivityStatus(activityId: string, studentIds: string[], status: string): Promise<StudentBasicInfo[]>;

    // ==================== GROUPS ====================

    /**
     * Get group information by ID
     */
    getGroupInfo(groupId: string): Promise<{ nom: string } | null>;

    /**
     * Get all students in a group
     * Returns both IDs and full student records
     */
    getStudentsInGroup(groupId: string): Promise<{ ids: string[], full: Tables<'Eleve'>[] }>;

    // ==================== USER PREFERENCES ====================

    /**
     * Save a user preference
     */
    saveUserPreference(userId: string, key: string, value: any): Promise<void>;

    /**
     * Load a user preference
     */
    loadUserPreference(userId: string, key: string): Promise<any | null>;

    // ==================== PEDAGOGICAL DATA ====================
    getStudentsForPedago(groupId: string): Promise<any[]>;
    fetchModulesForStudent(levelId: string | null): Promise<any[]>;
    fetchMobileModules(): Promise<any[]>;
    fetchActivitiesForModule(moduleId: string): Promise<any[]>;
    fetchGroupProgressions(studentIds: string[]): Promise<any[]>;
    fetchStudentProgressionsMap(studentId: string): Promise<Record<string, string>>;

    // ==================== DASHBOARD ====================
    getDashboardStats(filterStudentIds: string[] | null): Promise<{ helpPending: number; validationsToday: number }>;

    // ==================== TBI / SPECIFIC FETCHES ====================
    getModulesWithProgressions(studentId: string, levelId?: string): Promise<any[]>;
    getModuleActivitiesAndProgressions(moduleId: string, studentId: string): Promise<{ activities: any[], progressions: any[] }>;
    getHelpRequests(studentIds: string[]): Promise<any[]>;
    getProgressionStatsForActivities(activityIds: string[]): Promise<{ activite_id: string, etat: string }[]>;
    fetchProgressionsByActivity(activityId: string): Promise<any[]>;
    fetchStudentProgressDetails(studentId: string): Promise<any[]>;
    getActivitiesByModules(moduleIds: string[]): Promise<any[]>;
    getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[]): Promise<any[]>;
    updateStudentTrust(eleveId: string, branchId: string, adjustment: number, trend: 'up' | 'down' | 'stable'): Promise<void>;
}

// Re-export types for convenience
export type { ProgressionWithDetails, StudentBasicInfo };
