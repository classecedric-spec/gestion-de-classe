import { useState, useEffect } from 'react';

export type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT';

/**
 * Hook to manage authentication form state
 */
export const useAuthForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [mode, setMode] = useState<AuthMode>('LOGIN');

    useEffect(() => {
        const savedRemember = localStorage.getItem('sb-remember-me') === 'true';
        setRememberMe(savedRemember);
    }, []);

    const toggleMode = (newMode: AuthMode) => {
        setMode(newMode);
        // Reset sensitive fields when switching modes, but keep email for convenience
        setPassword('');
        if (newMode === 'LOGIN') {
            setFullName('');
        }
    };

    return {
        email, setEmail,
        password, setPassword,
        fullName, setFullName,
        showPassword, setShowPassword,
        rememberMe, setRememberMe,
        mode, toggleMode
    };
};
