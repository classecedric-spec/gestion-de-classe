

import { Tables, TablesUpdate } from '../../../types/supabase';

export interface IUserRepository {
    getProfile(userId: string): Promise<Tables<'CompteUtilisateur'> | null>;
    updateProfile(userId: string, data: Partial<TablesUpdate<'CompteUtilisateur'>>): Promise<void>;
    updateLastSelectedGroup(userId: string, groupId: string): Promise<void>;
    getUserPreferences(userId: string, key: string): Promise<any>;
    saveUserPreferences(userId: string, key: string, value: any): Promise<void>;
}
