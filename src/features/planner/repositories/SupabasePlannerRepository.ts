import { supabase } from '../../../lib/database';
import { IPlannerRepository, WeeklyPlanningItem } from './IPlannerRepository';
import { TablesInsert } from '../../../types/supabase';

export class SupabasePlannerRepository implements IPlannerRepository {
    async getPlanningForWeek(weekStartDate: string): Promise<WeeklyPlanningItem[]> {
        const { data } = await supabase
            .from('weekly_planning')
            .select('*')
            .eq('week_start_date', weekStartDate);
        return (data as WeeklyPlanningItem[]) || [];
    }

    async createPlanningItem(item: TablesInsert<'weekly_planning'>): Promise<WeeklyPlanningItem> {
        const { data, error } = await supabase
            .from('weekly_planning')
            .insert([item])
            .select()
            .single();

        if (error) throw error;
        return data as WeeklyPlanningItem;
    }

    async updatePlanningItem(id: string, updates: Partial<TablesInsert<'weekly_planning'>>): Promise<void> {
        const { error } = await supabase
            .from('weekly_planning')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    }

    async deletePlanningItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('weekly_planning')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
