import { supabase } from '../../../lib/supabaseClient';

export const materialService = {
    /**
     * Fetch all materials (TypeMateriel)
     */
    fetchAll: async () => {
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
    fetchLinkedActivities: async (materialId) => {
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
        const activities = data?.map(item => item.Activite).filter(Boolean) || [];
        // Sort by title
        return activities.sort((a, b) => a.titre.localeCompare(b.titre));
    },

    /**
     * Create a new material
     */
    create: async (materialData) => {
        const { data: { user } } = await supabase.auth.getUser();

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
    update: async (id, materialData) => {
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
    delete: async (id) => {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },
};

export default materialService;
