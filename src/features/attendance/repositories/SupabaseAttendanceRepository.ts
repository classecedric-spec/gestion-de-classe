import { supabase } from '../../../lib/database';
import { TablesInsert } from '../../../types/supabase';
import {
    IAttendanceRepository,
    Group,
    Student,
    SetupPresence,
    CategoriePresence,
    Attendance,
    AttendanceWithCategory
} from './IAttendanceRepository';

/**
 * Supabase implementation of the Attendance Repository
 * Handles all database operations for attendance management
 */
export class SupabaseAttendanceRepository implements IAttendanceRepository {

    // ==================== GROUPS ====================

    async getGroups(): Promise<Group[]> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    }

    async getUserPreferences(userId: string, key: string): Promise<any> {
        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('key', key)
            .eq('user_id', userId)
            .maybeSingle();
        return data?.value;
    }

    async saveGroupPreference(userId: string, groupId: string): Promise<void> {
        const { error } = await supabase
            .from('UserPreference')
            .upsert({
                user_id: userId,
                key: 'presence_last_group_id',
                value: groupId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,key'
            });
        if (error) throw error;
    }

    // ==================== STUDENTS ====================

    async getStudentsByGroup(groupId: string): Promise<Student[]> {
        // Get student IDs linked to the group
        const { data: links, error: linkError } = await supabase
            .from('EleveGroupe')
            .select('eleve_id')
            .eq('groupe_id', groupId);

        if (linkError) throw linkError;

        const studentIds = links?.map(l => l.eleve_id) || [];
        if (studentIds.length === 0) return [];

        // Fetch students with their class and level information
        const { data, error } = await supabase
            .from('Eleve')
            .select('*, Classe(nom), Niveau(nom, ordre)')
            .in('id', studentIds)
            .order('nom');

        if (error) throw error;
        return (data || []) as Student[];
    }

    // ==================== SETUPS & CATEGORIES ====================

    async getSetups(): Promise<SetupPresence[]> {
        const { data, error } = await supabase
            .from('SetupPresence')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    }

    async getCategories(setupId: string): Promise<CategoriePresence[]> {
        const { data, error } = await supabase
            .from('CategoriePresence')
            .select('*')
            .eq('setup_id', setupId)
            .order('created_at');
        if (error) throw error;
        return data || [];
    }

    async createSetup(userId: string, name: string, description: string | null): Promise<SetupPresence> {
        const { data, error } = await supabase
            .from('SetupPresence')
            .insert([{ nom: name, description, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateSetup(id: string, name: string, description: string | null): Promise<void> {
        const { error } = await supabase
            .from('SetupPresence')
            .update({ nom: name, description })
            .eq('id', id);
        if (error) throw error;
    }

    async deleteSetup(id: string): Promise<void> {
        const { error } = await supabase
            .from('SetupPresence')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async upsertCategories(categories: TablesInsert<'CategoriePresence'>[]): Promise<void> {
        for (const cat of categories) {
            const { error } = await supabase
                .from('CategoriePresence')
                .upsert(cat);
            if (error) throw error;
        }
    }

    async deleteCategory(id: string): Promise<void> {
        const { error } = await supabase
            .from('CategoriePresence')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async ensureAbsentCategory(setupId: string, userId: string): Promise<void> {
        const { count } = await supabase
            .from('CategoriePresence')
            .select('*', { count: 'exact', head: true })
            .eq('setup_id', setupId)
            .eq('nom', 'Absent');

        if (count === 0) {
            await supabase.from('CategoriePresence').insert({
                setup_id: setupId,
                nom: 'Absent',
                couleur: '#EF4444',
                user_id: userId
            });
        }
    }

    // ==================== ATTENDANCE ====================

    async getAttendances(date: string, period: string, studentIds: string[], setupId: string): Promise<Attendance[]> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('*')
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', period)
            .in('eleve_id', studentIds);

        if (error) throw error;
        return data || [];
    }

    async checkExistingSetup(date: string, period: string, studentIds: string[]): Promise<string | undefined> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('setup_id')
            .eq('date', date)
            .eq('periode', period)
            .in('eleve_id', studentIds)
            .limit(1);

        if (error) throw error;
        return data?.[0]?.setup_id;
    }

    async upsertAttendance(attendanceRecord: Partial<Attendance> & { id?: string }): Promise<Attendance> {
        if (attendanceRecord.id && !attendanceRecord.id.toString().startsWith('temp-')) {
            // Update existing record
            const { error } = await supabase
                .from('Attendance')
                .update({
                    categorie_id: attendanceRecord.categorie_id,
                    status: attendanceRecord.status
                })
                .eq('id', attendanceRecord.id);
            if (error) throw error;
            return attendanceRecord as Attendance;
        } else {
            // Insert new record
            const { id: _id, ...payload } = attendanceRecord; // Remove temp ID
            const { data, error } = await supabase
                .from('Attendance')
                .insert([payload as TablesInsert<'Attendance'>])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    }

    async deleteAttendance(id: string): Promise<void> {
        const { error } = await supabase
            .from('Attendance')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async bulkInsertAttendances(records: TablesInsert<'Attendance'>[]): Promise<Attendance[]> {
        const { data, error } = await supabase
            .from('Attendance')
            .insert(records)
            .select();
        if (error) throw error;
        return data || [];
    }

    // ==================== REPORTING ====================

    async getDistinctDates(setupId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('date')
            .eq('setup_id', setupId)
            .order('date', { ascending: false });

        if (error) throw error;
        const dates = data?.map(item => item.date) || [];
        return [...new Set(dates)].sort().reverse();
    }

    async getAttendanceRange(start: string, end: string): Promise<AttendanceWithCategory[]> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('*, CategoriePresence(nom)')
            .gte('date', start)
            .lte('date', end);

        if (error) throw error;
        return (data || []) as AttendanceWithCategory[];
    }

    async copyPeriodData(date: string, setupId: string, fromPeriod: string, toPeriod: string, userId: string): Promise<void> {
        // Fetch source period data
        const { data: sourceData, error: fetchError } = await supabase
            .from('Attendance')
            .select('*')
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', fromPeriod);

        if (fetchError) throw fetchError;
        if (!sourceData || sourceData.length === 0) {
            throw new Error(`Aucune donnée trouvée pour la période ${fromPeriod}`);
        }

        // Delete existing target period data
        const { error: deleteError } = await supabase
            .from('Attendance')
            .delete()
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', toPeriod);

        if (deleteError) throw deleteError;

        // Copy data to target period
        const newRecords: TablesInsert<'Attendance'>[] = sourceData.map(record => ({
            eleve_id: record.eleve_id,
            date: record.date,
            periode: toPeriod,
            setup_id: record.setup_id,
            categorie_id: record.categorie_id,
            status: record.status,
            user_id: userId
        }));

        const { error: insertError } = await supabase
            .from('Attendance')
            .insert(newRecords);

        if (insertError) throw insertError;
    }

    async getMobileData(userId: string, date: string): Promise<{ student: any, attendances: any }[]> {
        // 1. Get user's groups
        const { data: groups } = await supabase.from('Groupe').select('id').eq('user_id', userId);
        const groupIds = groups?.map(g => g.id) || [];

        if (groupIds.length === 0) return [];

        // 2. Get students in these groups
        const { data: students } = await supabase
            .from('Eleve')
            .select('id, prenom, nom, photo_url, EleveGroupe!inner(groupe_id)')
            .in('EleveGroupe.groupe_id', groupIds)
            .order('nom');

        if (!students || students.length === 0) return [];

        const studentIds = students.map(s => s.id);

        // 3. Get attendance for target date
        // Note: We fetch ALL attendances for these students on this date, regardless of setup, matching legacy behavior.
        const { data: attendances } = await supabase
            .from('Attendance')
            .select('eleve_id, status, periode')
            .eq('date', date)
            .in('eleve_id', studentIds);

        // 4. Merge data
        return students.map(student => {
            const matinRecord = attendances?.find(a => a.eleve_id === student.id && a.periode === 'matin');
            const apresMidiRecord = attendances?.find(a => a.eleve_id === student.id && a.periode === 'apres_midi');

            return {
                ...student,
                matin: matinRecord?.status || 'present',
                apres_midi: apresMidiRecord?.status || 'present'
            };
        });
    }

    async getDailySummary(userId: string, date: string, period: string): Promise<{ present: number; absent: number; hasEncoding: boolean }> {
        // 1. Get user's groups
        const { data: groups } = await supabase.from('Groupe').select('id').eq('user_id', userId);
        const groupIds = groups?.map(g => g.id) || [];

        if (groupIds.length === 0) return { present: 0, absent: 0, hasEncoding: false };

        // 2. Get students ids for these groups
        const { data: students } = await supabase
            .from('Eleve')
            .select('id, EleveGroupe!inner(groupe_id)')
            .in('EleveGroupe.groupe_id', groupIds);

        if (!students) return { present: 0, absent: 0, hasEncoding: false };

        const studentIds = students.map(s => s.id);

        if (studentIds.length === 0) return { present: 0, absent: 0, hasEncoding: false };

        // 3. Get attendance for today AND current period only
        const { data: attendances } = await supabase
            .from('Attendance')
            .select('status, eleve_id')
            .eq('date', date)
            .eq('periode', period)
            .in('eleve_id', studentIds);

        const hasData = attendances && attendances.length > 0;

        if (!hasData) {
            return {
                present: 0,
                absent: 0,
                hasEncoding: false
            };
        } else {
            const totalStudents = studentIds.length;
            const absentCount = attendances.filter(a => a.status === 'absent').length;
            const presentCount = totalStudents - absentCount;

            return {
                present: presentCount,
                absent: absentCount,
                hasEncoding: true
            };
        }
    }
}
