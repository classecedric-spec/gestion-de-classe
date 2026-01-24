import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableGroupItem } from './components/SortableGroupItem';
// @ts-ignore
import StudentModal from '../../features/students/components/StudentModal';
// @ts-ignore
import AddStudentToGroupModal from '../../components/AddStudentToGroupModal';
// @ts-ignore
import AddGroupModal from '../../components/AddGroupModal';

import { useGroupsData } from './hooks/useGroupsData';
import { useGroupStudents, StudentWithClass } from './hooks/useGroupStudents';
import { useGroupPdfGenerator } from '../../features/dashboard/hooks/useGroupPdfGenerator';
// @ts-ignore
import { useInAppMigration } from '../../hooks/useInAppMigration';
import { Tables } from '../../types/supabase';
import { Badge, SearchBar, EmptyState, ConfirmModal, Avatar, ListItem, CardInfo, CardList, CardTabs, ActionItem } from '../../components/ui';
import PdfProgress from '../../components/ui/PdfProgress';
import { GraduationCap, LayoutList, Plus, Users, FileText, Layers } from 'lucide-react';

const Groups: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'students' | 'actions'>('students');

    // --- Height Synchronization ---
    const leftContentRef = React.useRef<HTMLDivElement>(null);
    const rightContentRef = React.useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = React.useState<number | undefined>(undefined);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Tables<'Groupe'> | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<Tables<'Groupe'> | null>(null);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editStudentId, setEditStudentId] = useState<string | null>(null);
    const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);

    // Hooks
    const {
        groups,
        selectedGroup,
        setSelectedGroup,
        loading,
        searchQuery,
        setSearchQuery,
        filteredGroups,
        fetchGroups,
        handleAddGroup,
        handleDeleteGroup,
        handleDragEnd
    } = useGroupsData();

    const {
        studentsInGroup,
        loadingStudents,
        studentToRemove,
        showRemoveModal,
        setShowRemoveModal,
        handleRemoveClick,
        confirmRemoveStudent,
        fetchStudentsInGroup
    } = useGroupStudents(selectedGroup);

    // --- Height Measure Effect (Inner Content Strategy) ---
    React.useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [groups.length, selectedGroup, studentsInGroup.length]);

    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Actions
    const handleAddClick = () => {
        setIsEditingGroup(false);
        setGroupToEdit(null);
        setShowModal(true);
    };

    const handleEditGroupClick = (e: React.MouseEvent, group: Tables<'Groupe'>) => {
        e.stopPropagation();
        setIsEditingGroup(true);
        setGroupToEdit(group);
        setShowModal(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, group: Tables<'Groupe'>) => {
        e.stopPropagation();
        setGroupToDelete(group);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        await handleDeleteGroup(groupToDelete.id);
        setGroupToDelete(null);
    };

    const handleEditStudent = (student: StudentWithClass) => {
        setEditStudentId(student.id);
        setIsEditingStudent(true);
        setShowStudentModal(true);
    };

    const handleStudentSaved = () => {
        if (selectedGroup) fetchStudentsInGroup(selectedGroup.id);
        setShowStudentModal(false);
    };

    const handleCloseGroupModal = () => {
        setShowModal(false);
        setIsEditingGroup(false);
        setGroupToEdit(null);
    };

    // --- Actions ---
    const {
        generateGroupTodoList,
        cancelGeneration,
        isGenerating: isGeneratingPDF,
        progressText,
        progress: pdfProgress
    } = useGroupPdfGenerator();

    // --- Cancellation ---
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isGeneratingPDF && e.key === 'Escape') cancelGeneration();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isGeneratingPDF, cancelGeneration]);

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* List Column (Groups) - 1/4 weight */}
            <div className="w-1/4 flex flex-col gap-6 h-full">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <Users size={24} className="text-primary" />
                            Groupes
                        </h2>
                        <Badge variant="primary" size="xs">
                            {groups.length} Total
                        </Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher un groupe..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                <CardList
                    actionLabel="Nouveau Groupe"
                    onAction={handleAddClick}
                    actionIcon={Plus}
                >
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                            <Avatar size="lg" loading initials="" />
                            <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <EmptyState
                            icon={Layers}
                            title="Aucun groupe"
                            description={searchQuery ? "Aucun groupe ne correspond à votre recherche." : "Commencez par créer votre premier groupe d'élèves."}
                            size="sm"
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredGroups.map(g => g.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1 flex-1">
                                    {filteredGroups.map((group) => (
                                        <SortableGroupItem
                                            key={group.id}
                                            group={group}
                                            selectedGroup={selectedGroup}
                                            onClick={() => setSelectedGroup(group)}
                                            onEdit={(g) => handleEditGroupClick({ stopPropagation: () => { } } as any, g)}
                                            onDelete={(g) => handleDeleteClick({ stopPropagation: () => { } } as any, g)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </CardList>
            </div>

            {/* Main Content Column */}
            <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
                {!selectedGroup ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={Layers}
                            title="Sélectionnez un groupe"
                            description="Choisissez un groupe dans la liste pour voir les élèves et les actions."
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        <CardInfo
                            ref={rightContentRef}
                            height={headerHeight}
                        >
                            <div className="flex gap-6 items-center">
                                <Avatar
                                    size="xl"
                                    src={selectedGroup.photo_url}
                                    initials={selectedGroup.acronyme || (selectedGroup.nom ? selectedGroup.nom[0] : '?')}
                                    className={selectedGroup.photo_url ? "bg-[#D9B981]" : "bg-surface"}
                                />
                                <div className="min-w-0">
                                    <h1 className="text-cq-xl font-black text-text-main mb-1 tracking-tight truncate">{selectedGroup.nom}</h1>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="primary" size="sm" className="border border-primary/20">
                                            {selectedGroup.acronyme || 'N/A'}
                                        </Badge>
                                        <div className="w-1 h-1 rounded-full bg-grey-dark" />
                                        <p className="text-grey-medium text-sm font-medium">
                                            {studentsInGroup.length} {studentsInGroup.length > 1 ? 'Enfants' : 'Enfant'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardInfo>

                        <CardTabs
                            tabs={[
                                { id: 'students', label: 'Liste des élèves', icon: GraduationCap },
                                { id: 'actions', label: 'Actions', icon: LayoutList }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as 'students' | 'actions')}
                            actionLabel={activeTab === 'students' ? "Ajouter des enfants" : undefined}
                            onAction={activeTab === 'students' ? () => setShowAddToGroupModal(true) : undefined}
                            actionIcon={activeTab === 'students' ? Plus : undefined}
                        >
                            {/* Students List Tab */}
                            {activeTab === 'students' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                            <GraduationCap size={18} className="text-primary" />
                                            Les enfants de ce groupe
                                        </h3>

                                        {loadingStudents ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                <Avatar size="lg" loading initials="" />
                                                <p className="text-grey-medium animate-pulse text-sm">Chargement des élèves...</p>
                                            </div>
                                        ) : studentsInGroup.length === 0 ? (
                                            <EmptyState
                                                icon={GraduationCap}
                                                title="Aucun enfant"
                                                description="Aucun enfant dans ce groupe pour le moment. Ajoutez des élèves pour commencer l'organisation."
                                                size="md"
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {studentsInGroup.map(student => (
                                                    <ListItem
                                                        key={student.id}
                                                        id={student.id}
                                                        title={`${student.prenom} ${student.nom}`}
                                                        subtitle={student.Classe?.nom || 'Sans classe'}
                                                        onClick={() => navigate('/dashboard/user/students', { state: { selectedStudentId: student.id } })}
                                                        onDelete={() => handleRemoveClick({ stopPropagation: () => { } } as any, student)}
                                                        deleteTitle="Retirer du groupe"
                                                        onEdit={() => handleEditStudent(student)}
                                                        avatar={{
                                                            src: student.photo_url,
                                                            initials: `${student.prenom[0]}${student.nom[0]}`,
                                                            className: student.photo_url ? "bg-[#D9B981]" : "bg-background"
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions Tab */}
                            {activeTab === 'actions' && (
                                <div className="space-y-8 p-2">
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium border-b border-white/5 pb-2 mb-4">
                                            Impression des documents
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ActionItem
                                                icon={FileText}
                                                label={isGeneratingPDF ? "Génération..." : "To do list"}
                                                subtitle={isGeneratingPDF ? (progressText || "Préparation...") : "Génération PDF"}
                                                progress={pdfProgress}
                                                onClick={() => generateGroupTodoList(selectedGroup as any)}
                                                loading={isGeneratingPDF}
                                            />
                                        </div>

                                        {/* Progress Indicator (shared component) */}
                                        <PdfProgress
                                            isGenerating={isGeneratingPDF}
                                            progressText={progressText}
                                            progressPercentage={pdfProgress}
                                            className="mt-8"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            {/* Modals */}
            <AddGroupModal
                isOpen={showModal}
                onClose={handleCloseGroupModal}
                onAdded={handleAddGroup}
                groupToEdit={isEditingGroup ? groupToEdit : null}
            />

            <StudentModal
                showModal={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                isEditing={isEditingStudent}
                editId={editStudentId}
                onSaved={handleStudentSaved}
            />

            <AddStudentToGroupModal
                showModal={showAddToGroupModal}
                handleCloseModal={() => setShowAddToGroupModal(false)}
                groupId={selectedGroup?.id || ''}
                groupName={selectedGroup?.nom || ''}
                onAdded={() => {
                    if (selectedGroup) fetchStudentsInGroup(selectedGroup.id);
                    fetchGroups();
                }}
            />

            {/* Remove Student Confirmation */}
            <ConfirmModal
                isOpen={showRemoveModal}
                onClose={() => setShowRemoveModal(false)}
                onConfirm={confirmRemoveStudent}
                title="Retirer l'élève ?"
                message={`Êtes-vous sûr de vouloir retirer "${studentToRemove?.prenom} ${studentToRemove?.nom}" du groupe "${selectedGroup?.nom}" ?`}
                confirmText="Retirer"
                cancelText="Annuler"
                variant="danger"
            />

            {/* Delete Group Confirmation */}
            <ConfirmModal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
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

export default Groups;
