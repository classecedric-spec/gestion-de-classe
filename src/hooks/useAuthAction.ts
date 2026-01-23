import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/database';
import { isMobilePhone } from '../lib/helpers';
import { AuthMode } from './useAuthForm';

/**
 * Hook to execute authentication actions (login, signup, reset)
 */
export const useAuthAction = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const executeAuth = async (
        mode: AuthMode,
        data: { email: string; password?: string; fullName?: string; rememberMe?: boolean }
    ) => {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'FORGOT') {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
                    redirectTo: `${window.location.origin}/dashboard/settings?tab=profil`,
                });
                if (resetError) throw resetError;
                const msg = 'Un lien de réinitialisation a été envoyé à votre adresse email.';
                setMessage(msg);
                toast.success(msg);
            } else if (mode === 'SIGNUP') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password!,
                    options: {
                        data: {
                            full_name: data.fullName,
                        },
                    },
                });
                if (signUpError) throw signUpError;
                const msg = 'Vérifiez votre boîte mail pour confirmer votre inscription !';
                setMessage(msg);
                toast.success(msg);
            } else {
                // Set the remember me flag for our custom storage handler
                localStorage.setItem('sb-remember-me', data.rememberMe ? 'true' : 'false');

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password!,
                });
                if (signInError) throw signInError;

                toast.success("Connexion réussie");

                // Redirect based on device type
                if (isMobilePhone()) {
                    navigate('/mobile-dashboard');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message || "Erreur d'authentification");
        } finally {
            setLoading(false);
        }
    };

    return {
        executeAuth,
        loading,
        error,
        message,
        clearError: () => setError(null),
        clearMessage: () => setMessage(null)
    };
};
