import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Layers, Plus, X, Loader2, Trash2, BookOpen, Search, ChevronRight, GraduationCap, Edit, Camera } from 'lucide-react';
import clsx from 'clsx';
import StudentModal from '../components/StudentModal';
import AddStudentToGroupModal from '../components/AddStudentToGroupModal';
import AddGroupModal from '../components/AddGroupModal';

const Groups = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [studentsInGroup, setStudentsInGroup] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Student Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editStudentId, setEditStudentId] = useState(null);
    const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);

    useEffect(() => {
        fetchGroups();
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchStudentsInGroup(selectedGroup.id);
        } else {
            setStudentsInGroup([]);
        }
    }, [selectedGroup]);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Groupe')
                .select('*, Classe(nom)')
                .order('nom');
            if (error) throw error;
            setGroups(data || []);

            // Re-sync selected group if it was updated
            if (selectedGroup) {
                const updated = data.find(g => g.id === selectedGroup.id);
                if (updated) setSelectedGroup(updated);
            } else if (data && data.length > 0) {
                setSelectedGroup(data[0]);
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const { data, error } = await supabase
                .from('Classe')
                .select('*')
                .order('nom');
            if (error) throw error;
            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchStudentsInGroup = async (groupId) => {
        setLoadingStudents(true);
        try {
            // 1. Get Eleve IDs from Join Table
            const { data: links, error: linkError } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            if (linkError) throw linkError;

            const studentIds = links.map(l => l.eleve_id);

            if (studentIds.length === 0) {
                setStudentsInGroup([]);
                return;
            }

            // 2. Fetch Students
            const { data, error } = await supabase
                .from('Eleve')
                .select('*, Classe(nom)')
                .in('id', studentIds)
                .order('nom');

            if (error) throw error;

            setStudentsInGroup(data || []);
        } catch (error) {
            console.error('Error fetching students in group:', error);
        } finally {
            setLoadingStudents(false);
        }
    };

    // Derived classes for the selected group
    const derivedClasses = Array.from(new Set(studentsInGroup.map(s => s.Classe?.nom).filter(Boolean)));

    const handleGroupAdded = () => {
        fetchGroups();
    };

    const handleEditGroup = (group) => {
        setGroupToEdit(group);
        setIsEditingGroup(true);
        setShowModal(true);
    };

    const handleCloseGroupModal = () => {
        setShowModal(false);
        setIsEditingGroup(false);
        setGroupToEdit(null);
    };



    const handleDeleteGroup = async () => {
        const targetGroup = groupToDelete;
        if (!targetGroup) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('Groupe').delete().eq('id', targetGroup.id);
            if (error) throw error;

            if (selectedGroup?.id === targetGroup.id) {
                setSelectedGroup(null);
            }

            setGroupToDelete(null);
            fetchGroups();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Student Handlers
    const handleEditStudent = (student) => {
        setIsEditingStudent(true);
        setEditStudentId(student.id);
        setShowStudentModal(true);
    };

    const handleStudentSaved = async () => {
        if (selectedGroup) {
            fetchStudentsInGroup(selectedGroup.id);
        }
    };

    const handleRemoveStudentFromGroup = async (e, studentId) => {
        e.stopPropagation(); // Prevent opening the edit modal
        if (!confirm('Êtes-vous sûr de vouloir retirer cet enfant du groupe ?')) return;

        try {
            // Delete from Join Table
            const { error } = await supabase
                .from('EleveGroupe')
                .delete()
                .match({ eleve_id: studentId, groupe_id: selectedGroup.id });

            if (error) throw error;
            fetchStudentsInGroup(selectedGroup.id);
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const filteredGroups = groups.filter(g =>
        g.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.acronyme?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        filteredGroups.map(group => (
                            <div
                                key={group.id}
                                onClick={() => setSelectedGroup(group)}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedGroup?.id === group.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedGroup(group); }}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden",
                                    selectedGroup?.id === group.id ? "bg-white/20 text-text-dark" : "bg-background text-primary",
                                    group.photo_base64 && "bg-[#D9B981]"
                                )}>
                                    {group.photo_base64 ? (
                                        <img src={group.photo_base64} alt="Group" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <Layers size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={clsx(
                                        "font-semibold truncate",
                                        selectedGroup?.id === group.id ? "text-text-dark" : "text-text-main"
                                    )}>
                                        {group.nom}
                                    </p>
                                </div>

                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedGroup?.id === group.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedGroup?.id === group.id
                                                ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                                : "text-grey-medium hover:text-white hover:bg-white/10"
                                        )}
                                        title="Modifier"
                                    >
                                        <Edit size={14} />
                                    </div>
                                </div>

                                {/* Absolute Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setGroupToDelete(group); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer le groupe"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={16} className={clsx(
                                    "transition-transform",
                                    selectedGroup?.id === group.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                )} />
                            </div>
                        ))
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
                                    selectedGroup.photo_base64 ? "bg-[#D9B981]" : "bg-surface"
                                )}>
                                    {selectedGroup.photo_base64 ? (
                                        <img src={selectedGroup.photo_base64} alt="Group" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <>{selectedGroup.acronyme || selectedGroup.nom[0]}</>
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


                        {/* Students List */}
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
                                                onClick={(e) => handleRemoveStudentFromGroup(e, student.id)}
                                                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover/card:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                                title="Retirer du groupe"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={() => handleEditStudent(student)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all text-left group"
                                            >
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-primary group-hover:scale-110 transition-transform overflow-hidden shadow-inner",
                                                    student.photo_base64 ? "bg-[#D9B981]" : "bg-background"
                                                )}>
                                                    {student.photo_base64 ? (
                                                        <img src={student.photo_base64} alt="Student" className="w-[90%] h-[90%] object-contain" />
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
                                                <ChevronRight size={16} className="text-grey-dark group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </button>
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
                                <span className="font-medium">Ajouter un enfant</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Create Group Modal */}
            <AddGroupModal
                isOpen={showModal}
                onClose={handleCloseGroupModal}
                onAdded={handleGroupAdded}
                groupToEdit={isEditingGroup ? groupToEdit : null}
            />

            {/* Reusable Student Modal */}
            <StudentModal
                showModal={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                isEditing={isEditingStudent}
                editId={editStudentId}
                onSaved={handleStudentSaved}
            />

            {/* Add Student to Group Modal */}
            <AddStudentToGroupModal
                showModal={showAddToGroupModal}
                handleCloseModal={() => setShowAddToGroupModal(false)}
                groupId={selectedGroup?.id}
                groupName={selectedGroup?.nom}
                onAdded={() => fetchStudentsInGroup(selectedGroup.id)}
            />
            {/* Delete Confirmation Modal */}
            {
                groupToDelete && (
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
                                    onClick={handleDeleteGroup}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Groups;
