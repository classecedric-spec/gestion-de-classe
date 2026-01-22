import { supabase } from '../../../lib/supabaseClient';
import { Database } from '../../../types/supabase';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

export type Group = Tables<'Groupe'>;
export type Student = Tables<'Eleve'> & { Classe: { nom: string } | null; Niveau: { nom: string; ordre: number | null } | null };
export type SetupPresence = Tables<'SetupPresence'>;
export type CategoriePresence = Tables<'CategoriePresence'>;
export type Attendance = Tables<'Attendance'>;

export const attendanceService = {
    // --- GROUPS ---
    fetchGroups: async (): Promise<Group[]> => {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    },

    getUserPreferences: async (userId: string, key: string): Promise<any> => {
        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('key', key)
            .eq('user_id', userId)
            .maybeSingle();
        return data?.value;
    },

    saveGroupPreference: async (userId: string, groupId: string) => {
        return await supabase
            .from('UserPreference')
            .upsert({
                user_id: userId,
                key: 'presence_last_group_id',
                value: groupId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,key'
            });
    },

    // --- STUDENTS ---
    fetchStudentsByGroup: async (groupId: string): Promise<Student[]> => {
        // Get links first
        const { data: links, error: linkError } = await supabase
            .from('EleveGroupe')
            .select('eleve_id')
            .eq('groupe_id', groupId);

        if (linkError) throw linkError;

        const studentIds = links?.map(l => l.eleve_id) || [];
        if (studentIds.length === 0) return [];

        const { data, error } = await supabase
            .from('Eleve')
            .select('*, Classe(nom), Niveau(nom, ordre)')
            .in('id', studentIds)
            .order('nom');

        if (error) throw error;
        // Cast to Student[] as Supabase client might not infer the join perfectly with our manual types
        return (data || []) as Student[];
    },

    // --- SETUPS & CATEGORIES ---
    fetchSetups: async (): Promise<SetupPresence[]> => {
        const { data, error } = await supabase
            .from('SetupPresence')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    },

    fetchCategories: async (setupId: string): Promise<CategoriePresence[]> => {
        const { data, error } = await supabase
            .from('CategoriePresence')
            .select('*')
            .eq('setup_id', setupId)
            .order('created_at');
        if (error) throw error;
        return data || [];
    },

    createSetup: async (userId: string, name: string, description: string | null): Promise<SetupPresence> => {
        const { data, error } = await supabase
            .from('SetupPresence')
            .insert([{ nom: name, description, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateSetup: async (id: string, name: string, description: string | null): Promise<void> => {
        const { error } = await supabase
            .from('SetupPresence')
            .update({ nom: name, description })
            .eq('id', id);
        if (error) throw error;
    },

    deleteSetup: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('SetupPresence')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    upsertCategories: async (categories: TablesInsert<'CategoriePresence'>[]): Promise<void> => {
        for (const cat of categories) {
            const { error } = await supabase
                .from('CategoriePresence')
                .upsert(cat);
            if (error) throw error;
        }
    },

    deleteCategory: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('CategoriePresence')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    ensureAbsentCategory: async (setupId: string, userId: string): Promise<void> => {
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
    },

    // --- ATTENDANCE ---
    fetchAttendances: async (date: string, period: string, studentIds: string[], setupId: string): Promise<Attendance[]> => {
        const { data, error } = await supabase
            .from('Attendance')
            .select('*')
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', period)
            .in('eleve_id', studentIds);

        if (error) throw error;
        return data || [];
    },

    // Helper for auto-selection logic
    checkExistingSetup: async (date: string, period: string, studentIds: string[]): Promise<string | undefined> => {
        const { data, error } = await supabase
            .from('Attendance')
            .select('setup_id')
            .eq('date', date)
            .eq('periode', period)
            .in('eleve_id', studentIds)
            .limit(1);

        if (error) throw error;
        return data?.[0]?.setup_id;
    },

    upsertAttendance: async (attendanceRecord: Partial<Attendance> & { id?: string }): Promise<Attendance> => {
        if (attendanceRecord.id && !attendanceRecord.id.toString().startsWith('temp-')) {
            // Update
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
            // Insert
            const { id: _id, ...payload } = attendanceRecord; // Remove temp ID
            const { data, error } = await supabase
                .from('Attendance')
                .insert([payload as TablesInsert<'Attendance'>])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    deleteAttendance: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('Attendance')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    bulkInsertAttendances: async (records: TablesInsert<'Attendance'>[]): Promise<Attendance[]> => {
        const { data, error } = await supabase
            .from('Attendance')
            .insert(records)
            .select();
        if (error) throw error;
        return data || [];
    },

    // --- EXPORT / REPORTING ---
    fetchDistinctDates: async (setupId: string): Promise<string[]> => {
        const { data, error } = await supabase
            .from('Attendance')
            .select('date')
            .eq('setup_id', setupId)
            .order('date', { ascending: false });

        if (error) throw error;
        const dates = data?.map(item => item.date) || [];
        return [...new Set(dates)].sort().reverse();
    },

    fetchAttendanceRange: async (start: string, end: string): Promise<(Attendance & { CategoriePresence: { nom: string } | null })[]> => {
        const { data, error } = await supabase
            .from('Attendance')
            .select('*, CategoriePresence(nom)')
            .gte('date', start)
            .lte('date', end);

        if (error) throw error;
        return (data || []) as (Attendance & { CategoriePresence: { nom: string } | null })[];
    },

    // Copy attendance data from one period to another
    copyPeriodData: async (date: string, setupId: string, fromPeriod: string, toPeriod: string): Promise<void> => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non authentifié");

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
            user_id: user.id  // Add user_id for RLS
        }));

        const { error: insertError } = await supabase
            .from('Attendance')
            .insert(newRecords);

        if (insertError) throw insertError;
    }
};

export default attendanceService;
