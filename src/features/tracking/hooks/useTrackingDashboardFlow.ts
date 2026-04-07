/**
 * Nom du module/fichier : useTrackingDashboardFlow.ts
 * 
 * Données en entrée : 
 *   - `timer` : État du minuteur global de la classe.
 *   - `showPendingOnly` : Filtre pour n'afficher que les tâches en attente.
 * 
 * Données en sortie : 
 *   - Un objet géant regroupant tous les "sous-moteurs" (hooks spécialisés) du dashboard.
 *   - `states` : L'état civil de la classe (élèves, groupes, minuteur, demandes d'aide, etc.).
 *   - `actions` : Les fonctions pour modifier ces états.
 * 
 * Objectif principal : C'est le "Cerveau Central" du tableau de bord. Plutôt que d'avoir un fichier de 2000 lignes, nous avons séparé chaque métier (le temps, les élèves, les aides, le matériel) dans de petits modules. Ce hook `useTrackingDashboardFlow` orchestre tout ce petit monde pour qu'ils travaillent ensemble. Il s'assure par exemple que si on change d'élève, les demandes d'aide se mettent à jour.
 * 
 * Ce que ça orchestre : 
 *   - Le minuteur et le mode plein écran.
 *   - Le choix de la classe et le chargement des préférences de l'utilisateur.
 *   - La synchronisation entre les élèves sélectionnés et leurs exercices en cours.
 *   - Le lien avec les demandes d'aide et le suivi des adultes.
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

/**
 * Orchestrateur du Dashboard de suivi.
 * Centralise la logique métier complexe en combinant plusieurs hooks thématiques.
 */
export function useTrackingDashboardFlow(
    timer: Timer,
    setTimer: (timer: Timer) => void,
    showPendingOnly: boolean
) {
    // INITIALISATION DES SOUS-SYSTÈMES :
    const timerHook = useTimerIntegration(timer); // Gère le compte à rebours.
    const groupsHook = useGroupsAndStudents(); // Gère la liste des élèves.
    const layoutHook = useLayoutPreferences(groupsHook.states.selectedGroupId || '', showPendingOnly); // Gère les réglages d'affichage.

    /** 
     * DÉMARRAGE : 
     * Au chargement, on essaye de retrouver la dernière classe ouverte par l'enseignant.
     * Si on n'en trouve pas, on lui demande de choisir un groupe.
     */
    useEffect(() => {
        const initLayout = async () => {
            const savedGroupId = await layoutHook.actions.loadLayoutPreferences();
            if (savedGroupId) groupsHook.actions.setSelectedGroupId(savedGroupId);
            else groupsHook.actions.setShowGroupSelector(true);
        };
        initLayout();
    }, []);

    // Gère les matières (français, maths) et les leçons.
    const branchesHook = useBranchesAndModules(
        groupsHook.states.selectedStudent,
        showPendingOnly,
        groupsHook.states.selectedGroupId,
        groupsHook.states.students
    );

    // Gère les tickets "Besoin d'aide" ou "À vérifier".
    const helpHook = useHelpRequests(
        groupsHook.states.students,
        groupsHook.states.selectedStudent,
        undefined
    );

    // Gère l'enregistrement précis de ce que chaque élève a réussi ou raté.
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

    // RAFFRAICHISSEMENT : Si la liste des élèves change, on recalcule les demandes d'aide.
    useEffect(() => {
        helpHook.actions.fetchHelpRequests();
    }, [groupsHook.states.students]);

    const adultHook = useAdultTracking(); // Gère les intervenants adultes.
    const mandatoryHook = useMandatoryActivities(groupsHook.states.selectedGroupId, groupsHook.states.students); // Gère les priorités.
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);

    // RAFFRAICHISSEMENT : Si on clique sur un élève précis, on charge son historique personnel.
    useEffect(() => {
        if (groupsHook.states.selectedStudent) {
            progressionsHook.actions.fetchStudentProgressions(groupsHook.states.selectedStudent.id);
        }
    }, [groupsHook.states.selectedStudent]);

    /** 
     * GESTION DU PLEIN ÉCRAN : 
     * Capte quand l'enseignant passe en plein écran (TBI) pour adapter le minuteur.
     */
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

    // Détermine si on affiche la grille des portraits ou le détail d'un élève.
    const currentView: 'students' | 'modules' = groupsHook.states.selectedStudent ? 'modules' : 'students';

    // On renvoie un "Super Objet" contenant tous les outils nécessaires au Dashboard.
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : L'enseignant ouvre le dashboard. Ce hook centralise le chargement de la classe "CM1-A".
 * 2. ACTION : L'enseignant clique sur le petit bouton "Aide" d'un élève.
 * 3. TRANSMISSION : `useTrackingDashboardFlow` capte l'événement et le transmet au `progressionsHook`.
 * 4. RÉACTION : Le `progressionsHook` enregistre l'aide, puis prévient le `helpHook` pour que la liste des tickets se mette à jour à l'écran.
 * 5. SYNCHRONISATION : Tout l'écran change de manière fluide car tous les sous-systèmes sont reliés par ce "Cerveau Central".
 */
