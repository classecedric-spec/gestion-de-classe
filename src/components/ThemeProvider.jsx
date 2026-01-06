import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'default';
        }
        return 'default';
    });

    const location = useLocation();

    useEffect(() => {
        const root = window.document.documentElement;

        // Define if we are in a public zone (not dashboard)
        // Adjust this logic if you have other protected routes not starting with /dashboard
        const isPublicZone = !location.pathname.startsWith('/dashboard');

        const applyTheme = (t) => {
            // Force default theme in public zones
            if (isPublicZone) {
                root.setAttribute('data-theme', 'default');
                return;
            }

            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            const effectiveTheme = t === 'system' ? systemTheme : t;

            if (effectiveTheme === 'dark') {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', effectiveTheme);
            }
        };

        applyTheme(theme);

        // Only persist theme if we are NOT in public zone, OR just persist what the user selected in settings 
        // (The state 'theme' holds the user preference, we just choose whether to apply it visually above)
        localStorage.setItem('theme', theme);

        if (theme === 'system' && !isPublicZone) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, location.pathname]); // Re-run when location changes

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
