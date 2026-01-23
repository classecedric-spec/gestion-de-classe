import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark' | 'system' | 'default';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            return (savedTheme as Theme) || 'default';
        }
        return 'default';
    });

    const location = useLocation();

    useEffect(() => {
        const root = window.document.documentElement;

        // Define if we are in a public zone (not dashboard)
        const isPublicZone = !location.pathname.startsWith('/dashboard');

        const applyTheme = (t: Theme) => {
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

        localStorage.setItem('theme', theme);

        if (theme === 'system' && !isPublicZone) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, location.pathname]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
