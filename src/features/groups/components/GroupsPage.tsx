/**
 * Nom du module/fichier : GroupsPage.tsx
 * 
 * Données en entrée : 
 *   - Aucune directe (l'enseignant accède à cet écran via le menu de navigation principal).
 * 
 * Données en sortie : 
 *   - Un écran complet et structuré : une barre latérale à gauche (liste des groupes) et un panneau de détails à droite.
 *   - Un arsenal de fenêtres surgissantes (Modales) prêtes pour la création, l'édition ou l'impression.
 * 
 * Objectif principal : Servir de "Châssis" central pour le module de gestion des groupes. Ce composant est un assembleur : il positionne les grandes briques visuelles (la liste, les détails) et prépare en coulisse toutes les fenêtres pop-up (création de groupe, ajout d'élèves, QR Codes, confirmations). Il délègue toute la logique métier à son assistant `useGroupsPageFlow` pour rester concentré uniquement sur l'organisation spatiale de l'écran.
 * 
 * Ce que ça affiche : La page "Gestion des Groupes" dans son intégralité.
 */

import React from 'react';
import { ConfirmModal, EmptyState } from '../../../core';
import { Layers } from 'lucide-react';
import { useGroupsPageFlow } from '../hooks/useGroupsPageFlow';

// COMPOSANTS VISUELS (Les briques de la page)
import { GroupsListSidebar } from './GroupsListSidebar';
import { GroupsDetailView } from './GroupsDetailView';

// FENÊTRES SURGISSANTES (Les modales)
// @ts-ignore
import StudentModal from '../../students/components/StudentModal';
// @ts-ignore
import { AddStudentToGroupModal } from './AddStudentToGroupModal';
// @ts-ignore
import AddGroupModal from '../../../components/AddGroupModal';
import GroupQRModal from './GroupQRModal';

/**
 * Page de pilotage des groupes et ateliers.
 */
export const GroupsPage: React.FC = () => {
    /** 
     * CONNEXION AU CERVEAU CENTRAL : 
     * Toute l'intelligence de cette page (chargement, filtres, clics) est déportée 
     * dans le Hook `useGroupsPageFlow` pour garder ce fichier visuel le plus clair possible.
     */
    const { states, actions } = useGroupsPageFlow();

    // Extraction des états (ce qu'on voit)
    const {
        activeTab, headerHeight, leftContentRef, rightContentRef,
        showModal, groupToEdit, groupToDelete, showStudentModal,
        isEditingStudent, editStudentId, showAddToGroupModal,
        showQRModal, qrInitialTab, groupsData, groupStudentsData,
        pdfGenerator, visibleColumns, eleveProfilCompetences, branches
    } = states;

    // Extraction des manettes d'action (ce qu'on fait)
    const {
        setActiveTab, setShowAddToGroupModal, setShowQRModal,
        setQRInitialTab, handleAddClick, handleEditGroupClick,
        handleDeleteClick, confirmDeleteGroup, handleEditStudent,
        handleStudentSaved, handleCloseGroupModal, toggleColumn,
        reorderColumns, updateStudentField
    } = actions;

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            
            {/* COLONNE DE GAUCHE : La liste de navigation des groupes */}
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

            {/* ZONE DE DROITE : Vue détaillée ou message d'accueil si rien n'est choisi */}
            {!groupsData.selectedGroup ? (
                <div className="flex-1 card-flat overflow-hidden">
                    <EmptyState
                        icon={Layers}
                        title="Sélectionnez un groupe"
                        description="Choisissez un groupe dans la liste pour voir les élèves et les actions disponibles."
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

                    // Pilotage des impressions et QR Codes
                    isGeneratingPDF={pdfGenerator.isGenerating}
                    progressText={pdfGenerator.progressText}
                    pdfProgress={pdfGenerator.progress}
                    onGeneratePDF={() => pdfGenerator.generateGroupTodoList(groupsData.selectedGroup as any)}
                    onShowQRModal={(tab) => {
                        if (tab) setQRInitialTab(tab);
                        setShowQRModal(true);
                    }}
                    
                    // Pilotage du tableau de bord (Suivi)
                    visibleColumns={visibleColumns}
                    onToggleColumn={toggleColumn}
                    onReorderColumns={reorderColumns}
                    onUpdateStudentField={updateStudentField}
                    eleveProfilCompetences={eleveProfilCompetences}
                    branches={branches}
                />
            )}

            {/* --- RÉSERVE DE FENÊTRES POP-UP (Invisibles par défaut) --- */}
            
            {/* Fenêtre de création d'un groupe */}
            <AddGroupModal
                isOpen={showModal}
                onClose={handleCloseGroupModal}
                groupToEdit={groupToEdit}
                onAdded={groupsData.fetchGroups}
            />

            {/* Fenêtre de modification d'un élève (fiche complète) */}
            <StudentModal
                showModal={showStudentModal}
                onClose={() => actions.setShowStudentModal(false)}
                isEditing={isEditingStudent}
                editId={editStudentId}
                studentId={editStudentId || ''}
                onSaved={handleStudentSaved}
            />

            {/* Fenêtre d'ajout massif d'élèves dans un groupe */}
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

            {/* Fenêtre de génération de QR Codes */}
            <GroupQRModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                groupName={groupsData.selectedGroup?.nom || 'Groupe'}
                students={groupStudentsData.studentsInGroup}
                initialTab={qrInitialTab}
            />

            {/* Confirmation de retrait d'un élève du groupe */}
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

            {/* Confirmation de suppression définitive d'un groupe */}
            <ConfirmModal
                isOpen={!!groupToDelete}
                onClose={() => actions.setGroupToDelete(null)}
                onConfirm={confirmDeleteGroup}
                title="Supprimer le groupe ?"
                message={`Êtes-vous sûr de vouloir supprimer le groupe "${groupToDelete?.nom}" ? Cette action est irréversible et supprimera toutes les inscriptions.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant clique sur "Groupes" dans le menu principal de l'application.
 * 2. Le composant `GroupsPage` s'allume. Il demande immédiatement à son cerveau (`useGroupsPageFlow`) l'état actuel de l'utilisateur.
 * 3. Il dessine l'écran principal : 
 *    - À gauche : la liste complète des groupes (`GroupsListSidebar`).
 *    - À droite : soit un message d'attente, soit les détails du groupe choisi (`GroupsDetailView`).
 * 4. Il prépare en coulisse toutes les fenêtres surgissantes (Pop-ups) prêtes à jaillir.
 * 5. Quand l'enseignant clique sur "Imprimer QR Codes" :
 *    - L'information va au cerveau qui change l'état de `showQRModal` à "vrai".
 *    - `GroupsPage` détecte ce changement et fait apparaître la fenêtre par-dessus tout le reste.
 * 6. L'écran ne se recharge jamais brutalement : tout se fait par petites briques fluides coordonnées par ce fichier.
 */
export default GroupsPage;
