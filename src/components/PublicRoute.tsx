import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/database';
import { isMobilePhone } from '../lib/helpers';
import type { Session } from '@supabase/supabase-js';

interface PublicRouteProps {
    children: ReactNode;
}

/**
 * PublicRoute Component
 * Empêche les utilisateurs connectés d'accéder aux pages publiques (Landing, Login)
 * Redirige vers le dashboard approprié si une session existe
 */
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);

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
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // if (loading) {
    //     return null;
    // }

    if (session) {
        // Rediriger vers le dashboard approprié
        return isMobilePhone() ? <Navigate to="/mobile-dashboard" replace /> : <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default PublicRoute;
