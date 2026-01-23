
import { IActivityTypeRepository } from '../../adults/repositories/IActivityTypeRepository';
import { SupabaseActivityTypeRepository } from '../../adults/repositories/SupabaseActivityTypeRepository';
import { Tables } from '../../../types/supabase';

export class ActivityTypeService {
    constructor(private repository: IActivityTypeRepository) { }

    /**
     * Fetch all activity types for adults
     */
    async fetchAdultTypes(): Promise<Tables<'TypeActiviteAdulte'>[]> {
        return await this.repository.getAll();
    }
}

export const activityTypeService = new ActivityTypeService(new SupabaseActivityTypeRepository());
