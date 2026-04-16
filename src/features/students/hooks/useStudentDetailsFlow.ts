/**
 * Nom du module/fichier : useStudentDetailsFlow.ts
 * 
 * Données en entrée : 
 *   - selectedStudent : L'objet complet de l'élève actuellement consulté.
 *   - students : La liste de tous les élèves de la classe (pour comparaison).
 *   - handleUpdateImportance : Fonction permettant de modifier le niveau d'alerte (importance) de l'élève.
 * 
 * Données en sortie : 
 *   - states : Un regroupement d'états (progrès, activités en retard, branches/matières, onglet actif).
 *   - actions : Un ensemble de fonctions (changer d'onglet, valider un travail, générer un bilan PDF).
 * 
 * Objectif principal : Agir comme le "chef d'orchestre" du panneau de détails (la colonne de droite). Ce Hook est un agrégateur : il rassemble plusieurs outils spécialisés (suivi pédagogique, calcul des urgences, génération de PDF) pour offrir une interface unique et simplifiée au composant visuel. Son rôle crucial est de s'assurer que dès qu'un enseignant clique sur un nouvel élève, l'intégralité de ses statistiques et de son historique de travail est rechargée instantanément.
 * 
 * Ce que ça affiche : Rien (fournisseur de données pour le composant `StudentDetailsColumn`).
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudentProgress } from '../../tracking/hooks/useStudentProgress';
import { useBranchIndices } from '../../tracking/hooks/useBranchIndices';
import { useUrgentWork } from '../../tracking/hooks/useUrgentWork';
import { useStudentPDF } from '../hooks/useStudentPDF';
import { useOverdueLogger } from '../../tracking/hooks/useOverdueLogger';

/**
 * Orchestre la logique métier complexe du panneau de détails d'un élève.
 */
export function useStudentDetailsFlow(
    selectedStudent: any,
    students: any[],
    handleUpdateImportance: (val: string) => void,
    // Persisted Tabs Props
    activeTab?: string,
    onActiveTabChange?: (tabId: string) => void,
    suiviModeProp?: 'journal' | 'progression',
    onSuiviModeChange?: (mode: 'journal' | 'progression') => void
) {
    const location = useLocation();

    /**
     * AGRÉGATION D'OUTILS :
     * Au lieu de manipuler de nombreux hooks disparates dans la vue, 
     * on les centralise ici pour offrir une vision cohérente du dossier de l'élève.
     */
    
    // Suivi des progrès scolaires (Ateliers validés, en cours, etc.)
    const {
        studentProgress, loadingProgress, currentTab, setCurrentTab,
        suiviMode, setSuiviMode, showPendingOnly, setShowPendingOnly,
        expandedModules,
        fetchStudentProgress, resetProgress,
        toggleModuleExpansion,
        handleUrgentValidation,
        handleResetActivity
    } = useStudentProgress(activeTab, onActiveTabChange, suiviModeProp, onSuiviModeChange);

    // Gestion des matières (Branches) et des indicateurs de réussite
    const {
        branches, studentIndices, fetchBranches, loadUserPreferences, handleUpdateBranchIndex
    } = useBranchIndices();

    // Analyse des travaux prioritaires (retards, urgences)
    const { modules: sortedModules, count: totalOverdueCount, hasWork: hasOverdueWork } = useUrgentWork(studentProgress);
    
    // Moteur de génération de bilans PDF
    const { generatePDF } = useStudentPDF();

    // Journalisation automatique des retards (pour analyse)
    useOverdueLogger(loadingProgress, selectedStudent, studentProgress);

    /**
     * INITIALISATION GLOBALE :
     * Au démarrage du module, on charge les matières scolaires et les préférences du professeur.
     */
    useEffect(() => {
        fetchBranches();
        loadUserPreferences();
    }, []);

    /**
     * SYNCHRONISATION INDIVIDUELLE :
     * Chaque fois que l'enseignant change d'élève (clic dans la liste), 
     * on réinitialise l'affichage et on va chercher les progrès spécifiques de cet enfant.
     */
    useEffect(() => {
        if (selectedStudent) {
            // Chargement des données pédagogiques
            fetchStudentProgress(selectedStudent.id, students, selectedStudent);

            // Gestion de l'onglet de départ uniquement si spécifié explicitement dans le state (ex: lien direct)
            if (location.state?.initialTab && location.state?.selectedStudentId === selectedStudent.id) {
                setCurrentTab(location.state.initialTab);
            }
            resetProgress();
        } else {
            resetProgress();
        }
    }, [selectedStudent, selectedStudent?.id, students]);

    /**
     * On renvoie le tout sous forme de deux paquets clairs : ce qu'on "voit" (states) et ce qu'on peut "faire" (actions).
     */
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
/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur "Léo" dans le trombinoscope de gauche.
 * 2. Le Hook `useStudentDetailsFlow` capte l'arrivée du nouvel élève.
 * 3. Il lance instantanément les requêtes : 
 *    - "Quels sont les ateliers déjà validés par Léo ?"
 *    - "Quels sont ses travaux urgents pour cette semaine ?"
 * 4. Le Hook prépare également les indicateurs (matières) pour afficher les graphiques de réussite.
 * 5. L'enseignant voit alors le panneau de droite s'animer pour afficher le portrait de Léo et son statut.
 * 6. Si l'enseignant clique sur un bouton de validation, ce Hook transmet l'ordre au moteur de suivi 
 *    et rafraîchit les statistiques de Léo en temps réel.
 * 7. Si le professeur clique enfin sur "Générer PDF", ce Hook orchestre la mise en page du bilan.
 */
