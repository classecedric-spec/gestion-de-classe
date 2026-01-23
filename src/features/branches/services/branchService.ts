import { supabase } from '../../../lib/database';
import { storageService } from '../../../lib/storage';
import { validateWith, BranchSchema, SubBranchSchema } from '../../../lib/helpers';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type BrancheInsert = Database['public']['Tables']['Branche']['Insert'];
type BrancheUpdate = Database['public']['Tables']['Branche']['Update'];

type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];
type SousBrancheInsert = Database['public']['Tables']['SousBranche']['Insert'];
type SousBrancheUpdate = Database['public']['Tables']['SousBranche']['Update'];

export const branchService = {
    /**
     * Fetch all branches
     * @returns {Promise<BrancheRow[]>} List of branches
     * @throws {PostgrestError} If query fails
     */
    fetchBranches: async (): Promise<BrancheRow[]> => {
        const { data, error } = await supabase
            .from('Branche')
            .select('id, nom, ordre, photo_url, couleur, user_id, created_at, updated_at')
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch sub-branches for a branch
     * @param {string} branchId - ID of the branch
     * @returns {Promise<SousBrancheRow[]>} List of sub-branches
     * @throws {PostgrestError} If query fails
     */
    fetchSubBranches: async (branchId: string): Promise<SousBrancheRow[]> => {
        const { data, error } = await supabase
            .from('SousBranche')
            .select('id, nom, ordre, branche_id, photo_url, user_id, created_at, updated_at')
            .eq('branche_id', branchId)
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Upload photo to storage using centralized service
     * @param folder - Folder path (e.g., 'branche', 'sousbranche')
     * @param entityId - Entity ID for filename
     * @param base64 - Base64 image data
     * @returns Public URL or null on error
     */
    uploadPhoto: async (folder: string, entityId: string, base64: string): Promise<string | null> => {
        const result = await storageService.uploadImage(folder, entityId, base64);
        return result.publicUrl;
    },


    /**
     * Create a new branch
     * @param {BrancheInsert} branchData - Branch data to insert
     * @returns {Promise<BrancheRow>} Created branch
     * @throws {Error} If validation fails or query errors
     */
    createBranch: async (branchData: BrancheInsert): Promise<BrancheRow> => {
        // Validation
        const validation = validateWith(BranchSchema.partial(), branchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get max order
        const { data: maxOrderData } = await supabase
            .from('Branche')
            .select('ordre')
            .order('ordre', { ascending: false })
            .limit(1);

        const nextOrder = (maxOrderData && maxOrderData.length > 0) ? (maxOrderData[0].ordre || 0) + 1 : 1;

        // Extract base64 if present
        const photoBase64 = (branchData as any).photo_base64;
        const dataToInsert = { ...branchData, user_id: user.id, ordre: nextOrder };

        // Remove base64 from insert payload
        // @ts-ignore
        delete dataToInsert.photo_base64;

        const { data, error } = await supabase
            .from('Branche')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw error;

        // Upload photo if needed
        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('branche', data.id, photoBase64);
            if (publicUrl) {
                await supabase.from('Branche').update({ photo_url: publicUrl }).eq('id', data.id);
                // Update local data object to return correct URL
                data.photo_url = publicUrl;
            }
        }

        return data;
    },

    /**
     * Update an existing branch
     * @param {string} id - Branch ID
     * @param {BrancheUpdate} branchData - Data to update
     * @returns {Promise<BrancheRow>} Updated branch
     * @throws {Error} If validation fails or query errors
     */
    updateBranch: async (id: string, branchData: BrancheUpdate): Promise<BrancheRow> => {
        // Validation
        const validation = validateWith(BranchSchema.partial(), branchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        // Extract base64
        const photoBase64 = (branchData as any).photo_base64;
        const dataToUpdate = { ...branchData };

        // @ts-ignore
        delete dataToUpdate.photo_base64;

        // Upload photo if new base64 provided
        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('branche', id, photoBase64);
            if (publicUrl) {
                dataToUpdate.photo_url = publicUrl;
            }
        }

        const { data, error } = await supabase
            .from('Branche')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a branch
     * @param {string} id - Branch ID
     * @returns {Promise<void>}
     * @throws {Error} If user not authenticated or query fails
     */
    deleteBranch: async (id: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vous devez être connecté pour supprimer.");

        const { error } = await supabase
            .from('Branche')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update branches order
     * @param {BrancheUpdate[]} updates - Usage of updates
     * @returns {Promise<void>}
     * @throws {PostgrestError} If query fails
     */
    updateOrder: async (updates: BrancheUpdate[]): Promise<void> => {
        const { error } = await supabase
            .from('Branche')
            .upsert(updates as any, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * Update SUB-branches order
     * @param {SousBrancheUpdate[]} updates - List of updates
     * @returns {Promise<void>}
     * @throws {PostgrestError} If query fails
     */
    updateSubBranchOrder: async (updates: SousBrancheUpdate[]): Promise<void> => {
        const { error } = await supabase
            .from('SousBranche')
            .upsert(updates as any, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * Create a new sub-branch
     * @param {SousBrancheInsert} subBranchData - Data to insert
     * @returns {Promise<SousBrancheRow>} Created sub-branch
     * @throws {Error} If validation fails or query errors
     */
    createSubBranch: async (subBranchData: SousBrancheInsert): Promise<SousBrancheRow> => {
        // Validation
        const validation = validateWith(SubBranchSchema.partial(), subBranchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Extract base64
        const photoBase64 = (subBranchData as any).photo_base64;
        const dataToInsert = { ...subBranchData, user_id: user.id };

        // @ts-ignore
        delete dataToInsert.photo_base64;

        const { data, error } = await supabase
            .from('SousBranche')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw error;

        // Upload photo if needed
        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('sousbranche', data.id, photoBase64);
            if (publicUrl) {
                await supabase.from('SousBranche').update({ photo_url: publicUrl }).eq('id', data.id);
                data.photo_url = publicUrl;
            }
        }

        return data;
    },

    /**
     * Update an existing sub-branch
     * @param {string} id - Sub-branch ID
     * @param {SousBrancheUpdate} subBranchData - Data to update
     * @returns {Promise<SousBrancheRow>} Updated sub-branch
     * @throws {Error} If validation fails or query errors
     */
    updateSubBranch: async (id: string, subBranchData: SousBrancheUpdate): Promise<SousBrancheRow> => {
        // Validation
        const validation = validateWith(SubBranchSchema.partial(), subBranchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        // Extract base64
        const photoBase64 = (subBranchData as any).photo_base64;
        const dataToUpdate = { ...subBranchData };

        // @ts-ignore
        delete dataToUpdate.photo_base64;

        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('sousbranche', id, photoBase64);
            if (publicUrl) {
                dataToUpdate.photo_url = publicUrl;
            }
        }

        const { data, error } = await supabase
            .from('SousBranche')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

