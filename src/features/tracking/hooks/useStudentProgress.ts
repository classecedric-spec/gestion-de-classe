/**
 * Nom du module/fichier : useStudentProgress.ts
 * 
 * Données en entrée : 
 *   - `studentId` : L'identifiant de l'élève dont on veut voir le détail.
 * 
 * Données en sortie : 
 *   - `studentProgress` : Liste complète de ses réussites, échecs et travaux en cours.
 *   - `currentTab` / `suiviMode` : Réglages d'affichage (Infos, Journal de bord, Arbre de progression).
 *   - `expandedModules/Branches` : État d'ouverture des dossiers (pour ne pas tout voir en même temps).
 *   - `actions` : Fonctions pour charger les données, valider un exercice ou réinitialiser un travail.
 * 
 * Objectif principal : Gérer la "Fiche Individuelle" de l'élève. C'est ici que l'enseignant vient voir précisément où en est un enfant. Ce hook orchestre l'affichage du parcours de l'élève, permet de naviguer entre ses différentes matières (Français, Maths...) et offre des outils pour valider manuellement des exercices oraux ou pratiques.
 * 
 * Ce que ça contient : 
 *   - Le chargement ultra-détaillé de la progression (jointures entre Exercices, Chapitres et Matières).
 *   - La mémorisation de ce qui est "ouvert" ou "fermé" à l'écran pour garder une interface propre.
 *   - Une logique de validation "Optimiste" : l'interface change instantanément quand on clique, et le serveur est prévenu en arrière-plan.
 *   - L'intégration de la "Probabilité de contrôle" : lors d'une validation, le logiciel décide si l'exercice doit être vérifié par l'enseignant (🟣) ou s'il est validé d'office (✅).
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { trackingService } from '../services/trackingService';

/**
 * Type complexe représentant une ligne de progression avec toutes ses infos rattachées.
 */
type ProgressionWithDetails = any;

/**
 * Hook de pilotage de la fiche de progression individuelle.
 */
