import { supabase } from '../../../lib/supabaseClient';

export const levelService = {
    /**
     * Fetch all levels with student count
     */
    fetchLevels: async () => {
        const { data, error } = await supabase
            .from('Niveau')
            .select('*, Eleve(count)')
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch students for a specific level
     */
    fetchStudents: async (levelId) => {
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('niveau_id', levelId)
            .order('nom', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new level
     */
    createLevel: async (levelData) => {
        const { data: { user } } = await supabase.auth.getUser();
        // Get max order to append at the end
        const { data: maxOrderData } = await supabase
            .from('Niveau')
            .select('ordre')
            .order('ordre', { ascending: false })
            .limit(1);

        const nextOrder = (maxOrderData && maxOrderData.length > 0) ? maxOrderData[0].ordre + 1 : 1;

        const { data, error } = await supabase
            .from('Niveau')
            .insert([{ ...levelData, user_id: user.id, ordre: nextOrder }])
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing level
     */
    updateLevel: async (id, levelData) => {
        const { data, error } = await supabase
            .from('Niveau')
            .update(levelData)
            .eq('id', id)
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a level
     */
    deleteLevel: async (id) => {
        const { error } = await supabase
            .from('Niveau')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update levels order
     */
    updateOrder: async (updates) => {
        const { error } = await supabase
            .from('Niveau')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
    }
};
