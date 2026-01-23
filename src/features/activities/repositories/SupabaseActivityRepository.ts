import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IActivityRepository, ActivityWithRelations } from './IActivityRepository';

export class SupabaseActivityRepository implements IActivityRepository {
    async getModule(id: string): Promise<{ titre: string } | null> {
        const { data, error } = await supabase
            .from('Module')
            .select('titre')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as { titre: string } | null;
    }

    async getMaterialTypes(): Promise<Tables<'TypeMateriel'>[]> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    }

    async getActivityMaterials(activityId: string): Promise<{ type_materiel_id: string }[]> {
        const { data, error } = await supabase
            .from('ActiviteMateriel')
            .select('type_materiel_id')
            .eq('activite_id', activityId);
        if (error) throw error;
        return data || [];
    }

    async createMaterialType(name: string, userId: string): Promise<Tables<'TypeMateriel'>> {
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
    }

    async updateMaterialType(id: string, name: string): Promise<void> {
        const { error } = await supabase
            .from('TypeMateriel')
            .update({ nom: name })
            .eq('id', id);
        if (error) throw error;
    }

    async deleteMaterialType(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async getLevels(): Promise<Tables<'Niveau'>[]> {
        const { data, error } = await supabase
            .from('Niveau')
            .select('*')
            .order('ordre');
        if (error) throw error;
        return data || [];
    }

    async getActivityLevels(activityId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('ActiviteNiveau')
            .select(`
                *,
                Niveau (nom)
            `)
            .eq('activite_id', activityId);
        if (error) throw error;
        return data || [];
    }

    async createActivity(dataToSave: TablesInsert<'Activite'>): Promise<Tables<'Activite'>> {
        const { data, error } = await supabase
            .from('Activite')
            .insert([dataToSave])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async createActivities(dataToSave: TablesInsert<'Activite'>[]): Promise<Tables<'Activite'>[]> {
        const { data, error } = await supabase
            .from('Activite')
            .insert(dataToSave)
            .select();
        if (error) throw error;
        return data || [];
    }

    async getActivityCount(moduleId: string): Promise<number> {
        const { count, error } = await supabase
            .from('Activite')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', moduleId);

        if (error) throw error;
        return count || 0;
    }

    async getMaxActivityOrder(moduleId: string): Promise<number> {
        const { data, error } = await supabase
            .from('Activite')
            .select('ordre')
            .eq('module_id', moduleId)
            .order('ordre', { ascending: false })
            .limit(1);

        if (error) throw error;
        return data?.[0]?.ordre || 0;
    }

    async updateActivity(id: string, data: TablesUpdate<'Activite'>): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .update(data)
            .eq('id', id);
        if (error) throw error;
    }

    async upsertActivities(data: TablesInsert<'Activite'>[]): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .upsert(data, { onConflict: 'id' });
        if (error) throw error;
    }

    async deleteActivity(id: string): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async getActivities(): Promise<ActivityWithRelations[]> {
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                Module (titre, isActive),
                ActiviteNiveau (
                    *,
                    Niveau (nom, ordre)
                )
            `)
            .order('titre');

        if (error) throw error;
        return (data || []) as unknown as ActivityWithRelations[];
    }

    async clearActivityMaterials(activityId: string): Promise<void> {
        const { error } = await supabase.from('ActiviteMateriel').delete().eq('activite_id', activityId);
        if (error) throw error;
    }

    async addActivityMaterials(links: TablesInsert<'ActiviteMateriel'>[]): Promise<void> {
        const { error } = await supabase.from('ActiviteMateriel').insert(links);
        if (error) throw error;
    }

    async clearActivityLevels(activityId: string): Promise<void> {
        const { error } = await supabase.from('ActiviteNiveau').delete().eq('activite_id', activityId);
        if (error) throw error;
    }

    async addActivityLevels(links: TablesInsert<'ActiviteNiveau'>[]): Promise<void> {
        const { error } = await supabase.from('ActiviteNiveau').insert(links);
        if (error) throw error;
    }

    async updateActivityField(id: string, field: string, value: any): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .update({ [field]: value } as any)
            .eq('id', id);
        if (error) throw error;
    }

    async updateActivityLevelField(id: string, field: string, value: any): Promise<void> {
        const { error } = await supabase
            .from('ActiviteNiveau')
            .update({ [field]: value } as any)
            .eq('id', id);
        if (error) throw error;
    }

    async getCustomActivities(): Promise<Tables<'custom_activities'>[]> {
        const { data, error } = await supabase
            .from('custom_activities')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createCustomActivity(title: string, userId: string): Promise<Tables<'custom_activities'>> {
        const { data, error } = await supabase
            .from('custom_activities')
            .insert([{ title, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteCustomActivity(id: string): Promise<void> {
        const { error } = await supabase
            .from('custom_activities')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
