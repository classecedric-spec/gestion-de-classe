import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

// Use import.meta.env for Vite environment variables
// Add type casting to satisfy TypeScript since it might not see the env shim yet
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Check your .env file.');
}

// Initialize the Supabase client with our generated types
export const supabase = createClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

/**
 * Helper to get the current authenticated user
 */
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

/**
 * Helper to check if a user is logged in
 */
export const isAuthenticated = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
};
