/**
 * Nom du module/fichier : StudentDetailsColumn.tsx
 * 
 * Données en entrée : 
 *   - selectedStudent : L'élève actuellement sélectionné pour consultation.
 *   - students : La liste complète des camarades de classe (pour contexte).
 *   - Outils Photo : Fonctions pour gérer le changement de portrait par glisser-déposer.
 *   - handleUpdateImportance : Fonction pour modifier le niveau d'importance (alerte) du suivi.
 *   - setShowQRModal : Fonction pour générer des QR codes de connexion.
 * 
 * Données en sortie : Un panneau interactif complet (colonne de droite) organisé en onglets thématiques.
 * 
 * Objectif principal : Centraliser l'intégralité du "Dossier Numérique" d'un élève. Ce composant est le point d'entrée unique pour tout savoir sur un enfant : ses coordonnées parentales, ses réussites par matière (graphiques), son historique de travail (suivi), ses activités en retard (urgences) et ses documents à imprimer (PDF). Il permet une navigation fluide sans jamais quitter la page principale de la classe.
 * 
 * Ce que ça affiche : La carte d'identité de l'élève (photo, identité) et un système d'onglets (Informations, Suivi, PDF, Urgences).
 */

import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { CardTabs, EmptyState } from '../../../core';

// Logique métier (Cerveau du panneau)
import { useStudentDetailsFlow } from '../hooks/useStudentDetailsFlow';

// Sous-composants spécialisés par onglet
import { StudentInfoCard } from './details/StudentInfoCard';
import { StudentDetailsInfos } from './details/StudentDetailsInfos';
import { StudentDetailsSuivi } from './details/StudentDetailsSuivi';
import { StudentDetailsUrgent } from './details/StudentDetailsUrgent';
import { StudentDetailsTodo } from './details/StudentDetailsTodo';
import { StudentDetailsResults } from './details/StudentDetailsResults';

interface StudentDetailsColumnProps {
    selectedStudent: any;
    students: any[];
    isDraggingPhoto: boolean;
    updatingPhotoId: string | null;
    handlePhotoDragOver: (e: React.DragEvent, id?: string) => void;
    handlePhotoDragLeave: (e: React.DragEvent) => void;
    handlePhotoDrop: (e: React.DragEvent, student: any) => void;
    processAndSavePhoto: (file: File, student: any) => void;
    setShowQRModal: (show: boolean, tab?: 'encodage' | 'planification' | 'both') => void;
    handleUpdateImportance: (val: string) => void;
}

/**
 * Composant affichant la colonne de détails à droite de l'écran.
 */
