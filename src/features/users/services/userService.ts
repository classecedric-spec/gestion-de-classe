
import { IUserRepository } from '../repositories/IUserRepository';
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository';
import { Tables, TablesUpdate } from '../../../types/supabase';

export class UserService {
    constructor(private repository: IUserRepository) { }

    /**
     * Fetch user profile by ID
     */
    async getProfile(userId: string): Promise<Tables<'CompteUtilisateur'> | null> {
        return await this.repository.getProfile(userId);
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: Partial<TablesUpdate<'CompteUtilisateur'>>): Promise<void> {
        return await this.repository.updateProfile(userId, data);
    }

    /**
     * Update last selected group for user
     */
    async updateLastSelectedGroup(userId: string, groupId: string): Promise<void> {
        return await this.repository.updateLastSelectedGroup(userId, groupId);
    }

    /**
     * Get user preference by key
     */
    async getUserPreferences(userId: string, key: string): Promise<any> {
        return await this.repository.getUserPreferences(userId, key);
    }

    /**
     * Save user preference
     */
    async saveUserPreferences(userId: string, key: string, value: any): Promise<void> {
        return await this.repository.saveUserPreferences(userId, key, value);
    }
}

export const userService = new UserService(new SupabaseUserRepository());
