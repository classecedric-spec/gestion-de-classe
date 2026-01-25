import { Tables, TablesInsert } from '../../../types/supabase';

export type Group = Tables<'Groupe'>;
export type Student = Tables<'Eleve'> & {
    Classe: { nom: string } | null;
    Niveau: { nom: string; ordre: number | null } | null;
    importance_suivi?: number | null;
    trust_trend?: 'up' | 'down' | 'stable' | null;
};
export type SetupPresence = Tables<'SetupPresence'>;
export type CategoriePresence = Tables<'CategoriePresence'>;
export type Attendance = Tables<'Attendance'>;
export type AttendanceWithCategory = Attendance & {
    CategoriePresence: { nom: string } | null
};

/**
 * Repository interface for Attendance feature
 * Handles all data access operations for attendance management
 */
export interface IAttendanceRepository {
    // Groups
    getGroups(): Promise<Group[]>;
    getUserPreferences(userId: string, key: string): Promise<any>;
    saveGroupPreference(userId: string, groupId: string): Promise<void>;

    // Students
    getStudentsByGroup(groupId: string): Promise<Student[]>;

    // Setups & Categories
    getSetups(): Promise<SetupPresence[]>;
    getCategories(setupId: string): Promise<CategoriePresence[]>;
    createSetup(userId: string, name: string, description: string | null): Promise<SetupPresence>;
    updateSetup(id: string, name: string, description: string | null): Promise<void>;
    deleteSetup(id: string): Promise<void>;
    upsertCategories(categories: TablesInsert<'CategoriePresence'>[]): Promise<void>;
    deleteCategory(id: string): Promise<void>;
    ensureAbsentCategory(setupId: string, userId: string): Promise<void>;

    // Attendance
    getAttendances(date: string, period: string, studentIds: string[], setupId: string): Promise<Attendance[]>;
    checkExistingSetup(date: string, period: string, studentIds: string[]): Promise<string | undefined>;
    upsertAttendance(attendanceRecord: Partial<Attendance> & { id?: string }): Promise<Attendance>;
    deleteAttendance(id: string): Promise<void>;
    bulkInsertAttendances(records: TablesInsert<'Attendance'>[]): Promise<Attendance[]>;

    // Reporting
    getDistinctDates(setupId: string): Promise<string[]>;
    getAttendanceRange(start: string, end: string): Promise<AttendanceWithCategory[]>;
    copyPeriodData(date: string, setupId: string, fromPeriod: string, toPeriod: string, userId: string): Promise<void>;

    // Mobile
    getMobileData(userId: string, date: string): Promise<{ student: any, attendances: any }[]>;
    getDailySummary(userId: string, date: string, period: string): Promise<{ present: number; absent: number; hasEncoding: boolean }>;
}
