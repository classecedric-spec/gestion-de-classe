import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGroupRepository } from './IGroupRepository';

export class SupabaseGroupRepository implements IGroupRepository {
    async getGroups(): Promise<Tables<'Groupe'>[]> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .order('ordre', { ascending: true })
            .order('nom', { ascending: true }); // Secondary sort
        if (error) throw error;
        return data || [];
    }

    async getUserGroups(userId: string): Promise<Tables<'Groupe'>[]> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .eq('user_id', userId)
            .order('ordre', { ascending: true })
            .order('nom', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async getGroup(id: string): Promise<Tables<'Groupe'> | null> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async createGroup(group: TablesInsert<'Groupe'>): Promise<Tables<'Groupe'>> {
        const { data, error } = await supabase
            .from('Groupe')
            .insert(group)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateGroup(id: string, updates: TablesUpdate<'Groupe'>): Promise<Tables<'Groupe'>> {
        const { data, error } = await supabase
            .from('Groupe')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteGroup(id: string): Promise<void> {
        const { error } = await supabase
            .from('Groupe')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async updateOrder(id: string, order: number): Promise<void> {
        const { error } = await supabase
            .from('Groupe')
            .update({ ordre: order } as any)
            .eq('id', id);
        if (error) throw error;
    }
}
