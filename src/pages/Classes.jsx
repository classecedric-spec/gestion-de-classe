import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    BookOpen, Plus, X, Loader2, Trash2, Search,
    ChevronRight, GraduationCap, Edit
} from 'lucide-react';
import clsx from 'clsx';
import StudentModal from '../components/StudentModal';
import AddStudentToClassModal from '../components/AddStudentToClassModal';
import AddClassModal from '../components/AddClassModal';

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [studentsInClass, setStudentsInClass] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Modals state
    const [showClassModal, setShowClassModal] = useState(false);
    const [isEditingClass, setIsEditingClass] = useState(false);
    const [classToEdit, setClassToEdit] = useState(null);

    const [showStudentModal, setShowStudentModal] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editStudentId, setEditStudentId] = useState(null);

    const [showAddToClassModal, setShowAddToClassModal] = useState(false);
    const [classToDelete, setClassToDelete] = useState(null);

    // Filter/Search for Classes list
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Classe')
                .select(`
                    *,
                    ClasseAdulte (
                        role,
                        Adulte (id, nom, prenom)
                    )
                `)
                .order('nom');
            if (error) throw error;
            setClasses(data || []);

            // Re-sync selected class if it was updated
            if (selectedClass) {
                const updated = data.find(c => c.id === selectedClass.id);
                if (updated) setSelectedClass(updated);
            } else if (data && data.length > 0 && !selectedClass) {
                handleSelectClass(data[0]);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsInClass = async (classId) => {
        setLoadingStudents(true);
        try {
            const { data, error } = await supabase
                .from('Eleve')
                .select(`
                    *,
                    Classe (nom),
                    EleveGroupe (
                        Groupe (id, nom)
                    )
                `)
                .eq('classe_id', classId)
                .order('nom');

            if (error) throw error;
            setStudentsInClass(data || []);
        } catch (error) {
            console.error('Error fetching students in class:', error);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleSelectClass = (classe) => {
        setSelectedClass(classe);
        fetchStudentsInClass(classe.id);
    };


    const handleDeleteClass = async () => {
        const targetClass = classToDelete;
        if (!targetClass) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('Classe').delete().eq('id', targetClass.id);
            if (error) throw error;

            if (selectedClass?.id === targetClass.id) {
                setSelectedClass(null);
                setStudentsInClass([]);
            }

            setClassToDelete(null);
            fetchClasses();
        } catch (error) {
            alert('Erreur suppression: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClass = (classe) => {
        setClassToEdit(classe);
        setIsEditingClass(true);
        setShowClassModal(true);
    };

    const handleOpenCreateModal = () => {
        setIsEditingClass(false);
        setClassToEdit(null);
        setShowClassModal(true);
    };


    const handleEditStudent = (student) => {
        setEditStudentId(student.id);
        setIsEditingStudent(true);
        setShowStudentModal(true);
    };

    const handleRemoveStudentFromClass = async (e, studentId) => {
        e.stopPropagation();
        if (!confirm('Êtes-vous sûr de vouloir retirer cet enfant de la classe ?')) return;

        try {
            const { error } = await supabase
                .from('Eleve')
                .update({ classe_id: null })
                .eq('id', studentId);

            if (error) throw error;
            fetchStudentsInClass(selectedClass.id);
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const filteredClasses = classes.filter(c =>
        c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.acronyme?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex gap-8 animate-in fade-in duration-500 relative">
            {/* Left Sidebar - Classes List */}
            <div className="w-1/3 flex flex-col bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-border/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <BookOpen className="text-primary" size={24} />
                            Liste des Classes
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {classes.length} Total
                        </span>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher une classe..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface/50 border border-border/10 rounded-xl py-2 pl-9 pr-4 text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary" size={24} />
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <p className="text-sm text-grey-medium italic">Aucune classe trouvée</p>
                        </div>
                    ) : (
                        filteredClasses.map((classe) => (
                            <div
                                key={classe.id}
                                onClick={() => handleSelectClass(classe)}
                                className={clsx(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative hover:z-50 cursor-pointer",
                                    selectedClass?.id === classe.id
                                        ? "selected-state text-text-dark"
                                        : "hover:bg-input text-grey-light hover:text-text-main"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectClass(classe); }}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold overflow-hidden shadow-inner",
                                    selectedClass?.id === classe.id ? "bg-primary/20 text-text-dark" : "bg-background text-primary",
                                    (classe.photo_base64 || classe.logo_url) && "bg-[#D9B981]"
                                )}>
                                    {classe.photo_base64 ? (
                                        <img src={classe.photo_base64} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                                    ) : classe.logo_url ? (
                                        <img src={classe.logo_url} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        classe.acronyme || classe.nom[0]
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate text-sm">{classe.nom}</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {classe.acronyme && (
                                            <span className={clsx(
                                                "text-[9px] uppercase font-black px-1 rounded flex items-center",
                                                selectedClass?.id === classe.id ? "bg-black/20 text-text-dark" : "bg-primary/20 text-primary"
                                            )}>
                                                {classe.acronyme}
                                            </span>
                                        )}
                                        {classe.ClasseAdulte && classe.ClasseAdulte.length > 0 && (
                                            <span className={clsx(
                                                "text-[9px] font-bold px-1 rounded",
                                                selectedClass?.id === classe.id ? "bg-black/10 text-text-dark/70" : "bg-white/5 text-grey-medium"
                                            )}>
                                                {classe.ClasseAdulte.filter(ca => ca.role === 'principal').map(ca => ca.Adulte.nom).join(', ')}
                                                {classe.ClasseAdulte.length > classe.ClasseAdulte.filter(ca => ca.role === 'principal').length && '+'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedClass?.id === classe.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEditClass(classe); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedClass?.id === classe.id
                                                ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                                : "text-grey-medium hover:text-text-main hover:bg-input/50"
                                        )}
                                        title="Modifier"
                                    >
                                        <Edit size={14} />
                                    </div>
                                </div>

                                {/* Absolute Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setClassToDelete(classe); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer la classe"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={14} className={clsx(
                                    "opacity-0 transition-transform",
                                    selectedClass?.id === classe.id ? "opacity-100 translate-x-1" : "group-hover:opacity-100 group-hover:translate-x-1"
                                )} />
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-border/5">
                    <button
                        onClick={handleOpenCreateModal}
                        className="w-full py-3 bg-input hover:bg-input/80 text-text-main rounded-xl border border-border/10 transition-all font-bold flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="text-primary group-hover:scale-110 transition-transform" />
                        Nouvelle Classe
                    </button>
                </div>
            </div>

            {/* Right Side - Class Detail */}
            <div className="flex-1 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 overflow-hidden shadow-xl flex flex-col relative text-text-main">
                {!selectedClass ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-dark p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-grey-medium mb-2">Sélectionnez une classe</h3>
                        <p className="max-w-xs">Choisissez une classe dans la liste pour voir les élèves et les détails.</p>
                    </div>
                ) : (
                    <>
                        {/* Detail Header */}
                        <div className="p-8 border-b border-border/5 flex items-start justify-between bg-surface/20">
                            <div className="flex gap-6 items-center">
                                <div className={clsx(
                                    "w-24 h-24 rounded-2xl border-4 border-background flex items-center justify-center text-3xl font-bold text-primary shadow-2xl shrink-0 overflow-hidden",
                                    (selectedClass.photo_base64 || selectedClass.logo_url) ? "bg-[#D9B981]" : "bg-surface"
                                )}>
                                    {selectedClass.photo_base64 ? (
                                        <img src={selectedClass.photo_base64} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                                    ) : selectedClass.logo_url ? (
                                        <img src={selectedClass.logo_url} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        selectedClass.acronyme || selectedClass.nom[0]
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-text-main mb-1 tracking-tight">{selectedClass.nom}</h1>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter rounded border border-primary/20">
                                            {selectedClass.acronyme || 'N/A'}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-grey-dark" />
                                        <p className="text-grey-medium text-sm font-medium">
                                            {studentsInClass.length} {studentsInClass.length > 1 ? 'Enfants' : 'Enfant'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-border/5 pb-4 mb-6 flex items-center gap-2">
                                <GraduationCap size={18} className="text-primary" />
                                Les enfants de cette classe
                            </h3>

                            {loadingStudents ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                    <p className="text-grey-medium animate-pulse text-sm">Chargement des élèves...</p>
                                </div>
                            ) : studentsInClass.length === 0 ? (
                                <div className="text-center py-12 p-8 bg-input/10 rounded-2xl border border-dashed border-border/10 flex flex-col items-center gap-4">
                                    <GraduationCap size={48} className="mx-auto text-grey-dark opacity-20" />
                                    <div>
                                        <p className="text-grey-medium italic">Aucun enfant dans cette classe pour le moment.</p>
                                        <p className="text-xs text-grey-dark mt-1">Cliquez sur le bouton ci-dessous pour ajouter des élèves.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {studentsInClass.map(student => (
                                        <div key={student.id} className="relative group/card">
                                            <button
                                                onClick={(e) => handleRemoveStudentFromClass(e, student.id)}
                                                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover/card:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                                title="Retirer de la classe"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={() => handleEditStudent(student)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-input border border-border/5 hover:border-primary/30 hover:bg-input/80 transition-all text-left group"
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
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-grey-dark">
                                                        {student.EleveGroupe?.length > 0
                                                            ? student.EleveGroupe.map(eg => eg.Groupe?.nom).filter(Boolean).join(', ')
                                                            : 'Sans groupe'}
                                                    </p>
                                                </div>
                                                <ChevronRight size={16} className="text-grey-dark group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border/5 bg-surface/30">
                            <button
                                onClick={() => setShowAddToClassModal(true)}
                                className="w-full py-3 bg-input hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-border/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Ajouter un enfant</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Class Modal */}
            <AddClassModal
                isOpen={showClassModal}
                onClose={() => setShowClassModal(false)}
                onAdded={() => {
                    fetchClasses();
                    // Refetch students if we edited the selected class? Not strictly necessary if only name changed, but safer.
                    if (selectedClass) fetchStudentsInClass(selectedClass.id);
                }}
                classToEdit={isEditingClass ? classToEdit : null}
            />

            {/* Reusable Student Modal */}
            <StudentModal
                showModal={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                isEditing={isEditingStudent}
                editId={editStudentId}
                onSaved={() => fetchStudentsInClass(selectedClass.id)}
            />

            {/* Add Student to Class Modal */}
            <AddStudentToClassModal
                showModal={showAddToClassModal}
                handleCloseModal={() => setShowAddToClassModal(false)}
                classId={selectedClass?.id}
                className={selectedClass?.nom}
                onAdded={() => fetchStudentsInClass(selectedClass.id)}
            />
            {/* Delete Confirmation Modal */}
            {classToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer la classe ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer la classe <span className="text-text-main font-bold">"{classToDelete.nom}"</span> ?
                            <br />Les élèves ne seront pas supprimés mais n'auront plus de classe assignée.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setClassToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteClass}
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

export default Classes;
