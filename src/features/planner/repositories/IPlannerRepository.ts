import { Tables, TablesInsert } from '../../../types/supabase';

export interface WeeklyPlanningItem {
    id: string;
    day_of_week: string;
    period_index: number;
    activity_title: string;
    color_code?: string;
    duration: number;
    week_start_date: string;
    user_id?: string;
    matiere_principale?: string;
    date_fin?: string;
    niveaux?: string[];
}

export interface IPlannerRepository {
    getPlanningForWeek(weekStartDate: string): Promise<WeeklyPlanningItem[]>;
    createPlanningItem(item: TablesInsert<'weekly_planning'>): Promise<WeeklyPlanningItem>;
    updatePlanningItem(id: string, updates: Partial<TablesInsert<'weekly_planning'>>): Promise<void>;
    deletePlanningItem(id: string): Promise<void>;
}
