import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, X, Loader2, Trash2, Search, ChevronRight, GraduationCap, Edit, LayoutList } from 'lucide-react';
import clsx from 'clsx';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
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
import { Tables } from '../../../types/supabase';
import { StudentWithClass } from './hooks/useGroupStudents';

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
        handleGenerateGroupTodoList: onGeneratePDF,
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
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {groups.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un groupe..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="text-primary animate-spin" size={32} />
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
                        <div className="text-center py-12 px-4">
                            <p className="text-grey-dark italic">Aucun groupe trouvé</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Nouveau Groupe</span>
                    </button>
                </div>
            </div>

            {/* Detail Column (Students in group) */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col relative">
                {!selectedGroup ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-dark p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <Layers size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-grey-medium mb-2">Sélectionnez un groupe</h3>
                        <p className="max-w-xs">Cliquez sur un groupe pour voir la liste des enfants associés.</p>
                    </div>
                ) : (
                    <>
                        {/* Header Section */}
                        <div className="p-8 border-b border-white/5 bg-surface/20 flex justify-between items-start">
                            <div className="flex gap-6 items-center flex-1 min-w-0">
                                <div className={clsx(
                                    "w-24 h-24 rounded-2xl border-4 border-background flex items-center justify-center text-3xl font-bold text-primary shadow-2xl shrink-0 overflow-hidden",
                                    selectedGroup.photo_url ? "bg-[#D9B981]" : "bg-surface"
                                )}>
                                    {selectedGroup.photo_url ? (
                                        <img src={selectedGroup.photo_url} alt="Group" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <>{selectedGroup.acronyme || (selectedGroup.nom && selectedGroup.nom[0])}</>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-3xl font-black text-text-main mb-1 tracking-tight truncate">{selectedGroup.nom}</h1>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter rounded border border-primary/20">
                                            {selectedGroup.acronyme || 'N/A'}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-grey-dark" />
                                        <p className="text-grey-medium text-sm font-medium">
                                            {studentsInGroup.length} {studentsInGroup.length > 1 ? 'Enfants' : 'Enfant'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex justify-center px-8 mb-6 mt-2">
                            <div className="neu-selector-container p-1.5 rounded-2xl w-full">
                                <button
                                    onClick={() => setActiveTab('students')}
                                    data-active={activeTab === 'students'}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.12em] transition-all duration-300",
                                        activeTab === 'students'
                                            ? "bg-primary text-text-dark"
                                            : "text-grey-medium hover:text-white"
                                    )}
                                >
                                    <GraduationCap size={16} />
                                    <span className="tab-label">Liste des élèves</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('actions')}
                                    data-active={activeTab === 'actions'}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.12em] transition-all duration-300",
                                        activeTab === 'actions'
                                            ? "bg-primary text-text-dark"
                                            : "text-grey-medium hover:text-white"
                                    )}
                                >
                                    <LayoutList size={16} />
                                    <span className="tab-label">Actions</span>
                                </button>
                            </div>
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
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p className="text-grey-medium animate-pulse text-sm">Chargement des élèves...</p>
                                        </div>
                                    ) : studentsInGroup.length === 0 ? (
                                        <div className="text-center py-12 p-8 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center gap-4">
                                            <GraduationCap size={48} className="mx-auto text-grey-dark opacity-20" />
                                            <div>
                                                <p className="text-grey-medium italic">Aucun enfant dans ce groupe pour le moment.</p>
                                                <p className="text-xs text-grey-dark mt-1">Cliquez sur le bouton ci-dessous pour ajouter des élèves.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {studentsInGroup.map(student => (
                                                <div key={student.id} className="relative group/card">
                                                    <button
                                                        onClick={(e) => handleRemoveClick(e, student)}
                                                        className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover/card:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                                        title="Retirer du groupe"
                                                    >
                                                        <X size={14} strokeWidth={3} />
                                                    </button>
                                                    <div
                                                        onClick={() => navigate('/dashboard/user/students', { state: { selectedStudentId: student.id } })}
                                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all text-left group cursor-pointer"
                                                    >
                                                        <div className={clsx(
                                                            "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-primary group-hover:scale-110 transition-transform overflow-hidden shadow-inner",
                                                            student.photo_url ? "bg-[#D9B981]" : "bg-background"
                                                        )}>
                                                            {student.photo_url ? (
                                                                <img src={student.photo_url} alt="Student" className="w-[90%] h-[90%] object-contain" />
                                                            ) : (
                                                                <>{student.prenom[0]}{student.nom[0]}</>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-text-main group-hover:text-primary transition-colors">
                                                                {student.prenom} {student.nom}
                                                            </p>
                                                            <p className="text-xs text-grey-medium">
                                                                {student.Classe?.nom || 'Sans classe'}
                                                            </p>
                                                        </div>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditStudent(student); }}
                                                            className="p-1.5 text-grey-medium hover:text-white hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 mr-2"
                                                            title="Modifier"
                                                        >
                                                            <Edit size={14} />
                                                        </button>

                                                        <ChevronRight size={16} className="text-grey-dark group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-white/5 bg-surface/30">
                                    <button
                                        onClick={() => setShowAddToGroupModal(true)}
                                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                        <span className="font-medium">Ajouter des enfants</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Actions Tab */}
                        {activeTab === 'actions' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-grey-dark p-12 text-center bg-background/20">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <LayoutList size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-grey-medium mb-2">Aucune action disponible</h3>
                                <p className="max-w-xs text-grey-medium">Il n'y a actuellement aucune action rapide pour ce groupe.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <AddGroupModal
                isOpen={showModal}
                onClose={handleCloseGroupModal}
                onAdded={fetchGroups}
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
                isOpen={showAddToGroupModal}
                onClose={() => setShowAddToGroupModal(false)}
                groupId={selectedGroup?.id}
                onAdded={() => {
                    if (selectedGroup) fetchStudentsInGroup(selectedGroup.id);
                    fetchGroups();
                }}
            />

            {/* Remove Student Confirmation Modal */}
            {showRemoveModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card-bg border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Retirer l'élève ?</h3>
                                <p className="text-sm text-grey-medium">
                                    Êtes-vous sûr de vouloir retirer <span className="text-white font-bold">{studentToRemove?.prenom} {studentToRemove?.nom}</span> du groupe <span className="text-primary">{selectedGroup?.nom}</span> ?
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setShowRemoveModal(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmRemoveStudent}
                                    className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold transition-colors shadow-lg shadow-danger/20"
                                >
                                    Retirer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Group Confirmation Modal */}
            {groupToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer le groupe ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer le groupe <span className="text-white font-bold">"{groupToDelete.nom}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setGroupToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDeleteGroup}
                                disabled={loading}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Groups;
