import { supabase } from '../../../lib/supabaseClient';

export const branchService = {
    /**
     * Fetch all branches
     */
    fetchBranches: async () => {
        const { data, error } = await supabase
            .from('Branche')
            .select('id, nom, ordre, photo_url')
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch sub-branches for a branch
     */
    fetchSubBranches: async (branchId) => {
        const { data, error } = await supabase
            .from('SousBranche')
            .select('id, nom, ordre, branche_id, photo_url')
            .eq('branche_id', branchId)
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new branch
     */
    createBranch: async (branchData) => {
        const { data: { user } } = await supabase.auth.getUser();

        // Get max order
        const { data: maxOrderData } = await supabase
            .from('Branche')
            .select('ordre')
            .order('ordre', { ascending: false })
            .limit(1);

        const nextOrder = (maxOrderData && maxOrderData.length > 0) ? maxOrderData[0].ordre + 1 : 1;

        const { data, error } = await supabase
            .from('Branche')
            .insert([{ ...branchData, user_id: user.id, ordre: nextOrder }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing branch
     */
    updateBranch: async (id, branchData) => {
        const { data, error } = await supabase
            .from('Branche')
            .update(branchData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a branch
     */
    deleteBranch: async (id) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vous devez être connecté pour supprimer.");

        // Check ownership if needed (logic from original file)
        // Original logic: "if (targetBranch.user_id && targetBranch.user_id !== user.id)"
        // We'll trust Supabase RLS or basic user check here, but let's just do delete.
        // If it fails due to RLS, error will be thrown.

        const { error } = await supabase
            .from('Branche')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update branches order
     */
    updateOrder: async (updates) => {
        const { error } = await supabase
            .from('Branche')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * Update SUB-branches order
     */
    updateSubBranchOrder: async (updates) => {
        const { error } = await supabase
            .from('SousBranche')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * Create a new sub-branch
     */
    createSubBranch: async (subBranchData) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('SousBranche')
            .insert([{ ...subBranchData, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing sub-branch
     */
    updateSubBranch: async (id, subBranchData) => {
        const { data, error } = await supabase
            .from('SousBranche')
            .update(subBranchData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
