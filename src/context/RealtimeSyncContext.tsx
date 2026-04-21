import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/database';

const RealtimeSyncContext = createContext<null>(null);

/**
 * RealtimeSyncProvider
 *
 * Fournit une synchronisation globale de la base de données.
 * Écoute TOUS les changements postgres du schéma public et invalide les queries
 * React Query associées pour maintenir l'UI à jour sur tous les onglets ouverts.
 *
 * BOUCLIER ANTI-ÉCHO :
 * Après chaque mutation locale réussie, un "cooldown" de COOLDOWN_MS est appliqué.
 * Durant ce laps de temps, les notifications Supabase correspondant à NOS PROPRES
 * changements sont ignorées car l'UI est déjà à jour grâce à l'Optimistic UI.
 * Cela élimine le "saut arrière" visuel causé par l'écho du serveur.
 */

/** Durée du bouclier après une mutation locale réussie (en ms). */
const COOLDOWN_MS = 1500;

export const RealtimeSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const [userId, setUserId] = React.useState<string | null>(null);

    // Référence mutable au timestamp du dernier succès local.
    // On utilise useRef (pas useState) pour ne pas déclencher de re-render.
    const lastLocalMutationTime = useRef<number>(0);

    // Track user authentication state
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

        // ABONNEMENT AU CACHE DES MUTATIONS :
        // On écoute TOUTES les mutations de l'application globalement.
        // Dès qu'une mutation passe à "success", on note l'heure exacte.
        const unsubMutationCache = queryClient.getMutationCache().subscribe((event) => {
            if (event?.mutation?.state?.status === 'success') {
                lastLocalMutationTime.current = Date.now();
            }
        });

        // Debounce map pour éviter les invalidations trop rapides
        const invalidationTimers: Record<string, NodeJS.Timeout> = {};

        // Canal unique pour tous les changements de schéma public
        const channel = supabase
            .channel('global-sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                },
                (payload) => {
                    // BOUCLIER ANTI-ÉCHO :
                    // Si une mutation locale vient de réussir dans les COOLDOWN_MS dernières ms,
                    // c'est probablement l'écho de NOTRE propre action. L'UI est déjà à jour
                    // grâce à l'Optimistic UI → on ignore le signal du serveur.
                    const timeSinceLastLocal = Date.now() - lastLocalMutationTime.current;
                    if (timeSinceLastLocal < COOLDOWN_MS) {
                        console.log(
                            `[RealtimeSync] Écho ignoré pour "${payload.table}" ` +
                            `(${timeSinceLastLocal}ms après action locale) — UI déjà à jour.`
                        );
                        return;
                    }

                    // Signal externe (autre appareil, autre utilisateur) → on invalide
                    console.log('[RealtimeSync] Changement externe détecté:', payload.table, payload.eventType);

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
                        'PlanificationHebdo': ['weekly_planning', 'dashboard-stats'],
                        'custom_activities': ['weekly_planning', 'dashboard-stats'],
                        'CompteUtilisateur': ['user', 'user-preferences'],
                        'UserPreference': ['user-preferences'],
                        'ActiviteMateriel': ['activities', 'modules'],
                        'Adulte': ['classes'],
                        'ClasseAdulte': ['classes'],
                        'TypeActiviteAdulte': ['activity-types'],
                        'SuiviAdulte': ['adult-tracking'],
                        'SousDomaine': ['branches', 'dashboard-stats'],
                        'TypeMateriel': ['activities', 'modules'],
                        'EvaluationRegroupement': ['evaluation_regroupements', 'evaluations']
                    };

                    const keysToInvalidate = tableToQueryKey[payload.table as string] || [];

                    keysToInvalidate.forEach(key => {
                        // Debounce de 100ms pour éviter les invalidations en rafale
                        if (invalidationTimers[key]) clearTimeout(invalidationTimers[key]);

                        invalidationTimers[key] = setTimeout(() => {
                            queryClient.invalidateQueries({ queryKey: [key] });
                            delete invalidationTimers[key];
                        }, 100);
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[RealtimeSync] Connecté en tant que user ${userId}`);
                }
            });

        return () => {
            unsubMutationCache();
            supabase.removeChannel(channel);
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
