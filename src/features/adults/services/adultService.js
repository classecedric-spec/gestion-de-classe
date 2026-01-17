import { supabase } from '../../../lib/supabaseClient';

export const adultService = {
    // --- ADULTS ---

    /**
     * Fetch all adults ordered by name
     */
    fetchAdults: async () => {
        const { data, error } = await supabase
            .from('Adulte')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new adult
     */
    createAdult: async (adultData) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('Adulte')
            .insert([{ ...adultData, user_id: user.id }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Update an existing adult
     */
    updateAdult: async (id, adultData) => {
        const { data, error } = await supabase
            .from('Adulte')
            .update(adultData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Delete an adult
     */
    deleteAdult: async (id) => {
        const { error } = await supabase
            .from('Adulte')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- ACTIVITY TYPES ---

    /**
     * Fetch all activity types
     */
    fetchActivityTypes: async () => {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte')
            .select('*')
            .order('created_at');
        if (error) throw error;
        return data || [];
    },

    /**
     * Seed default activity types if none exist
     */
    seedDefaultActivityTypes: async () => {
        const defaults = [
            "Observation de la classe",
            "Présentation",
            "Accompagnement individualisé",
            "Entretien famille",
            "Autre"
        ];

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const toInsert = defaults.map(label => ({ label, user_id: user.id }));

        const { data, error } = await supabase
            .from('TypeActiviteAdulte')
            .insert(toInsert)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new activity type
     */
    createActivityType: async (label) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('TypeActiviteAdulte')
            .insert([{ label, user_id: user.id }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Update an activity type
     */
    updateActivityType: async (id, label) => {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte')
            .update({ label })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Delete an activity type
     */
    deleteActivityType: async (id) => {
        const { error } = await supabase
            .from('TypeActiviteAdulte')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
