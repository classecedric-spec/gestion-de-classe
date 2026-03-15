/**
 * @component GroupsPage
 * @description Page de gestion des groupes d'élèves. Permet de créer des groupes, 
 * d'y assigner des élèves, de gérer les ateliers et de générer des QR codes par groupe.
 * 
 * @example
 * <GroupsPage />
 */

import React from 'react';
import { ConfirmModal, EmptyState } from '../../../core';
import { Layers } from 'lucide-react';
import { useGroupsPageFlow } from '../hooks/useGroupsPageFlow';


// Components
import { GroupsListSidebar } from './GroupsListSidebar';
import { GroupsDetailView } from './GroupsDetailView';

// Modals
// @ts-ignore
import StudentModal from '../../students/components/StudentModal';
// @ts-ignore
import { AddStudentToGroupModal } from './AddStudentToGroupModal';
// @ts-ignore
import AddGroupModal from '../../../components/AddGroupModal';
import GroupQRModal from './GroupQRModal';

export const GroupsPage: React.FC = () => {
    const { states, actions } = useGroupsPageFlow();

    const {
        activeTab,
        headerHeight,
        leftContentRef,
        rightContentRef,
        showModal,
        groupToEdit,
        groupToDelete,
        showStudentModal,
        isEditingStudent,
        editStudentId,
        showAddToGroupModal,
        showQRModal,
        qrInitialTab,
        groupsData,
        groupStudentsData,
        pdfGenerator
    } = states;

    const {
        setActiveTab,
        setShowAddToGroupModal,
        setShowQRModal,
        setQRInitialTab,
        handleAddClick,
        handleEditGroupClick,
        handleDeleteClick,
        confirmDeleteGroup,
        handleEditStudent,
        handleStudentSaved,
        handleCloseGroupModal
    } = actions;

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* List Column */}
            <GroupsListSidebar
                groups={groupsData.groups}
                filteredGroups={groupsData.filteredGroups}
                selectedGroup={groupsData.selectedGroup}
                loading={groupsData.loading}
                searchQuery={groupsData.searchQuery}
                setSearchQuery={groupsData.setSearchQuery}
                headerHeight={headerHeight}
                headerRef={leftContentRef}
                onSelectGroup={groupsData.setSelectedGroup}
                onAddGroup={handleAddClick}
                onEditGroup={handleEditGroupClick}
                onDeleteGroup={handleDeleteClick}
                onDragEnd={groupsData.handleDragEnd}
            />

            {/* Main Content Column */}
            {!groupsData.selectedGroup ? (
                <div className="flex-1 card-flat overflow-hidden">
                    <EmptyState
                        icon={Layers}
                        title="Sélectionnez un groupe"
                        description="Choisissez un groupe dans la liste pour voir les élèves et les actions."
                        size="lg"
                    />
                </div>
            ) : (
                <GroupsDetailView
                    selectedGroup={groupsData.selectedGroup}
                    studentsInGroup={groupStudentsData.studentsInGroup}
                    loadingStudents={groupStudentsData.loadingStudents}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    headerHeight={headerHeight}
                    headerRef={rightContentRef}
                    onAddStudents={() => setShowAddToGroupModal(true)}
                    onEditStudent={handleEditStudent}
                    onRemoveStudent={(student) => groupStudentsData.handleRemoveClick({ stopPropagation: () => { } } as any, student)}

                    // PDF Actions
                    isGeneratingPDF={pdfGenerator.isGenerating}
                    progressText={pdfGenerator.progressText}
                    pdfProgress={pdfGenerator.progress}
                    onGeneratePDF={() => pdfGenerator.generateGroupTodoList(groupsData.selectedGroup as any)}
                    onShowQRModal={(tab) => {
                        if (tab) setQRInitialTab(tab);
                        setShowQRModal(true);
                    }}
                />
            )}

            {/* --- Modals --- */}
            <AddGroupModal
                isOpen={showModal}
                onClose={handleCloseGroupModal}
                groupToEdit={groupToEdit}
                onAdded={groupsData.fetchGroups}
            />

            <StudentModal
                showModal={showStudentModal}
                onClose={() => actions.setShowStudentModal(false)}
                isEditing={isEditingStudent}
                editId={editStudentId}
                studentId={editStudentId || ''}
                onSaved={handleStudentSaved}
            />

            <AddStudentToGroupModal
                showModal={showAddToGroupModal}
                handleCloseModal={() => setShowAddToGroupModal(false)}
                groupId={groupsData.selectedGroup?.id || ''}
                groupName={groupsData.selectedGroup?.nom || ''}
                onAdded={() => {
                    if (groupsData.selectedGroup) groupStudentsData.fetchStudentsInGroup(groupsData.selectedGroup.id);
                    groupsData.fetchGroups();
                }}
            />

            <GroupQRModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                groupName={groupsData.selectedGroup?.nom || 'Groupe'}
                students={groupStudentsData.studentsInGroup}
                initialTab={qrInitialTab}
            />

            {/* Remove Student Confirmation */}
            <ConfirmModal
                isOpen={groupStudentsData.showRemoveModal}
                onClose={() => groupStudentsData.setShowRemoveModal(false)}
                onConfirm={groupStudentsData.confirmRemoveStudent}
                title="Retirer l'élève ?"
                message={`Êtes-vous sûr de vouloir retirer "${groupStudentsData.studentToRemove?.prenom} ${groupStudentsData.studentToRemove?.nom}" du groupe "${groupsData.selectedGroup?.nom}" ?`}
                confirmText="Retirer"
                cancelText="Annuler"
                variant="danger"
            />

            {/* Delete Group Confirmation */}
            <ConfirmModal
                isOpen={!!groupToDelete}
                onClose={() => actions.setGroupToDelete(null)}
                onConfirm={confirmDeleteGroup}
                title="Supprimer le groupe ?"
                message={`Êtes-vous sûr de vouloir supprimer le groupe "${groupToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />
        </div>
    );
};

export default GroupsPage;
