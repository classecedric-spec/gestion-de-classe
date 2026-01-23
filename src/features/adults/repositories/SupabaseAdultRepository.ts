import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IAdultRepository } from './IAdultRepository';

/**
 * Supabase implementation of the Adult Repository
 */
export class SupabaseAdultRepository implements IAdultRepository {

    async getAll(): Promise<Tables<'Adulte'>[]> {
        const { data, error } = await supabase
            .from('Adulte')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    async create(adultData: TablesInsert<'Adulte'>): Promise<Tables<'Adulte'>> {
        const { data, error } = await supabase
            .from('Adulte')
            .insert([adultData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id: string, adultData: TablesUpdate<'Adulte'>): Promise<Tables<'Adulte'>> {
        const { data, error } = await supabase
            .from('Adulte')
            .update(adultData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('Adulte')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async fetchTrackingToday(): Promise<any[]> {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('SuiviAdulte')
            .select(`
                *,
                Adulte (id, nom, prenom),
                TypeActiviteAdulte (id, label)
            `)
            .gte('created_at', today)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async addActivity(adulteId: string, activiteId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('SuiviAdulte')
            .insert([{
                adulte_id: adulteId,
                activite_id: activiteId,
                user_id: userId
            }]);

        if (error) throw error;
    }

    async deleteSuivi(id: string): Promise<void> {
        const { error } = await supabase
            .from('SuiviAdulte')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
