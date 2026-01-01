import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom storage handler to switch between persistent (localStorage) 
// and session-only (sessionStorage) storage.
const customAuthStorage = {
    getItem: (key) => {
        // Check both locations, prioritize localStorage if it was set there previously
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    },
    setItem: (key, value) => {
        // The "rememberMe" flag is set in Auth.jsx
        const rememberMe = localStorage.getItem('sb-remember-me') === 'true';
        if (rememberMe) {
            localStorage.setItem(key, value);
        } else {
            sessionStorage.setItem(key, value);
        }
    },
    removeItem: (key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})
