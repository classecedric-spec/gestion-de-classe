import { TablesInsert } from '../../../types/supabase';
import { IAttendanceRepository } from '../repositories/IAttendanceRepository';
import { SupabaseAttendanceRepository } from '../repositories/SupabaseAttendanceRepository';
import type {
    Group,
    Student,
    SetupPresence,
    CategoriePresence,
    Attendance,
    AttendanceWithCategory
} from '../repositories/IAttendanceRepository';

// Re-export types for backward compatibility
export type { Group, Student, SetupPresence, CategoriePresence, Attendance };

/**
 * Service for Attendance Management
 * Handles business logic and delegates data access to repository
 */
export class AttendanceService {
    constructor(private repository: IAttendanceRepository) { }

    // ==================== GROUPS ====================

    /**
     * Fetch all groups ordered by name
     */
    async fetchGroups(): Promise<Group[]> {
        return await this.repository.getGroups();
    }

    /**
     * Get user preferences for a specific key
     */
    async getUserPreferences(userId: string, key: string): Promise<any> {
        return await this.repository.getUserPreferences(userId, key);
    }

    /**
     * Save the last selected group for attendance
     */
    async saveGroupPreference(userId: string, groupId: string): Promise<void> {
        await this.repository.saveGroupPreference(userId, groupId);
    }

    // ==================== STUDENTS ====================

    /**
     * Fetch students belonging to a specific group
     * Returns students with their class and level information
     */
    async fetchStudentsByGroup(groupId: string): Promise<Student[]> {
        return await this.repository.getStudentsByGroup(groupId);
    }

    // ==================== SETUPS & CATEGORIES ====================

    /**
     * Fetch all attendance setups
     */
    async fetchSetups(): Promise<SetupPresence[]> {
        return await this.repository.getSetups();
    }

    /**
     * Fetch categories for a specific setup
     */
    async fetchCategories(setupId: string): Promise<CategoriePresence[]> {
        return await this.repository.getCategories(setupId);
    }

    /**
     * Create a new attendance setup
     */
    async createSetup(userId: string, name: string, description: string | null): Promise<SetupPresence> {
        // Business validation
        if (!name || name.trim().length === 0) {
            throw new Error('Le nom du setup est requis');
        }

        return await this.repository.createSetup(userId, name.trim(), description);
    }

    /**
     * Update an existing setup
     */
    async updateSetup(id: string, name: string, description: string | null): Promise<void> {
        // Business validation
        if (!name || name.trim().length === 0) {
            throw new Error('Le nom du setup est requis');
        }

        await this.repository.updateSetup(id, name.trim(), description);
    }

    /**
     * Delete a setup
     */
    async deleteSetup(id: string): Promise<void> {
        await this.repository.deleteSetup(id);
    }

    /**
     * Upsert multiple categories at once
     */
    async upsertCategories(categories: TablesInsert<'CategoriePresence'>[]): Promise<void> {
        await this.repository.upsertCategories(categories);
    }

    /**
     * Delete a category
     */
    async deleteCategory(id: string): Promise<void> {
        await this.repository.deleteCategory(id);
    }

    /**
     * Ensure that the "Absent" category exists for a setup
     */
    async ensureAbsentCategory(setupId: string, userId: string): Promise<void> {
        await this.repository.ensureAbsentCategory(setupId, userId);
    }

    // ==================== ATTENDANCE ====================

    /**
     * Fetch attendance records for specific date, period, students, and setup
     */
    async fetchAttendances(date: string, period: string, studentIds: string[], setupId: string): Promise<Attendance[]> {
        return await this.repository.getAttendances(date, period, studentIds, setupId);
    }

    /**
     * Check if a setup already exists for given date, period, and students
     * Used for auto-selection logic
     */
    async checkExistingSetup(date: string, period: string, studentIds: string[]): Promise<string | undefined> {
        return await this.repository.checkExistingSetup(date, period, studentIds);
    }

    /**
     * Create or update an attendance record
     */
    async upsertAttendance(attendanceRecord: Partial<Attendance> & { id?: string }): Promise<Attendance> {
        return await this.repository.upsertAttendance(attendanceRecord);
    }

    /**
     * Delete an attendance record
     */
    async deleteAttendance(id: string): Promise<void> {
        await this.repository.deleteAttendance(id);
    }

    /**
     * Bulk insert multiple attendance records
     */
    async bulkInsertAttendances(records: TablesInsert<'Attendance'>[]): Promise<Attendance[]> {
        return await this.repository.bulkInsertAttendances(records);
    }

    // ==================== REPORTING ====================

    /**
     * Fetch all distinct dates for a setup (for reporting)
     */
    async fetchDistinctDates(setupId: string): Promise<string[]> {
        return await this.repository.getDistinctDates(setupId);
    }

    /**
     * Fetch attendance records within a date range
     */
    async fetchAttendanceRange(start: string, end: string): Promise<AttendanceWithCategory[]> {
        return await this.repository.getAttendanceRange(start, end);
    }

    /**
     * Copy attendance data from one period to another
     * Business logic: validates that periods are different
     */
    async copyPeriodData(date: string, setupId: string, fromPeriod: string, toPeriod: string, userId: string): Promise<void> {
        // Business validation
        if (fromPeriod === toPeriod) {
            throw new Error('Les périodes source et destination doivent être différentes');
        }

        await this.repository.copyPeriodData(date, setupId, fromPeriod, toPeriod, userId);
    }

    /**
     * Get aggregated mobile attendance data
     */
    async getMobileAttendance(userId: string, date: string): Promise<any[]> {
        return await this.repository.getMobileData(userId, date);
    }
}

// Export singleton instance
export const attendanceService = new AttendanceService(new SupabaseAttendanceRepository());

// Export default for backward compatibility
export default attendanceService;
