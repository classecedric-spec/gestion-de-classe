import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute Component
 * Protège les routes nécessitant une authentification
 * Redirige vers /login si l'utilisateur n'est pas connecté
 */
function ProtectedRoute({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Vérifier la session au montage
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error checking session:', error);
                    setUser(null);
                } else {
                    setUser(session?.user || null);
                }
            } catch (error) {
                console.error('Unexpected error:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Écouter les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            setLoading(false);
        });

        // Cleanup
        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // Afficher un loader pendant la vérification
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-grey-medium text-sm">Vérification de la session...</p>
                </div>
            </div>
        );
    }

    // Rediriger vers login si pas d'utilisateur
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Rendre les enfants si authentifié
    return children;
}

export default ProtectedRoute;
