import { useState, useEffect } from 'react';
import { supabase } from '../lib/database';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

/**
 * Hook for managing authentication state
 */
export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        try {
            setIsLoggingOut(true);

            // 1. Clear all application cache immediately to prevent data leaks
            // This is critical for security when switching users
            queryClient.clear();

            // 2. Sign out from Supabase
            await supabase.auth.signOut();

            // 3. Force redirect to login (optional, but safer)
            navigate('/login');

        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return { session, loading, logout, isLoggingOut };
}
