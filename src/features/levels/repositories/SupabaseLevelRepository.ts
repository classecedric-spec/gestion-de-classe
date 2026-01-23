import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { LevelWithStudentCount } from '../../../types';
import { ILevelRepository } from './ILevelRepository';

export class SupabaseLevelRepository implements ILevelRepository {
    async getLevels(): Promise<LevelWithStudentCount[]> {
        const { data, error } = await supabase
            .from('Niveau')
            .select('*, Eleve(count)')
            .order('ordre', { ascending: true });

        if (error) throw error;
        return (data as unknown as LevelWithStudentCount[]) || [];
    }

    async getStudentsByLevel(levelId: string): Promise<Tables<'Eleve'>[]> {
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('niveau_id', levelId)
            .order('nom', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async createLevel(level: TablesInsert<'Niveau'>): Promise<LevelWithStudentCount> {
        // userId is expected to be part of level object or we fetch context?
        // In the service, the original code fetched auth user.
        // Repository should be mostly pure data access.
        // However, RLS might require context, but here we insert with user_id provided.
        // Let's assume the Service provides the corrected user_id in 'level' object.

        const { data, error } = await supabase
            .from('Niveau')
            .insert([level])
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data as unknown as LevelWithStudentCount;
    }

    async updateLevel(id: string, updates: TablesUpdate<'Niveau'>): Promise<LevelWithStudentCount> {
        const { data, error } = await supabase
            .from('Niveau')
            .update(updates)
            .eq('id', id)
            .select('*, Eleve(count)')
            .single();

        if (error) throw error;
        return data as unknown as LevelWithStudentCount;
    }

    async deleteLevel(id: string): Promise<void> {
        const { error } = await supabase
            .from('Niveau')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async updateOrders(updates: TablesUpdate<'Niveau'>[]): Promise<void> {
        const { error } = await supabase
            .from('Niveau')
            .upsert(updates as TablesInsert<'Niveau'>[], { onConflict: 'id' });
        if (error) throw error;
    }

    async getMaxOrder(): Promise<number> {
        const { data } = await supabase
            .from('Niveau')
            .select('ordre')
            .order('ordre', { ascending: false })
            .limit(1);

        return (data && data.length > 0) ? (data[0].ordre || 0) : 0;
    }
}
