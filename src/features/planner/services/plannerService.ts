import { IPlannerRepository, WeeklyPlanningItem } from '../repositories/IPlannerRepository';
import { SupabasePlannerRepository } from '../repositories/SupabasePlannerRepository';
import { TablesInsert } from '../../../types/supabase';

export class PlannerService {
    constructor(private repository: IPlannerRepository) { }

    async getPlanningForWeek(weekStartDate: string): Promise<WeeklyPlanningItem[]> {
        return await this.repository.getPlanningForWeek(weekStartDate);
    }

    async createPlanningItem(item: TablesInsert<'weekly_planning'>): Promise<WeeklyPlanningItem> {
        return await this.repository.createPlanningItem(item);
    }

    async updatePlanningItem(id: string, updates: Partial<TablesInsert<'weekly_planning'>>): Promise<void> {
        await this.repository.updatePlanningItem(id, updates);
    }

    async deletePlanningItem(id: string): Promise<void> {
        await this.repository.deletePlanningItem(id);
    }
}

export const plannerService = new PlannerService(new SupabasePlannerRepository());
