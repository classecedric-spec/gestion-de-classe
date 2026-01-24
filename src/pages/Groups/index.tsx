import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search, GraduationCap, LayoutList } from 'lucide-react';
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
import { useGroupStudents } from './hooks/useGroupStudents';
import { useGroupPDF } from './hooks/useGroupPDF';
// @ts-ignore
import { useInAppMigration } from '../../hooks/useInAppMigration';
import { Tables } from '../../types/supabase';
import { StudentWithClass } from './hooks/useGroupStudents';
import { Badge, Button, EmptyState, ConfirmModal, Avatar, Input, ListItem, CardInfo, CardList, CardTabs } from '../../components/ui';

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

    // Patch for generic onDelete which doesn't provide event
    const handleRemoveStudentClick = (student: StudentWithClass) => {
        handleRemoveClick({ stopPropagation: () => { } } as any, student);
    };

    const {
        loading: pdfLoading,
        handleCancelGeneration
    } = useGroupPDF();

    // In-app migration
    useInAppMigration(filteredGroups, 'Groupe', 'groupe');
    useInAppMigration(studentsInGroup, 'Eleve', 'eleve');

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // --- Height Measure Effect ---
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
    }, [groups.length, selectedGroup, searchQuery]);

    // Escape to cancel PDF generation
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (pdfLoading && e.key === 'Escape') {
                handleCancelGeneration();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [pdfLoading, handleCancelGeneration]);

    const handleEditGroup = (group: Tables<'Groupe'>) => {
        setGroupToEdit(group);
        setIsEditingGroup(true);
        setShowModal(true);
    };

    const handleCloseGroupModal = () => {
        setShowModal(false);
        setIsEditingGroup(false);
        setGroupToEdit(null);
    };

    const handleEditStudent = (student: StudentWithClass) => {
        setIsEditingStudent(true);
        setEditStudentId(student.id);
        setShowStudentModal(true);
    };

    const handleStudentSaved = async () => {
        if (selectedGroup) {
            fetchStudentsInGroup(selectedGroup.id);
        }
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            await handleDeleteGroup(groupToDelete.id);
            setGroupToDelete(null);
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* List Column (Groups) */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <Layers className="text-primary" size={24} />
                            Liste des Groupes
                        </h2>
                        <Badge variant="primary" size="sm">
                            {groups.length} Total
                        </Badge>
                    </div>

                    <Input
                        placeholder="Rechercher un groupe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={Search}
                        className="bg-background/50"
                    />
                </CardInfo>

                <CardList
                    actionLabel="Nouveau Groupe"
                    onAction={() => setShowModal(true)}
                    actionIcon={Plus}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Avatar size="lg" loading initials="" />
                        </div>
                    ) : filteredGroups.length > 0 ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredGroups.map(g => g.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredGroups.map(group => (
                                    <div key={group.id} className="relative group/item">
                                        <SortableGroupItem
                                            group={group}
                                            selectedGroup={selectedGroup}
                                            onClick={setSelectedGroup}
                                            onEdit={handleEditGroup}
                                            onDelete={(g) => { setGroupToDelete(g); }}
                                        />
                                    </div>
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <EmptyState
                            icon={Layers}
                            title="Aucun groupe"
                            description="Commencez par créer un nouveau groupe pour organiser vos élèves."
                            size="sm"
                        />
                    )}
                </CardList>
            </div>

            {/* Detail Column (Students in group) */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                {!selectedGroup ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={Layers}
                            title="Sélectionnez un groupe"
                            description="Cliquez sur un groupe dans la liste à gauche pour voir les détails et les élèves associés."
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        {/* Header Section */}
                        <CardInfo
                            ref={rightContentRef}
                            height={headerHeight}
                        >
                            <div className="flex gap-6 items-center">
                                <Avatar
                                    size="xl"
                                    src={selectedGroup.photo_url}
                                    initials={selectedGroup.acronyme || (selectedGroup.nom && selectedGroup.nom[0])}
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
                        >
                            {/* Students List Tab */}
                            {activeTab === 'students' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24 custom-scrollbar">
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
                                                        onDelete={() => handleRemoveStudentClick(student)}
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

                                    <div className="absolute bottom-6 left-6 right-6">
                                        <Button
                                            onClick={() => setShowAddToGroupModal(true)}
                                            variant="secondary"
                                            className="w-full border-dashed"
                                            icon={Plus}
                                        >
                                            Ajouter des enfants
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Actions Tab */}
                            {activeTab === 'actions' && (
                                <EmptyState
                                    icon={LayoutList}
                                    title="Aucune action disponible"
                                    description="Il n'y a actuellement aucune action rapide pour ce groupe."
                                    size="lg"
                                />
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
