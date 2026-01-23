import { supabase } from '../../../lib/database';
import { Database } from '../../../types/supabase';

export type SousBrancheInsert = Database['public']['Tables']['SousBranche']['Insert'];
export type SousBrancheUpdate = Database['public']['Tables']['SousBranche']['Update'];

// Define a type that includes the joined Branch information
export type SubBranchWithParent = Database['public']['Tables']['SousBranche']['Row'] & {
    Branche: {
        nom: string;
    } | null;
};

export const subBranchService = {
    /**
     * Fetch all sub-branches with parent branch information
     */
    fetchAll: async (): Promise<SubBranchWithParent[]> => {
        const { data, error } = await supabase
            .from('SousBranche')
            .select(`
                *,
                Branche:branche_id (nom)
            `)
            .order('nom');

        if (error) throw error;
        // Supabase types might imply Branche is an array or object depending on relationship.
        // Usually it returns an object for Many-to-One.
        // We might need to cast or ensure the query matches the type.
        return (data as any) || [];
    },

    /**
     * Create a new sub-branch
     */
    create: async (subBranchData: SousBrancheInsert): Promise<SubBranchWithParent> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('SousBranche')
            .insert([{ ...subBranchData, user_id: user.id }])
            .select(`
                *,
                Branche:branche_id (nom)
            `)
            .single();

        if (error) throw error;
        return data as any;
    },

    /**
     * Update an existing sub-branch
     */
    update: async (id: string, subBranchData: SousBrancheUpdate): Promise<SubBranchWithParent> => {
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
        return data as any;
    },

    /**
     * Delete a sub-branch
     */
    delete: async (id: string): Promise<SubBranchWithParent[]> => {
        const { data, error } = await supabase
            .from('SousBranche')
            .delete()
            .eq('id', id)
            .select() // Note: Delete returns the deleted rows. JS code was checking data.length.

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("Suppression échouée. Vérifiez vos permissions.");
        }

        return data as any;
    },
};

export default subBranchService;
