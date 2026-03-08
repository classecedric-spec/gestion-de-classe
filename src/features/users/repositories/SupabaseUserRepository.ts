
import { IUserRepository } from './IUserRepository';
import { supabase } from '../../../lib/database';
import { Tables, TablesUpdate } from '../../../types/supabase';

export class SupabaseUserRepository implements IUserRepository {

    async getProfile(userId: string): Promise<Tables<'CompteUtilisateur'> | null> {
        const { data, error } = await supabase
            .from('CompteUtilisateur')
            .select('prenom, nom, validation_admin, last_selected_group_id, nom_ecole, photo_url, photo_base64, brevo_api_key')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async updateProfile(userId: string, data: Partial<TablesUpdate<'CompteUtilisateur'>>): Promise<void> {
        const { error } = await supabase
            .from('CompteUtilisateur')
            .update(data)
            .eq('id', userId);

        if (error) throw error;
    }

    async updateLastSelectedGroup(userId: string, groupId: string): Promise<void> {
        const { error } = await supabase
            .from('CompteUtilisateur')
            .update({ last_selected_group_id: groupId })
            .eq('id', userId);

        if (error) throw error;
    }

    async getUserPreferences(userId: string, key: string): Promise<any> {
        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', userId)
            .eq('key', key)
            .maybeSingle();
        return data?.value || null;
    }

    async saveUserPreferences(userId: string, key: string, value: any): Promise<void> {
        const { error } = await supabase.from('UserPreference').upsert({
            user_id: userId,
            key: key,
            value: value,
            updated_at: new Date().toISOString()
        } as any, { onConflict: 'user_id, key' });

        if (error) throw error;
    }
}