export const StudentDetailsColumn: React.FC<StudentDetailsColumnProps> = ({
    selectedStudent,
    students,
    isDraggingPhoto,
    updatingPhotoId,
    handlePhotoDragOver,
    handlePhotoDragLeave,
    handlePhotoDrop,
    processAndSavePhoto,
    setShowQRModal,
    handleUpdateImportance
}) => {
    
    /** 
     * CHARGEMENT DES DONNÉES : 
     * On fait appel au Hook central qui calcule instantanément les progrès scolaires, 
     * les retards et les statistiques de l'élève sélectionné.
     */
    const { states, actions } = useStudentDetailsFlow(selectedStudent, students, handleUpdateImportance);

    const {
        studentProgress, loadingProgress, currentTab, suiviMode,
        showPendingOnly, expandedModules, branches,
        studentIndices, sortedModules, totalOverdueCount, hasWork: hasOverdueWork
    } = states;

    const {
        setCurrentTab, setSuiviMode, setShowPendingOnly,
        toggleModuleExpansion, handleUrgentValidation,
        handleUpdateBranchIndex, generatePDF
    } = actions;

    /** 
     * ÉTAT VIDE : 
     * Si aucun élève n'est sélectionné, on affiche une invitation à cliquer dans la liste.
     */
    if (!selectedStudent) {
        return (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <div className="flex-1 card-flat overflow-hidden">
                    <EmptyState
                        icon={UserIcon}
                        title="Dossier en attente"
                        description="Veuillez sélectionner un élève dans la liste pour consulter sa fiche détaillée."
                        size="md"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
            
            {/** 
             * ZONE 1 : IDENTITÉ VISUELLE
             * Affiche la photo de l'élève et permet de la changer par glisser-déposer.
             */}
            <StudentInfoCard
                student={selectedStudent}
                isDraggingPhoto={isDraggingPhoto}
                updatingPhotoId={updatingPhotoId}
                onPhotoDragOver={(e) => handlePhotoDragOver(e, selectedStudent.id)}
                onPhotoDragLeave={handlePhotoDragLeave}
                onPhotoDrop={(e) => handlePhotoDrop(e, selectedStudent)}
                onPhotoChange={(file) => processAndSavePhoto(file, selectedStudent)}
            />

            {/** 
             * ZONE 2 : NAVIGATION PAR ONGLETS
             * Permet d'explorer les différents aspects du dossier de l'élève.
             */}
            <CardTabs
                tabs={[
                    { id: 'infos', label: 'Dossier & Renseignement' },
                    { id: 'suivi', label: 'Parcours Scolaire' },
                    { id: 'urgent', label: 'Urgences & Retards' },
                    { id: 'todo', label: 'Documents & Outils' },
                    { id: 'resultats', label: 'Résultats' }
                ]}
                activeTab={currentTab}
                onChange={setCurrentTab}
            >
                {/** 
                 * ONGLET INFOS : 
                 * Coordonnées des parents et graphiques de réussite par matière.
                 */}
                {currentTab === 'infos' && (
                    <StudentDetailsInfos
                        student={selectedStudent}
                        branches={branches}
                        studentIndices={studentIndices}
                        onUpdateImportance={handleUpdateImportance}
                        onUpdateBranchIndex={handleUpdateBranchIndex}
                    />
                )}

                {/** 
                 * ONGLET SUIVI : 
                 * Historique complet de tous les ateliers et activités validés par l'élève.
                 */}
                {currentTab === 'suivi' && (
                    <StudentDetailsSuivi
                        studentProgress={studentProgress}
                        loadingProgress={loadingProgress}
                        suiviMode={suiviMode}
                        setSuiviMode={setSuiviMode}
                        showPendingOnly={showPendingOnly}
                        setShowPendingOnly={setShowPendingOnly}
                        expandedModules={expandedModules}
                        toggleModuleExpansion={toggleModuleExpansion}
                        handleUrgentValidation={handleUrgentValidation}
                        handleResetActivity={actions.handleResetActivity}
                    />
                )}

                {/** 
                 * ONGLET URGENT : 
                 * Isole automatiquement les activités "en retard" pour un rattrapage prioritaire.
                 */}
                {currentTab === 'urgent' && (
                    <StudentDetailsUrgent
                        totalOverdueCount={totalOverdueCount}
                        hasOverdueWork={hasOverdueWork}
                        sortedModules={sortedModules}
                        expandedModules={expandedModules}
                        toggleModuleExpansion={toggleModuleExpansion}
                        handleUrgentValidation={handleUrgentValidation}
                        selectedStudent={selectedStudent}
                        studentIndices={studentIndices}
                    />
                )}

                {/** 
                 * ONGLET DOCUMENTS : 
                 * Outils pour imprimer le plan de travail PDF ou générer les accès QR codes de l'élève.
                 */}
                {currentTab === 'todo' && (
                    <StudentDetailsTodo 
                        student={selectedStudent}
                        onShowQR={(tab) => setShowQRModal(true, tab)}
                        onGenerateTodoPDF={() => generatePDF(selectedStudent)}
                    />
                )}
                {/** 
                 * ONGLET RÉSULTATS : 
                 * Synthèse des notes par période et matière avec détail par évaluation.
                 */}
                {currentTab === 'resultats' && (
                    <StudentDetailsResults studentId={selectedStudent.id} />
                )}
            </CardTabs>
        </div>
    );
};

export default StudentDetailsColumn;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur "Léo" dans le trombinoscope de gauche.
 * 2. Le panneau `StudentDetailsColumn` se réveille et affiche le portrait de Léo en haut.
 * 3. Par défaut, l'enseignant voit l'onglet "Dossier & Renseignement" : 
 *    - Il consulte le mail de la maman de Léo.
 *    - Il voit des graphiques montrant que Léo progresse très bien en Mathématiques.
 * 4. L'enseignant change pour l'onglet "Parcours Scolaire" : 
 *    - Il parcourt la liste des 20 ateliers validés par Léo cette semaine.
 * 5. L'enseignant s'aperçoit d'un voyant rouge sur l'onglet "Urgences & Retards" :
 *    - Il clique dessus et voit que Léo a 2 ateliers dont la date limite est passée.
 * 6. Enfin, il se rend sur l'onglet "Documents" pour imprimer le bilan hebdomadaire de Léo au format PDF.
 */
