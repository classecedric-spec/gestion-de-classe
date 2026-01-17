import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * useStudentProgress
 * 
 * Hook pour gérer les progressions d'un élève :
 * - Chargement des progressions
 * - Gestion des onglets de détail
 * - Expansion des modules/branches
 */
export const useStudentProgress = () => {
    const [studentProgress, setStudentProgress] = useState([]);
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [currentTab, setCurrentTab] = useState('infos');
    const [suiviMode, setSuiviMode] = useState('journal');
    const [showPendingOnly, setShowPendingOnly] = useState(false);

    // Expansion states
    const [expandedModules, setExpandedModules] = useState({});
    const [expandedBranches, setExpandedBranches] = useState({});
    const [expandedSubBranches, setExpandedSubBranches] = useState({});
    const [expandedTreeModules, setExpandedTreeModules] = useState({});

    // Charge les progressions d'un élève
    const fetchStudentProgress = useCallback(async (studentId, students, selectedStudent) => {
        setLoadingProgress(true);
        try {
            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    updated_at,
                    Activite (
                        id,
                        titre,
                        ordre,
                        ActiviteNiveau ( niveau_id ),
                        Module (
                            id,
                            nom,
                            statut,
                            date_fin,
                            SousBranche (
                                id,
                                nom,
                                ordre,
                                Branche (
                                    id,
                                    nom,
                                    ordre
                                )
                            )
                        )
                    )
                `)
                .eq('eleve_id', studentId);

            if (error) throw error;

            if (error) throw error;

            setStudentProgress(data || []);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoadingProgress(false);
        }
    }, []);

    // Reset progress when student changes
    const resetProgress = useCallback(() => {
        setStudentProgress([]);
        setExpandedModules({});
        setExpandedBranches({});
        setExpandedSubBranches({});
        setExpandedTreeModules({});
    }, []);

    // Toggle expansion states
    const toggleModuleExpansion = useCallback((moduleId) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    }, []);

    const toggleBranchExpansion = useCallback((branchId) => {
        setExpandedBranches(prev => ({ ...prev, [branchId]: !prev[branchId] }));
    }, []);

    const toggleSubBranchExpansion = useCallback((subBranchId) => {
        setExpandedSubBranches(prev => ({ ...prev, [subBranchId]: !prev[subBranchId] }));
    }, []);

    const toggleTreeModuleExpansion = useCallback((moduleId) => {
        setExpandedTreeModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    }, []);

    // Validation logic for Urgent Tab (adapted from useProgressions)
    const handleUrgentValidation = useCallback(async (activityId, studentId, manualIndices = {}) => {
        if (!studentId) return;

        // 1. Determine new status (Default: 'termine', but check probability for 'a_verifier')
        let newStatus = 'termine';

        // Find the activity to check its branch for manual indices
        const progressionItem = studentProgress.find(p => p.Activite?.id === activityId);
        const branchId = progressionItem?.Activite?.Module?.SousBranche?.Branche?.id;

        if (branchId) {
            const idx = manualIndices?.[studentId]?.[branchId] ?? 50; // Default 50% chance if no setting
            if (Math.random() * 100 < idx) {
                newStatus = 'a_verifier';
                // We could toast here, but UI will handle feedback
            }
        }

        // 2. Optimistic Update
        // We temporarily remove the item or update its status in the local state to make it disappear/change instantly
        const originalProgress = [...studentProgress];

        setStudentProgress(prev => prev.map(p => {
            if (p.Activite?.id === activityId) {
                return { ...p, etat: newStatus }; // Update status so it might be filtered out by the urgent view logic
            }
            return p;
        }));

        try {
            // 3. Supabase Update
            const { error } = await supabase
                .from('Progression')
                .update({
                    etat: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('eleve_id', studentId)
                .eq('activite_id', activityId);

            if (error) throw error;

            // Success! No need to do anything else as local state is already updated.
            // If newStatus is 'a_verifier', it might still show up depending on filter, but for 'urgent' (overdue), 
            // usually we just want to clear it from the 'red' list if it's done or needs check.
            // Although 'a_verifier' is technically not 'termine', the urgent tab filters for:
            // incomplete (etat !== 'termine') AND overdue.
            // So if it becomes 'a_verifier', it IS NOT 'termine', so it would STILL appear in urgent if date is past.
            // BUT, usually 'validation' implies checking it off a list.
            // Let's assume for the USER EXPERIENCE, if they click it, they dealt with it.
            // So we might want to temporarily hide it or show it as "Submitted for verification".

        } catch (error) {
            console.error("Error updating status:", error);
            // Revert
            setStudentProgress(originalProgress);
            // Optionally show error toast
        }
    }, [studentProgress]);

    return {
        studentProgress,
        loadingProgress,
        currentTab,
        setCurrentTab,
        suiviMode,
        setSuiviMode,
        showPendingOnly,
        setShowPendingOnly,
        expandedModules,
        expandedBranches,
        expandedSubBranches,
        expandedTreeModules,
        fetchStudentProgress,
        resetProgress,
        toggleModuleExpansion,
        toggleBranchExpansion,
        toggleSubBranchExpansion,
        toggleTreeModuleExpansion,
        handleUrgentValidation // Export new function
    };
};
