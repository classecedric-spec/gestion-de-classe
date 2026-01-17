import { supabase } from '../../../lib/supabaseClient';

export const attendanceService = {
    // --- GROUPS ---
    fetchGroups: async () => {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    },

    getUserPreferences: async (userId, key) => {
        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('key', key)
            .eq('user_id', userId)
            .maybeSingle();
        return data?.value;
    },

    saveGroupPreference: async (userId, groupId) => {
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
    fetchStudentsByGroup: async (groupId) => {
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
        return data || [];
    },

    // --- SETUPS & CATEGORIES ---
    fetchSetups: async () => {
        const { data, error } = await supabase
            .from('SetupPresence')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    },

    fetchCategories: async (setupId) => {
        const { data, error } = await supabase
            .from('CategoriePresence')
            .select('*')
            .eq('setup_id', setupId)
            .order('created_at');
        if (error) throw error;
        return data || [];
    },

    createSetup: async (userId, name, description) => {
        const { data, error } = await supabase
            .from('SetupPresence')
            .insert([{ nom: name, description, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateSetup: async (id, name, description) => {
        const { error } = await supabase
            .from('SetupPresence')
            .update({ nom: name, description })
            .eq('id', id);
        if (error) throw error;
    },

    deleteSetup: async (id) => {
        const { error } = await supabase
            .from('SetupPresence')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    upsertCategories: async (categories) => {
        for (const cat of categories) {
            const { error } = await supabase
                .from('CategoriePresence')
                .upsert(cat);
            if (error) throw error;
        }
    },

    deleteCategory: async (id) => {
        const { error } = await supabase
            .from('CategoriePresence')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    ensureAbsentCategory: async (setupId, userId) => {
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
    fetchAttendances: async (date, period, studentIds, setupId) => {
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
    checkExistingSetup: async (date, period, studentIds) => {
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

    upsertAttendance: async (attendanceRecord) => {
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
            return attendanceRecord; // Return original as update doesn't return data by default usually unless selected
        } else {
            // Insert
            // eslint-disable-next-line no-unused-vars
            const { id, ...payload } = attendanceRecord; // Remove temp ID
            const { data, error } = await supabase
                .from('Attendance')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    deleteAttendance: async (id) => {
        const { error } = await supabase
            .from('Attendance')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    bulkInsertAttendances: async (records) => {
        const { data, error } = await supabase
            .from('Attendance')
            .insert(records)
            .select();
        if (error) throw error;
        return data;
    },

    // --- EXPORT / REPORTING ---
    fetchDistinctDates: async (setupId) => {
        const { data, error } = await supabase
            .from('Attendance')
            .select('date')
            .eq('setup_id', setupId)
            .order('date', { ascending: false });

        if (error) throw error;
        return [...new Set(data.map(item => item.date))].sort().reverse();
    },

    fetchAttendanceRange: async (start, end) => {
        const { data, error } = await supabase
            .from('Attendance')
            .select('*, CategoriePresence(nom)')
            .gte('date', start)
            .lte('date', end);

        if (error) throw error;
        return data || [];
    },

    // Copy attendance data from one period to another
    copyPeriodData: async (date, setupId, fromPeriod, toPeriod) => {
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
        const newRecords = sourceData.map(record => ({
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
