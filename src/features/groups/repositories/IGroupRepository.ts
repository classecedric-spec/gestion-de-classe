import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export interface IGroupRepository {
    getGroups(): Promise<Tables<'Groupe'>[]>;
    getUserGroups(userId: string): Promise<Tables<'Groupe'>[]>;
    getGroup(id: string): Promise<Tables<'Groupe'> | null>;
    createGroup(group: TablesInsert<'Groupe'>): Promise<Tables<'Groupe'>>;
    updateGroup(id: string, updates: TablesUpdate<'Groupe'>): Promise<Tables<'Groupe'>>;
    deleteGroup(id: string): Promise<void>;
    updateOrder(id: string, order: number): Promise<void>;
}
