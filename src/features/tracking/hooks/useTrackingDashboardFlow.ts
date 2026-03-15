/**
 * @hook useTrackingDashboardFlow
 * @description Orchestre la logique métier complexe du tableau de bord de suivi (TrackingDashboard). 
 * Centralise la gestion du timer, les préférences de layout, la sélection des groupes, et l'intégration des progressions.
 * 
 * @param {Timer} timer - État actuel du minuteur global.
 * @param {Function} setTimer - Fonction pour mettre à jour le minuteur.
 * @param {boolean} showPendingOnly - Filtre pour n'afficher que les tâches en attente.
 * 
 * @example
 * const { states, actions } = useTrackingDashboardFlow(timer, setTimer, true);
 */

import { useEffect, useState } from 'react';
import { useTimerIntegration, Timer } from './useTimerIntegration';
import { useLayoutPreferences } from './useLayoutPreferences';
import { useGroupsAndStudents } from './useGroupsAndStudents';
import { useBranchesAndModules } from './useBranchesAndModules';
import { useProgressions } from './useProgressions';
import { useHelpRequests } from './useHelpRequests';
import { useAdultTracking } from './useAdultTracking';
import { useMandatoryActivities } from './useMandatoryActivities';

export function useTrackingDashboardFlow(
    timer: Timer,
    setTimer: (timer: Timer) => void,
    showPendingOnly: boolean
) {
    const timerHook = useTimerIntegration(timer);
    const groupsHook = useGroupsAndStudents();
    const layoutHook = useLayoutPreferences(groupsHook.states.selectedGroupId || '', showPendingOnly);

    useEffect(() => {
        const initLayout = async () => {
            const savedGroupId = await layoutHook.actions.loadLayoutPreferences();
            if (savedGroupId) groupsHook.actions.setSelectedGroupId(savedGroupId);
            else groupsHook.actions.setShowGroupSelector(true);
        };
        initLayout();
    }, []);

    const branchesHook = useBranchesAndModules(
        groupsHook.states.selectedStudent,
        showPendingOnly,
        groupsHook.states.selectedGroupId,
        groupsHook.states.students
    );

    const helpHook = useHelpRequests(
        groupsHook.states.students,
        groupsHook.states.selectedStudent,
        undefined
    );

    const progressionsHook = useProgressions(
        groupsHook.states.selectedStudent,
        groupsHook.states.students,
        groupsHook.states.selectedGroupId,
        branchesHook.states.activities,
        groupsHook.states.manualIndices,
        groupsHook.states.rotationSkips,
        groupsHook.actions.setRotationSkips,
        branchesHook.states.groupedProgressions,
        branchesHook.states.selectedBranchForSuivi,
        helpHook.actions.fetchHelpRequests,
        groupsHook.states.defaultLuckyCheckIndex
    );

    useEffect(() => {
        helpHook.actions.fetchHelpRequests();
    }, [groupsHook.states.students]);

    const adultHook = useAdultTracking();
    const mandatoryHook = useMandatoryActivities(groupsHook.states.selectedGroupId, groupsHook.states.students);
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);

    useEffect(() => {
        if (groupsHook.states.selectedStudent) {
            progressionsHook.actions.fetchStudentProgressions(groupsHook.states.selectedStudent.id);
        }
    }, [groupsHook.states.selectedStudent]);

    // Fullscreen Event Listener
    useEffect(() => {
        const handleFullScreenChange = () => {
            const isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            timerHook.actions.setIsFullScreen(isFullscreen);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
        };
    }, []);

    const currentView: 'students' | 'modules' = groupsHook.states.selectedStudent ? 'modules' : 'students';

    return {
        states: {
            timerHook,
            groupsHook,
            layoutHook,
            branchesHook,
            helpHook,
            progressionsHook,
            adultHook,
            mandatoryHook,
            isRandomPickerOpen,
            currentView
        },
        actions: {
            setIsRandomPickerOpen,
            setTimer
        }
    };
}
