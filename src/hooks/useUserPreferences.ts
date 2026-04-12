import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/database';
import { useAuth } from './useAuth';

/**
 * Hook to manage user preferences with React Query for global synchronization.
 * This ensures that updates in one component are immediately visible in others.
 */
export function useUserPreferences<T>(key: string, defaultValue: T) {
    const { session } = useAuth();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    const queryKey = ['user_preferences', userId, key];

    // Read preference
    const { data: preference, isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!userId) return defaultValue;
            
            try {
                const { data, error } = await supabase
                    .from('UserPreference')
                    .select('value')
                    .eq('user_id', userId)
                    .eq('key', key)
                    .maybeSingle();

                if (error) {
                    console.error(`Error loading preference ${key}:`, error);
                    return defaultValue;
                }

                return (data?.value as T) ?? defaultValue;
            } catch (err) {
                console.error(`Failed to load user preference ${key}:`, err);
                return defaultValue;
            }
        },
        enabled: !!userId,
        // Keep data fresh but shareable
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Write preference
    const mutation = useMutation({
        mutationFn: async (newValue: T) => {
            if (!userId) return;

            const { error } = await supabase
                .from('UserPreference')
                .upsert({ 
                    user_id: userId, 
                    key, 
                    value: newValue,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, key' });

            if (error) throw error;
        },
        // Optimistic update
        onMutate: async (newValue: T) => {
            await queryClient.cancelQueries({ queryKey });
            const previousValue = queryClient.getQueryData<T>(queryKey);
            queryClient.setQueryData<T>(queryKey, newValue);
            return { previousValue };
        },
        // Rollback on error
        onError: (_err, _newValue, context) => {
            if (context?.previousValue !== undefined) {
                queryClient.setQueryData(queryKey, context.previousValue);
            }
        },
        // Refetch to sync with server
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const setPreference = async (newValue: T) => {
        return await mutation.mutateAsync(newValue);
    };

    return [preference ?? defaultValue, setPreference, loading] as const;
}
