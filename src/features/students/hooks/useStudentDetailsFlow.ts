/**
 * @hook useStudentDetailsFlow
 * @description Orchestre la logique métier complexe du panneau de détails d'un élève.
 * Centralise le suivi pédagogique, les indices de performance, la génération de PDF et la gestion des onglets.
 * 
 * @param {any} selectedStudent - L'élève actuellement sélectionné.
 * @param {any[]} students - Liste complète des élèves du groupe.
 * @param {Function} handleUpdateImportance - Callback pour mettre à jour l'importance globale.
 * 
 * @example
 * const { states, actions } = useStudentDetailsFlow(selectedStudent, students, updateImportance);
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudentProgress } from '../../tracking/hooks/useStudentProgress';
import { useBranchIndices } from '../../tracking/hooks/useBranchIndices';
import { useUrgentWork } from '../../tracking/hooks/useUrgentWork';
import { useStudentPDF } from '../hooks/useStudentPDF';
import { useOverdueLogger } from '../../tracking/hooks/useOverdueLogger';

export function useStudentDetailsFlow(
    selectedStudent: any,
    students: any[],
    handleUpdateImportance: (val: string) => void
) {
    const location = useLocation();

    const {
        studentProgress, loadingProgress, currentTab, setCurrentTab,
        suiviMode, setSuiviMode, showPendingOnly, setShowPendingOnly,
        expandedModules,
        fetchStudentProgress, resetProgress,
        toggleModuleExpansion,
        handleUrgentValidation,
        handleResetActivity
    } = useStudentProgress();

    const {
        branches, studentIndices, fetchBranches, loadUserPreferences, handleUpdateBranchIndex
    } = useBranchIndices();

    const { modules: sortedModules, count: totalOverdueCount, hasWork: hasOverdueWork } = useUrgentWork(studentProgress);
    const { generatePDF } = useStudentPDF();

    useOverdueLogger(loadingProgress, selectedStudent, studentProgress);

    // Initialize Global Data (Branches)
    useEffect(() => {
        fetchBranches();
        loadUserPreferences();
    }, []);

    // Sync student-specific data
    useEffect(() => {
        if (selectedStudent) {
            fetchStudentProgress(selectedStudent.id, students, selectedStudent);

            if (location.state?.initialTab && location.state?.selectedStudentId === selectedStudent.id) {
                setCurrentTab(location.state.initialTab);
            } else {
                setCurrentTab('infos');
            }
            resetProgress();
        } else {
            resetProgress();
        }
    }, [selectedStudent, selectedStudent?.id, students]);

    return {
        states: {
            studentProgress,
            loadingProgress,
            currentTab,
            suiviMode,
            showPendingOnly,
            expandedModules,
            branches,
            studentIndices,
            sortedModules,
            totalOverdueCount,
            hasOverdueWork
        },
        actions: {
            setCurrentTab,
            setSuiviMode,
            setShowPendingOnly,
            toggleModuleExpansion,
            handleUrgentValidation,
            handleUpdateImportance,
            handleUpdateBranchIndex,
            generatePDF,
            handleResetActivity
        }
    };
}
