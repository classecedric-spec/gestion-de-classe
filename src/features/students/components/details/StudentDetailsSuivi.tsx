/**
 * Nom du module/fichier : StudentDetailsSuivi.tsx
 * 
 * Données en entrée : Les progrès de l'élève, l'état de chargement, et les fonctions pour changer de mode de vue ou valider une activité.
 * 
 * Données en sortie : Une interface de suivi pédagogique permettant de voir l'historique des activités de l'élève.
 * 
 * Objectif principal : Offrir une vue d'ensemble sur le travail accompli par l'élève. Le professeur peut basculer entre un "Journal" (liste chronologique) et une vue "Progression". Il peut également filtrer pour ne voir que les activités "En cours" (celles qui n'ont pas encore été validées comme acquises).
 * 
 * Ce que ça affiche : Des onglets de sélection de mode (Journal/Progression), des filtres de statut, et la liste détaillée des activités via le sous-composant `StudentJournalView`.
 */

import React from 'react';
import { LayoutList, GitGraph, Activity, Loader2 } from 'lucide-react';
import { Tabs } from '../../../../core';
import { StudentJournalView } from '../../../tracking/components/StudentJournalView';
import { StudentDetailsProgressionSummary } from './StudentDetailsProgressionSummary';

interface StudentDetailsSuiviProps {
    studentProgress: any[];
    loadingProgress: boolean;
    suiviMode: 'journal' | 'progression';
    setSuiviMode: (mode: 'journal' | 'progression') => void;
    showPendingOnly: boolean;
    setShowPendingOnly: (show: boolean) => void;
    expandedModules: Record<string, boolean>;
    toggleModuleExpansion: (moduleId: string) => void;
    handleUrgentValidation: (activityId: string, studentId: string, studentIndices: any) => void;
    handleResetActivity: (progressionId: string) => void;
}

export const StudentDetailsSuivi: React.FC<StudentDetailsSuiviProps> = ({
    studentProgress,
    loadingProgress,
    suiviMode,
    setSuiviMode,
    showPendingOnly,
    setShowPendingOnly,
    expandedModules,
    toggleModuleExpansion,
    handleUrgentValidation,
    handleResetActivity
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-start gap-2 mb-6">
                {/* Sélecteur de mode principal : permet de choisir comment visualiser les données (historique ou graphique de progression). */}
                <Tabs
                    tabs={[
                        { id: 'journal', label: 'Journal', icon: LayoutList },
                        { id: 'progression', label: 'Progression', icon: GitGraph }
                    ]}
                    activeTab={suiviMode}
                    onChange={(tabId) => setSuiviMode(tabId as 'journal' | 'progression')}
                    level={3}
                    smart
                />

                {suiviMode === 'journal' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                        {/* Filtre rapide : permet à l'enseignant de se concentrer uniquement sur ce qui est 'En cours' pour aider l'élève à terminer ses tâches. */}
                        <Tabs
                            tabs={[
                                { id: 'pending', label: 'En cours', icon: Activity, variant: 'warning' },
                                { id: 'all', label: 'Tout voir', icon: LayoutList, variant: 'primary' }
                            ]}
                            activeTab={showPendingOnly ? 'pending' : 'all'}
                            onChange={(tabId) => setShowPendingOnly(tabId === 'pending')}
                            level={3}
                            smart
                        />
                    </div>
                )}
            </div>

            {loadingProgress ? (
                /* Indicateur d'attente : une icône animée s'affiche pendant que le système récupère les dernières données de suivi sur le serveur. */
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
            ) : studentProgress.length === 0 ? (
                <div className="text-center p-8 text-grey-medium opacity-60 italic">Aucune activité commencée.</div>
            ) : (
                <div className="space-y-6">
                    {suiviMode === 'journal' && (
                        <div className="space-y-1">
                            {/* La vue 'Journal' : affiche le détail de chaque module et activité, permettant une validation d'un simple clic. */}
                            <StudentJournalView
                                studentProgress={studentProgress}
                                expandedModules={expandedModules}
                                toggleModuleExpansion={toggleModuleExpansion}
                                showPendingOnly={showPendingOnly}
                                handleUrgentValidation={handleUrgentValidation}
                                handleResetActivity={handleResetActivity}
                            />
                        </div>
                    )}
                    
                    {suiviMode === 'progression' && (
                        <StudentDetailsProgressionSummary studentProgress={studentProgress} />
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * 1. L'enseignant clique sur l'onglet "Suivi Pédagogique".
 * 2. Le composant affiche une icône de chargement pendant qu'il récupère les données.
 * 3. Une fois les données reçues :
 *    a. Si aucune activité n'a été commencée, un message informatif s'affiche.
 *    b. Sinon, le "Journal" s'affiche par défaut.
 * 4. L'enseignant peut cliquer sur "En cours" pour masquer les activités déjà réussies.
 * 5. Il peut également déployer ou réduire les modules pour voir le détail des activités à l'intérieur.
 * 6. Chaque action de validation est transmise au système via `handleUrgentValidation`.
 */
