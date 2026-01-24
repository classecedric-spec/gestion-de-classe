import { supabase } from '../../../lib/database';
import { Database } from '../../../types/supabase';
import { storageService } from '../../../lib/storage';

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
    /**
     * Create a new sub-branch
     */
    create: async (subBranchData: SousBrancheInsert & { photo_base64?: string | null }): Promise<SubBranchWithParent> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Prepare data: remove base64, ensure user_id
        const { photo_base64, ...dataToInsert } = subBranchData;
        const insertPayload = { ...dataToInsert, user_id: user.id };

        // 1. Create record first to get ID
        const { data, error } = await supabase
            .from('SousBranche')
            .insert([insertPayload])
            .select(`
                *,
                Branche:branche_id (nom)
            `)
            .single();

        if (error) throw error;

        // 2. Upload photo if present
        if (photo_base64 && photo_base64.startsWith('data:image')) {
            try {
                const result = await storageService.uploadImage('sousbranche', data.id, photo_base64);
                if (result.publicUrl) {
                    // Update with valid URL
                    await supabase
                        .from('SousBranche')
                        .update({ photo_url: result.publicUrl })
                        .eq('id', data.id);

                    // Update local return data
                    (data as any).photo_url = result.publicUrl;
                }
            } catch (uploadError) {
                console.error("Image upload failed for sub-branch:", uploadError);
            }
        }

        return data as any;
    },

    /**
     * Update an existing sub-branch
     */
    update: async (id: string, subBranchData: SousBrancheUpdate & { photo_base64?: string | null }): Promise<SubBranchWithParent> => {

        // Prepare data
        const { photo_base64, ...dataToUpdate } = subBranchData;

        // 1. Upload photo if changed/new
        if (photo_base64 && photo_base64.startsWith('data:image')) {
            try {
                const result = await storageService.uploadImage('sousbranche', id, photo_base64);
                if (result.publicUrl) {
                    (dataToUpdate as any).photo_url = result.publicUrl;
                }
            } catch (uploadError) {
                console.error("Image upload failed for sub-branch update:", uploadError);
            }
        }

        const { data, error } = await supabase
            .from('SousBranche')
            .update(dataToUpdate)
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
