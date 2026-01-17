import { supabase } from '../../../lib/supabaseClient';

export const subBranchService = {
    /**
     * Fetch all sub-branches with parent branch information
     */
    fetchAll: async () => {
        const { data, error } = await supabase
            .from('SousBranche')
            .select(`
                id, nom, ordre, branche_id, photo_url,
                Branche:branche_id (nom)
            `)
            .order('nom');

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new sub-branch
     */
    create: async (subBranchData) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('SousBranche')
            .insert([{ ...subBranchData, user_id: user.id }])
            .select(`
                *,
                Branche:branche_id (nom)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing sub-branch
     */
    update: async (id, subBranchData) => {
        const { data, error } = await supabase
            .from('SousBranche')
            .update(subBranchData)
            .eq('id', id)
            .select(`
                *,
                Branche:branche_id (nom)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a sub-branch
     */
    delete: async (id) => {
        const { data, error } = await supabase
            .from('SousBranche')
            .delete()
            .eq('id', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("Suppression échouée. Vérifiez vos permissions.");
        }

        return data;
    },
};

export default subBranchService;
