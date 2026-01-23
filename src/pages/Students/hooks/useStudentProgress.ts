import { useState, useCallback } from 'react';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { Tables } from '../../../types/supabase';

// Define complex types manually if needed, or use any for deeply nested joins that are hard to type with 'Tables'
// The query is quite deep: Progression -> Activite -> Module -> SousBranche -> Branche
// For now, I will use 'any' for the progress items to save time, as defining the full join type is verbose.
type ProgressionWithDetails = any;

/**
 * useStudentProgress
 * 
 * Hook pour gérer les progressions d'un élève :
 * - Chargement des progressions
 * - Gestion des onglets de détail
 * - Expansion des modules/branches
 */
export const useStudentProgress = () => {
    const [studentProgress, setStudentProgress] = useState<ProgressionWithDetails[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [currentTab, setCurrentTab] = useState('infos');
    const [suiviMode, setSuiviMode] = useState<'journal' | 'progression'>('journal');
    const [showPendingOnly, setShowPendingOnly] = useState(false);

    // Expansion states
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
    const [expandedSubBranches, setExpandedSubBranches] = useState<Record<string, boolean>>({});
    const [expandedTreeModules, setExpandedTreeModules] = useState<Record<string, boolean>>({});

    // Charge les progressions d'un élève
    const fetchStudentProgress = useCallback(async (studentId: string, _students?: any[], _selectedStudent?: any) => {
        setLoadingProgress(true);
        try {
            const data = await trackingService.fetchStudentProgressDetails(studentId);
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
    const toggleModuleExpansion = useCallback((moduleId: string) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    }, []);

    const toggleBranchExpansion = useCallback((branchId: string) => {
        setExpandedBranches(prev => ({ ...prev, [branchId]: !prev[branchId] }));
    }, []);

    const toggleSubBranchExpansion = useCallback((subBranchId: string) => {
        setExpandedSubBranches(prev => ({ ...prev, [subBranchId]: !prev[subBranchId] }));
    }, []);

    const toggleTreeModuleExpansion = useCallback((moduleId: string) => {
        setExpandedTreeModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    }, []);

    // Validation logic for Urgent Tab (adapted from useProgressions)
    const handleUrgentValidation = useCallback(async (activityId: string, studentId: string, manualIndices: any = {}) => {
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
        const originalProgress = [...studentProgress];

        setStudentProgress(prev => prev.map(p => {
            if (p.Activite?.id === activityId) {
                return { ...p, etat: newStatus };
            }
            return p;
        }));

        try {
            // 3. Status update
            if (progressionItem?.id) {
                await trackingService.updateProgressionStatus(progressionItem.id, newStatus);
            }

        } catch (error) {
            console.error("Error updating status:", error);
            // Revert
            setStudentProgress(originalProgress);
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
        handleUrgentValidation
    };
};
