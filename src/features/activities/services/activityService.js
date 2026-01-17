import { supabase } from '../../../lib/supabaseClient';

export const activityService = {
    /**
     * Récupère les détails d'un module
     */
    getModule: async (id) => {
        const { data, error } = await supabase
            .from('Module')
            .select('nom')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Récupère tous les types de matériel
     */
    getMaterialTypes: async () => {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    },

    /**
     * Récupère les matériaux liés à une activité
     */
    getActivityMaterials: async (activityId) => {
        const { data, error } = await supabase
            .from('ActiviteMateriel')
            .select('type_materiel_id')
            .eq('activite_id', activityId);
        if (error) throw error;
        return data || [];
    },

    /**
     * Crée un nouveau type de matériel
     */
    createMaterialType: async (name, userId) => {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .insert([{
                nom: name,
                user_id: userId
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Met à jour un type de matériel
     */
    updateMaterialType: async (id, name) => {
        const { error } = await supabase
            .from('TypeMateriel')
            .update({ nom: name })
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Supprime un type de matériel
     */
    deleteMaterialType: async (id) => {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Récupère tous les niveaux
     */
    getLevels: async () => {
        const { data, error } = await supabase
            .from('Niveau')
            .select('id, nom')
            .order('ordre');
        if (error) throw error;
        return data || [];
    },

    /**
     * Récupère les niveaux spécifiques (exceptions) d'une activité
     */
    getActivityLevels: async (activityId) => {
        const { data, error } = await supabase
            .from('ActiviteNiveau')
            .select(`
                *,
                Niveau (nom)
            `)
            .eq('activite_id', activityId);
        if (error) throw error;
        return data;
    },

    /**
     * Crée ou met à jour une activité complète (avec ses relations)
     */
    /**
     * Crée ou met à jour une activité complète (avec ses relations)
     */
    saveActivity: async (activityData, materialTypeIds, activityLevels, isEdit = false) => {
        // ... (existing implementation)
        // 1. Insert or Update Activity
        let activityId = activityData.id;

        if (isEdit) {
            const { error } = await supabase
                .from('Activite')
                .update(activityData)
                .eq('id', activityId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from('Activite')
                .insert([activityData])
                .select()
                .single();
            if (error) throw error;
            activityId = data.id;
        }

        // 2. Handle Materials Relations (Delete all & Re-insert)
        await supabase.from('ActiviteMateriel').delete().eq('activite_id', activityId);

        if (materialTypeIds.length > 0) {
            const links = materialTypeIds.map(mtId => ({
                activite_id: activityId,
                type_materiel_id: mtId
            }));
            const { error: linkError } = await supabase.from('ActiviteMateriel').insert(links);
            if (linkError) throw linkError;
        }

        // 3. Handle Activity Levels Relations
        await supabase.from('ActiviteNiveau').delete().eq('activite_id', activityId);

        if (activityLevels.length > 0) {
            const levelLinks = activityLevels.map(al => ({
                activite_id: activityId,
                niveau_id: al.niveau_id,
                nombre_exercices: parseInt(al.nombre_exercices) || 1,
                nombre_erreurs: parseInt(al.nombre_erreurs) || 1,
                statut_exigence: al.statut_exigence,
                user_id: activityData.user_id
            }));

            const { error: levelError } = await supabase.from('ActiviteNiveau').insert(levelLinks);
            if (levelError) throw levelError;
        }

        return activityId;
    },

    /**
     * Récupère la liste complète des activités avec relations
     */
    fetchActivities: async () => {
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                Module:module_id (nom, statut),
                ActiviteNiveau (
                    *,
                    Niveau (nom, ordre)
                )
            `)
            .order('titre');

        if (error) throw error;
        return data || [];
    },

    /**
     * Supprime une activité
     */
    deleteActivity: async (activityId) => {
        const { error } = await supabase
            .from('Activite')
            .delete()
            .eq('id', activityId);
        if (error) throw error;
    },

    /**
     * Met à jour une exigence (Activite ou ActiviteNiveau)
     */
    updateRequirement: async (isBase, id, field, value) => {
        if (isBase) {
            const { error } = await supabase
                .from('Activite')
                .update({ [field]: value })
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('ActiviteNiveau')
                .update({ [field]: value })
                .eq('id', id);
            if (error) throw error;
        }
    }
};
