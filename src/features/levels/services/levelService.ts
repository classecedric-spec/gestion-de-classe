import { supabase } from '../../../lib/supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export interface LevelWithStudentCount extends Tables<'Niveau'> {
    Eleve: { count: number }[];
}

export const levelService = {
    /**
     * Fetch all levels with student count
     */
    fetchLevels: async (): Promise<LevelWithStudentCount[]> => {
        const { data, error } = await supabase
            .from('Niveau')
            .select('*, Eleve(count)')
            .order('ordre', { ascending: true });

        if (error) throw error;
        return (data as any) || [];
    },

    /**
     * Fetch students for a specific level
     */
    fetchStudents: async (levelId: string): Promise<Tables<'Eleve'>[]> => {
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
    createLevel: async (levelData: TablesInsert<'Niveau'>): Promise<LevelWithStudentCount> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        // Get max order to append at the end
        const { data: maxOrderData } = await supabase
            .from('Niveau')
            .select('ordre')
            .order('ordre', { ascending: false })
            .limit(1);

        const nextOrder = (maxOrderData && maxOrderData.length > 0) ? (maxOrderData[0].ordre || 0) + 1 : 1;

        const { data, error } = await supabase
            .from('Niveau')
            .insert([{ ...levelData, user_id: user.id, ordre: nextOrder }])
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data as any;
    },

    /**
     * Update an existing level
     */
    updateLevel: async (id: string, levelData: TablesUpdate<'Niveau'>): Promise<LevelWithStudentCount> => {
        const { data, error } = await supabase
            .from('Niveau')
            .update(levelData)
            .eq('id', id)
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data as any;
    },

    /**
     * Delete a level
     */
    deleteLevel: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('Niveau')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update levels order
     */
    updateOrder: async (updates: TablesUpdate<'Niveau'>[]): Promise<void> => {
        const { error } = await supabase
            .from('Niveau')
            .upsert(updates as any, { onConflict: 'id' });

        if (error) throw error;
    }
};