export const useStudentProgress = (
    externalTab?: string,
    setExternalTab?: (tab: string) => void,
    externalSuiviMode?: 'journal' | 'progression',
    setExternalSuiviMode?: (mode: 'journal' | 'progression') => void
) => {
    // ÉTATS : Données et Chargement
    const [studentProgress, setStudentProgress] = useState<ProgressionWithDetails[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);
    
    // ÉTATS : Navigation dans la fiche (Internes si non fournis)
    const [internalTab, setInternalTab] = useState('infos');
    const [internalSuiviMode, setInternalSuiviMode] = useState<'journal' | 'progression'>('journal');
    
    // Mapping vers l'extérieur ou l'intérieur
    const currentTab = externalTab !== undefined ? externalTab : internalTab;
    const setCurrentTab = setExternalTab || setInternalTab;
    const suiviMode = externalSuiviMode !== undefined ? externalSuiviMode : internalSuiviMode;
    const setSuiviMode = setExternalSuiviMode || setInternalSuiviMode;

    const [showPendingOnly, setShowPendingOnly] = useState(false);

    // ÉTATS : "Accordéons" (Gestion de ce qui est déplié à l'écran)
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
    const [expandedSubBranches, setExpandedSubBranches] = useState<Record<string, boolean>>({});
    const [expandedTreeModules, setExpandedTreeModules] = useState<Record<string, boolean>>({});

    /** 
     * ACTION : Charger le dossier de l'élève.
     */
    const fetchStudentProgress = useCallback(async (studentId: string, _students?: any[], _selectedStudent?: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setLoadingProgress(true);
        try {
            const data = await trackingService.fetchStudentProgressDetails(studentId, user.id);
            setStudentProgress(data || []);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoadingProgress(false);
        }
    }, []);

    /** 
     * ACTION : Tout refermer quand on change d'élève.
     */
    const resetProgress = useCallback(() => {
        setStudentProgress([]);
        setExpandedModules({});
        setExpandedBranches({});
        setExpandedSubBranches({});
        setExpandedTreeModules({});
    }, []);

    // FONCTIONS : Ouvrir/Fermer une matière ou un chapitre.
    const toggleModuleExpansion = useCallback((moduleId: string) => { setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] })); }, []);
    const toggleBranchExpansion = useCallback((branchId: string) => { setExpandedBranches(prev => ({ ...prev, [branchId]: !prev[branchId] })); }, []);
    const toggleSubBranchExpansion = useCallback((subBranchId: string) => { setExpandedSubBranches(prev => ({ ...prev, [subBranchId]: !prev[subBranchId] })); }, []);
    const toggleTreeModuleExpansion = useCallback((moduleId: string) => { setExpandedTreeModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] })); }, []);

    /** 
     * ACTION : Valider un exercice en urgence.
     * Applique la logique de "Tirage au sort" : faut-il que le prof vérifie ?
     */
    const handleUrgentValidation = useCallback(async (activityId: string, studentId: string, manualIndices: any = {}) => {
        if (!studentId) return;

        let newStatus = 'termine'; // Statut par défaut : ✅ Terminé

        // On cherche la matière de cet exercice pour connaître la probabilité de contrôle.
        const progressionItem = studentProgress.find(p => p.Activite?.id === activityId);
        const branchId = progressionItem?.Activite?.Module?.SousBranche?.Branche?.id;

        if (branchId) {
            const idx = manualIndices?.[studentId]?.[branchId] ?? 50; 
            // TIRAGE AU SORT : Si le score est faible, on a plus de chances de tomber sur "À vérifier" (🟣).
            if (Math.random() * 100 < idx) {
                newStatus = 'a_verifier';
            }
        }

        // MISE À JOUR OPTIMISTE : On change l'écran avant même d'avoir la réponse du serveur.
        const originalProgress = [...studentProgress];
        setStudentProgress(prev => prev.map(p => {
            if (p.Activite?.id === activityId) return { ...p, etat: newStatus };
            return p;
        }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non authentifié.");
            if (progressionItem?.id) await trackingService.updateProgressionStatus(progressionItem.id, newStatus, user.id);
        } catch (error) {
            console.error("Error", error);
            setStudentProgress(originalProgress); // En cas d'erreur de réseau, on remet l'ancien état.
        }
    }, [studentProgress]);

    /** 
     * ACTION : Remettre un exercice à zéro (ex: l'élève s'est trompé de bouton).
     */
    const handleResetActivity = useCallback(async (progressionId: string) => {
        if (!progressionId) return;
        const originalProgress = [...studentProgress];
        setStudentProgress(prev => prev.map(p => {
            if (p.id === progressionId) return { ...p, etat: 'a_commencer' };
            return p;
        }));
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non authentifié.");
            await trackingService.updateProgressionStatus(progressionId, 'a_commencer', user.id);
        } catch (error) {
            setStudentProgress(originalProgress);
        }
    }, [studentProgress]);

    return {
        studentProgress, loadingProgress, currentTab, setCurrentTab, suiviMode, setSuiviMode, showPendingOnly, setShowPendingOnly,
        expandedModules, expandedBranches, expandedSubBranches, expandedTreeModules,
        fetchStudentProgress, resetProgress, toggleModuleExpansion, toggleBranchExpansion, toggleSubBranchExpansion, toggleTreeModuleExpansion,
        handleUrgentValidation, handleResetActivity
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant clique sur "Julie".
 * 2. CHARGEMENT : Le hook `useStudentProgress` va chercher ses 200 lignes de travail.
 * 3. NAVIGATION : L'enseignant clique sur l'onglet "Arbre". `setSuiviMode` passe en mode visuel.
 * 4. CONSULTATION : L'enseignant déplie la branche "Maths". `toggleBranchExpansion` s'active.
 * 5. VALIDATION : Julie vient montrer son cahier. L'enseignant clique sur la coche. 
 * 6. CALCUL : Le logiciel fait un tirage. Pas de chance, Julie doit être contrôlée. L'icône devient violette (🟣).
 */
