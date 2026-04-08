import React, { createContext, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/database';

const RealtimeSyncContext = createContext<null>(null);

/**
 * RealtimeSyncProvider
 * 
 * Provides global database synchronization.
 * Listens to ALL postgres changes in the public schema and invalidates related 
 * React Query queries to keep the UI up-to-date across all open tabs.
 */
export const RealtimeSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const [userId, setUserId] = React.useState<string | null>(null);

    // Track user authentication state to provide context for query keys
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user.id || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user.id || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!userId) return;

        // Debounce map to avoid rapid duplicate invalidations
        const invalidationTimers: Record<string, NodeJS.Timeout> = {};

        // Create a single channel for all public schema changes
        const channel = supabase
            .channel('global-sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                },
                (payload) => {
                    console.log('Realtime change detected:', payload.table, payload.eventType);

                    // Invalidate specific queries based on the table name
                    const tableToQueryKey: Record<string, string[]> = {
                        'Eleve': ['students', 'students-in-class', 'attendance', 'dashboard-stats', 'evaluation_results'],
                        'Groupe': ['groups', 'students', 'dashboard-stats', 'evaluations'],
                        'EleveGroupe': ['students', 'groups', 'students-in-class', 'dashboard-stats'],
                        'Progression': ['progressions', 'students', 'dashboard-stats', 'vue-retard-progressions', 'all-incomplete-progressions-strict-v2'],
                        'Classe': ['classes', 'students', 'groups', 'students-in-class', 'dashboard-stats'],
                        'Module': ['modules', 'dashboard-stats', 'activities'],
                        'Activite': ['activities', 'modules', 'dashboard-stats'],
                        'ActiviteNiveau': ['activities'],
                        'Branche': ['branches', 'dashboard-stats', 'evaluations'],
                        'SousBranche': ['branches', 'dashboard-stats'],
                        'Niveau': ['niveaux', 'students', 'activities', 'dashboard-stats'],
                        // Corrections des noms de table
                        'Attendance': ['attendance', 'dashboard-stats'],
                        'SetupPresence': ['attendance-setup', 'dashboard-stats'],
                        'CategoriePresence': ['attendance-categories', 'dashboard-stats'],
                        'Responsabilite': ['responsibilities'],
                        'ResponsabiliteEleve': ['responsibilities'],
                        'Evaluation': ['evaluations', 'evaluation_results', 'dashboard-stats', 'all_evaluations_detailed'],
                        'EvaluationQuestion': ['evaluation_questions'],
                        'Resultat': ['evaluation_results', 'dashboard-stats'],
                        'ResultatQuestion': ['question_results', 'evaluation_results'],
                        'TypeNote': ['note_types'],
                        'weekly_planning': ['weekly_planning', 'dashboard-stats'],
                        'Devoirs': ['devoirs', 'dashboard-stats'],
                        // Ajout des tables potentiellement manquantes pour la planification ou autres
                        'PlanificationHebdo': ['weekly_planning', 'dashboard-stats'],
                        'custom_activities': ['weekly_planning', 'dashboard-stats'],
                        'CompteUtilisateur': ['user', 'user-preferences'],
                        'UserPreference': ['user-preferences'],
                        'ActiviteMateriel': ['activities', 'modules'],
                        'Adulte': ['classes'],
                        'ClasseAdulte': ['classes'],
                        'SousDomaine': ['branches', 'dashboard-stats'],
                        'TypeMateriel': ['activities', 'modules']
                    };

                    const keysToInvalidate = tableToQueryKey[payload.table as string] || [];

                    keysToInvalidate.forEach(key => {
                        // Debounce invalidation by 100ms
                        if (invalidationTimers[key]) clearTimeout(invalidationTimers[key]);

                        invalidationTimers[key] = setTimeout(() => {
                            // Invalidate any query starting with this key
                            queryClient.invalidateQueries({ queryKey: [key] });
                            delete invalidationTimers[key];
                        }, 100);
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Global Realtime Sync: Subscribed as user ${userId}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            // Cleanup timers
            Object.values(invalidationTimers).forEach(clearTimeout);
        };
    }, [queryClient, userId]);

    return (
        <RealtimeSyncContext.Provider value={null}>
            {children}
        </RealtimeSyncContext.Provider>
    );
};

export const useRealtimeSync = () => useContext(RealtimeSyncContext);
