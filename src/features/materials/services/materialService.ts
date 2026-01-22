import { supabase } from '../../../lib/supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export type TypeMateriel = Tables<'TypeMateriel'>;
export type TypeMaterielInsert = TablesInsert<'TypeMateriel'>;
export type TypeMaterielUpdate = TablesUpdate<'TypeMateriel'>;

export interface MaterialActivity {
    id: string;
    titre: string;
    Module: { nom: string } | null;
    ActiviteMateriel: {
        TypeMateriel: {
            id: string;
            nom: string;
            acronyme: string | null;
        } | null;
    }[];
}

export const materialService = {
    /**
     * Fetch all materials (TypeMateriel)
     */
    fetchAll: async (): Promise<TypeMateriel[]> => {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch linked activities for a material
     */
    fetchLinkedActivities: async (materialId: string): Promise<MaterialActivity[]> => {
        const { data, error } = await supabase
            .from('ActiviteMateriel')
            .select(`
                activite_id,
                Activite:activite_id (
                    id,
                    titre,
                    Module:module_id (nom),
                    ActiviteMateriel (
                        TypeMateriel (
                            id,
                            nom,
                            acronyme
                        )
                    )
                )
            `)
            .eq('type_materiel_id', materialId);

        if (error) throw error;

        // Extract activities from the join and filter nulls
        // We cast to any first to handle the complex join type, then map to our interface
        const activities = (data as any[])?.map(item => item.Activite).filter(Boolean) || [];

        // Sort by title
        return activities.sort((a: MaterialActivity, b: MaterialActivity) =>
            (a.titre || '').localeCompare(b.titre || '')
        );
    },

    /**
     * Create a new material
     */
    create: async (materialData: Omit<TypeMaterielInsert, 'user_id'>): Promise<TypeMateriel> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('TypeMateriel')
            .insert([{ ...materialData, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing material
     */
    update: async (id: string, materialData: TypeMaterielUpdate): Promise<TypeMateriel> => {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .update(materialData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a material
     */
    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },
};

export default materialService;
