import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, X, Search, ChevronRight, GraduationCap, Edit, LayoutList } from 'lucide-react';
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
import { Badge, Button, SmartTabs, EmptyState, ConfirmModal, Avatar, Input } from '../../components/ui';

const Groups: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'students' | 'actions'>('students');

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
        <div className="h-full flex gap-8 animate-in fade-in duration-500 relative">
            {/* List Column (Groups) */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
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
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
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
                                    <SortableGroupItem
                                        key={group.id}
                                        group={group}
                                        selectedGroup={selectedGroup}
                                        onClick={setSelectedGroup}
                                        onEdit={handleEditGroup}
                                        onDelete={(g) => { setGroupToDelete(g); }}
                                    />
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
                </div>

                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <Button
                        onClick={() => setShowModal(true)}
                        variant="secondary"
                        className="w-full border-dashed"
                        icon={Plus}
                    >
                        Nouveau Groupe
                    </Button>
                </div>
            </div>

            {/* Detail Column (Students in group) */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col relative">
                {!selectedGroup ? (
                    <EmptyState
                        icon={Layers}
                        title="Sélectionnez un groupe"
                        description="Cliquez sur un groupe dans la liste à gauche pour voir les détails et les élèves associés."
                        size="lg"
                        className="flex-1"
                    />
                ) : (
                    <>
                        {/* Header Section */}
                        <div className="p-8 border-b border-white/5 bg-surface/20 flex justify-between items-start">
                            <div className="flex gap-6 items-center flex-1 min-w-0">
                                <Avatar
                                    size="xl"
                                    src={selectedGroup.photo_url}
                                    initials={selectedGroup.acronyme || (selectedGroup.nom && selectedGroup.nom[0])}
                                    className={selectedGroup.photo_url ? "bg-[#D9B981]" : "bg-surface"}
                                />
                                <div className="min-w-0">
                                    <h1 className="text-3xl font-black text-text-main mb-1 tracking-tight truncate">{selectedGroup.nom}</h1>
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
                        </div>

                        {/* Tabs - Level 2 Smart Selector (flat style) */}
                        <div className="flex justify-center px-8 mb-6 mt-2">
                            <SmartTabs
                                tabs={[
                                    { id: 'students', label: 'Liste des élèves', icon: GraduationCap },
                                    { id: 'actions', label: 'Actions', icon: LayoutList }
                                ]}
                                activeTab={activeTab}
                                onChange={(id) => setActiveTab(id as 'students' | 'actions')}
                                fullWidth
                                level={2}
                            />
                        </div>

                        {/* Students List Tab */}
                        {activeTab === 'students' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
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
                                                <div key={student.id} className="relative group/card">
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={(e) => handleRemoveClick(e, student)}
                                                        className="absolute -top-2 -right-2 z-10 h-8 w-8 p-0 rounded-full opacity-0 group-hover/card:opacity-100 transition-all shadow-lg"
                                                        title="Retirer du groupe"
                                                        icon={X}
                                                    />
                                                    <div
                                                        onClick={() => navigate('/dashboard/user/students', { state: { selectedStudentId: student.id } })}
                                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all text-left group cursor-pointer"
                                                    >
                                                        <Avatar
                                                            size="md"
                                                            src={student.photo_url}
                                                            initials={`${student.prenom[0]}${student.nom[0]}`}
                                                            className={student.photo_url ? "bg-[#D9B981]" : "bg-background"}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-text-main group-hover:text-primary transition-colors">
                                                                {student.prenom} {student.nom}
                                                            </p>
                                                            <p className="text-xs text-grey-medium">
                                                                {student.Classe?.nom || 'Sans classe'}
                                                            </p>
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); handleEditStudent(student); }}
                                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 mr-2"
                                                            title="Modifier"
                                                            icon={Edit}
                                                        />

                                                        <ChevronRight size={16} className="text-grey-dark group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-white/5 bg-surface/30">
                                    <Button
                                        onClick={() => setShowAddToGroupModal(true)}
                                        variant="secondary"
                                        className="w-full border-dashed"
                                        icon={Plus}
                                    >
                                        Ajouter des enfants
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Actions Tab */}
                        {activeTab === 'actions' && (
                            <EmptyState
                                icon={LayoutList}
                                title="Aucune action disponible"
                                description="Il n'y a actuellement aucune action rapide pour ce groupe."
                                size="lg"
                                className="flex-1"
                            />
                        )}
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
