import { supabase } from '../../../lib/supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

// Define complex types for joined queries
export type ActivityWithRelations = Tables<'Activite'> & {
    Module: Pick<Tables<'Module'>, 'titre' | 'isActive'> | null; // Note: 'nom' in JS code might be 'titre' in DB? JS selected 'nom', DB has 'titre'.
    ActiviteNiveau: (Tables<'ActiviteNiveau'> & {
        Niveau: Pick<Tables<'Niveau'>, 'nom' | 'ordre'> | null
    })[];
};

// Interface for Activity Levels input in saveActivity
interface ActivityLevelInput {
    niveau_id: string;
    nombre_exercices: number | string;
    nombre_erreurs: number | string;
    statut_exigence: string;
}

export const activityService = {
    /**
     * Récupère les détails d'un module
     */
    getModule: async (id: string) => {
        // Adjust selection based on actual DB schema. JS code used 'nom', but schema has 'titre'.
        const { data, error } = await supabase
            .from('Module')
            .select('titre') // Changed from 'nom' which doesn't exist on Module schema
            .eq('id', id)
            .single();

        if (error) throw error;
        // Map back to 'nom' if consumer expects it, or update consumer later. 
        // For strict TS, we return what we select.
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
    getActivityMaterials: async (activityId: string) => {
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
    createMaterialType: async (name: string, userId: string) => {
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
    updateMaterialType: async (id: string, name: string) => {
        const { error } = await supabase
            .from('TypeMateriel')
            .update({ nom: name })
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Supprime un type de matériel
     */
    deleteMaterialType: async (id: string) => {
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
            .select('*')
            .order('ordre');
        if (error) throw error;
        return data || [];
    },

    /**
     * Récupère les niveaux spécifiques (exceptions) d'une activité
     */
    getActivityLevels: async (activityId: string) => {
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
    saveActivity: async (
        activityData: TablesInsert<'Activite'> | TablesUpdate<'Activite'>,
        materialTypeIds: string[],
        activityLevels: ActivityLevelInput[],
        isEdit = false
    ) => {
        // 1. Insert or Update Activity
        let activityId = activityData.id;

        if (isEdit && activityId) {
            const { error } = await supabase
                .from('Activite')
                .update(activityData as TablesUpdate<'Activite'>)
                .eq('id', activityId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from('Activite')
                .insert([activityData as TablesInsert<'Activite'>])
                .select()
                .single();
            if (error) throw error;
            activityId = data.id;
        }

        if (!activityId) throw new Error("Erreur: ID de l'activité manquant après sauvegarde.");

        // 2. Handle Materials Relations (Delete all & Re-insert)
        await supabase.from('ActiviteMateriel').delete().eq('activite_id', activityId);

        if (materialTypeIds.length > 0) {
            const links = materialTypeIds.map(mtId => ({
                activite_id: activityId!,
                type_materiel_id: mtId
            }));
            const { error: linkError } = await supabase.from('ActiviteMateriel').insert(links);
            if (linkError) throw linkError;
        }

        // 3. Handle Activity Levels Relations
        await supabase.from('ActiviteNiveau').delete().eq('activite_id', activityId);

        if (activityLevels.length > 0) {
            const levelLinks = activityLevels.map(al => ({
                activite_id: activityId!,
                niveau_id: al.niveau_id,
                nombre_exercices: typeof al.nombre_exercices === 'string' ? parseInt(al.nombre_exercices, 10) : al.nombre_exercices || 1,
                nombre_erreurs: typeof al.nombre_erreurs === 'string' ? parseInt(al.nombre_erreurs, 10) : al.nombre_erreurs || 1,
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
        // Warning: Relation names must match what Postgrest expects.
        // Assuming 'Module' and 'Niveau' are correct implied relation names.
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                Module:module_id (titre, isActive),
                ActiviteNiveau (
                    *,
                    Niveau (nom, ordre)
                )
            `)
            .order('titre');

        if (error) throw error;
        return (data || []) as unknown as ActivityWithRelations[];
    },

    /**
     * Supprime une activité
     */
    deleteActivity: async (activityId: string) => {
        const { error } = await supabase
            .from('Activite')
            .delete()
            .eq('id', activityId);
        if (error) throw error;
    },

    /**
     * Met à jour une exigence (Activite ou ActiviteNiveau)
     */
    updateRequirement: async (isBase: boolean, id: string, field: string, value: any) => {
        if (isBase) {
            const { error } = await supabase
                .from('Activite')
                .update({ [field]: value } as any) // Use any casting for dynamic field update
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('ActiviteNiveau')
                .update({ [field]: value } as any)
                .eq('id', id);
            if (error) throw error;
        }
    }
};
