import { supabase } from '../../../lib/database';
import { IActivityTypeRepository, ActivityType } from './IActivityTypeRepository';

/**
 * Supabase implementation of the Activity Type Repository
 */
export class SupabaseActivityTypeRepository implements IActivityTypeRepository {

    async getAll(): Promise<ActivityType[]> {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .select('*')
            .order('created_at');

        if (error) throw error;
        return (data as any) || [];
    }

    async create(label: string, userId: string): Promise<ActivityType> {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .insert([{ label, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data as any;
    }

    async bulkCreate(labels: string[], userId: string): Promise<ActivityType[]> {
        const toInsert = labels.map(label => ({ label, user_id: userId }));

        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .insert(toInsert)
            .select();

        if (error) throw error;
        return data as any;
    }

    async update(id: string, label: string): Promise<ActivityType> {
        const { data, error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .update({ label })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as any;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeActiviteAdulte' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
