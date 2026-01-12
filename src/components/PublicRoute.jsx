import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { isMobilePhone } from '../lib/utils';

/**
 * PublicRoute Component
 * Empêche les utilisateurs connectés d'accéder aux pages publiques (Landing, Login)
 * Redirige vers le dashboard approprié si une session existe
 */
function PublicRoute({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Error checking session in PublicRoute:', error);
                    setSession(null);
                } else {
                    setSession(session);
                }
            } catch (error) {
                console.error('Unexpected error in PublicRoute:', error);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    if (loading) {
        // Optionnel: On peut retourner null ou un petit loader pour éviter le flash
        return null;
    }

    if (session) {
        // Rediriger vers le dashboard approprié
        return isMobilePhone() ? <Navigate to="/mobile-dashboard" replace /> : <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default PublicRoute;
