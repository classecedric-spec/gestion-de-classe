import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/database/supabaseClient';
import { useAuth } from './useAuth';

export function useUserPreferences<T>(key: string, defaultValue: T) {
    const { session } = useAuth();
    const userId = session?.user?.id;
    
    const [preference, setPreferenceState] = useState<T>(defaultValue);
    const [loading, setLoading] = useState(true);

    const loadPreference = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('UserPreference')
                .select('value')
                .eq('user_id', userId)
                .eq('key', key)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = JSON object requested, multiple (or no) rows returned
                console.error(`Error loading preference ${key}:`, error);
                return;
            }

            if (data && data.value) {
                setPreferenceState(data.value as T);
            }
        } catch (err) {
            console.error(`Failed to load user preference ${key}:`, err);
        } finally {
            setLoading(false);
        }
    }, [userId, key]);

    useEffect(() => {
        loadPreference();
    }, [loadPreference]);

    const setPreference = async (newValue: T) => {
        // Optimistic update
        setPreferenceState(newValue);

        if (!userId) return;

        try {
            const { error } = await supabase
                .from('UserPreference')
                .upsert({ 
                    user_id: userId, 
                    key: key, 
                    value: newValue,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, key' });

            if (error) {
                console.error(`Error saving preference ${key}:`, error);
                // Revert on error? For now, we keep optimistic update
            }
        } catch (err) {
            console.error(`Failed to save user preference ${key}:`, err);
        }
    };

    return [preference, setPreference, loading] as const;
}
