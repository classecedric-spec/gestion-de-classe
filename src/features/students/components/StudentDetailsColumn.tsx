import React from 'react';
import { User as UserIcon, FileText } from 'lucide-react';
import { CardTabs, EmptyState } from '../../../core';

// Hooks
import { useStudentDetailsFlow } from '../hooks/useStudentDetailsFlow';

// Components
import { StudentInfoCard } from './details/StudentInfoCard';
import { StudentDetailsInfos } from './details/StudentDetailsInfos';
import { StudentDetailsSuivi } from './details/StudentDetailsSuivi';
import { StudentDetailsUrgent } from './details/StudentDetailsUrgent';
import { StudentDetailsTodo } from './details/StudentDetailsTodo';

interface StudentDetailsColumnProps {
    selectedStudent: any;
    students: any[];
    isDraggingPhoto: boolean;
    updatingPhotoId: string | null;
    handlePhotoDragOver: (e: React.DragEvent, id?: string) => void;
    handlePhotoDragLeave: (e: React.DragEvent) => void;
    handlePhotoDrop: (e: React.DragEvent, student: any) => void;
    processAndSavePhoto: (file: File, student: any) => void;
    setShowQRModal: (show: boolean) => void;
    handleUpdateImportance: (val: string) => void;
}

/**
 * @component StudentDetailsColumn
 * @description Panneau latéral affichant les détails complets d'un élève.
 * Orchestre les sous-composants pour les informations, le suivi et les tâches.
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
    const { states, actions } = useStudentDetailsFlow(selectedStudent, students, handleUpdateImportance);

    const {
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
    } = states;

    const {
        setCurrentTab,
        setSuiviMode,
        setShowPendingOnly,
        toggleModuleExpansion,
        handleUrgentValidation,
        handleUpdateBranchIndex,
        generatePDF
    } = actions;

    if (!selectedStudent) {
        return (
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <div className="flex-1 card-flat overflow-hidden">
                    <EmptyState
                        icon={UserIcon}
                        title="Sélectionnez un élève"
                        description="Cliquez sur un nom dans la liste pour afficher ses informations détaillées."
                        size="md"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
            {/* Student Identity Card */}
            <StudentInfoCard
                student={selectedStudent}
                isDraggingPhoto={isDraggingPhoto}
                updatingPhotoId={updatingPhotoId}
                onPhotoDragOver={(e) => handlePhotoDragOver(e, selectedStudent.id)}
                onPhotoDragLeave={handlePhotoDragLeave}
                onPhotoDrop={(e) => handlePhotoDrop(e, selectedStudent)}
                onPhotoChange={(file) => processAndSavePhoto(file, selectedStudent)}
                onShowQR={() => setShowQRModal(true)}
            />

            {/* Content Tabs */}
            <CardTabs
                tabs={[
                    { id: 'infos', label: 'Informations' },
                    { id: 'suivi', label: 'Suivi Pédagogique' },
                    { id: 'todo', label: 'To-Do List' },
                    { id: 'urgent', label: 'Suivi Urgent' }
                ]}
                activeTab={currentTab}
                onChange={setCurrentTab}
                actionLabel={currentTab === 'todo' ? "Créer le PDF" : undefined}
                onAction={currentTab === 'todo' ? () => generatePDF(selectedStudent) : undefined}
                actionIcon={FileText}
            >
                {currentTab === 'infos' && (
                    <StudentDetailsInfos
                        student={selectedStudent}
                        branches={branches}
                        studentIndices={studentIndices}
                        onUpdateImportance={handleUpdateImportance}
                        onUpdateBranchIndex={handleUpdateBranchIndex}
                    />
                )}

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
                    />
                )}

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

                {currentTab === 'todo' && (
                    <StudentDetailsTodo student={selectedStudent} />
                )}
            </CardTabs>
        </div>
    );
};
