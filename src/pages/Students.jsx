import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, User as UserIcon, Calendar, GraduationCap, ShieldCheck, Loader2, ChevronRight, Filter, Plus, X, BookOpen, Layers, Trash2, Edit } from 'lucide-react';
import clsx from 'clsx';
import StudentModal from '../components/StudentModal';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [studentToDelete, setStudentToDelete] = useState(null);

    useEffect(() => {
        fetchStudents();
        fetchClassesAndGroups();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('Eleve')
                .select(`
                  *,
                  Classe (nom),
                  EleveGroupe (
                    Groupe (id, nom)
                  )
                `)
                .eq('titulaire_id', user.id)
                .order('nom', { ascending: true });

            if (error) {
                // Fallback for case sensitivity issues if tables were created with/without quotes
                if (error.code === '42P01') {
                    console.warn("Table not found, trying lowercase fallback");
                    // Simplistic fallback logic, ideally we fix schema
                }
                throw error;
            }

            setStudents(data || []);
            if (data && data.length > 0 && !selectedStudent) {
                setSelectedStudent(data[0]);
            }
        } catch (err) {
            console.error('Error fetching students:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassesAndGroups = async () => {
        // Redundant here as it's now in the modal for creation/edit, 
        // but might be needed for the filter class list in future if we want to show all classes
        // For now, let's keep it minimal or remove if not used elsewhere.
    };

    const handleStudentSaved = async (studentId) => {
        await fetchStudents();
        // If it was an edit, update the detail view
        if (selectedStudent && selectedStudent.id === studentId) {
            const { data: updatedStudent } = await supabase
                .from('Eleve')
                .select(`
                  *,
                  Classe (nom),
                  EleveGroupe (
                    Groupe (id, nom)
                  )
                `)
                .eq('id', studentId)
                .single();
            if (updatedStudent) setSelectedStudent(updatedStudent);
        }
    };

    const handleEdit = (student) => {
        setIsEditing(true);
        setEditId(student.id);
        setShowModal(true);
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setEditId(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditId(null);
    };

    const handleDelete = async () => {
        const targetStudent = studentToDelete;
        if (!targetStudent) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('Eleve').delete().eq('id', targetStudent.id);
            if (error) throw error;

            if (selectedStudent?.id === targetStudent.id) {
                setSelectedStudent(null);
            }

            setStudentToDelete(null);
            fetchStudents();
        } catch (error) {
            console.error("Error deleting student:", error);
            alert('Erreur lors de la suppression: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        (s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.prenom.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (filterClass === 'all' || s.Classe?.nom === filterClass)
    );

    return (
        <div className="h-full flex gap-8 animate-in fade-in duration-500 relative">
            {/* List Column */}
            <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <GraduationCap className="text-primary" size={24} />
                            Liste des Enfants
                        </h2>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {students.length} Total
                        </span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <Filter size={14} className="text-grey-medium" />
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="bg-transparent text-grey-light outline-none cursor-pointer hover:text-primary transition-colors"
                        >
                            <option value="all">Toutes les classes</option>
                            {Array.from(new Set(students.map(s => s.Classe?.nom).filter(Boolean))).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="text-primary animate-spin" size={32} />
                        </div>
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map(student => (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedStudent?.id === student.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStudent(student); }}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden",
                                    selectedStudent?.id === student.id ? "bg-white/20 text-text-dark" : "bg-background text-primary",
                                    student.photo_base64 && "bg-[#D9B981]"
                                )}>
                                    {student.photo_base64 ? (
                                        <img src={student.photo_base64} alt="Student" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <>{student.prenom[0]}{student.nom[0]}</>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={clsx(
                                        "font-semibold truncate",
                                        selectedStudent?.id === student.id ? "text-text-dark" : "text-text-main"
                                    )}>
                                        {student.prenom} {student.nom}
                                    </p>
                                    <p className={clsx(
                                        "text-xs truncate",
                                        selectedStudent?.id === student.id ? "text-text-dark/70" : "text-grey-medium"
                                    )}>
                                        {student.Classe?.nom || 'Sans classe'} • {student.EleveGroupe?.length > 0
                                            ? student.EleveGroupe.map(eg => eg.Groupe?.nom).filter(Boolean).join(', ')
                                            : 'Sans groupe'}
                                    </p>
                                </div>

                                <div className={clsx(
                                    "flex gap-1 transition-opacity",
                                    selectedStudent?.id === student.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleEdit(student); }}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                                            selectedStudent?.id === student.id
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
                                    onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); }}
                                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Supprimer l'élève"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>

                                <ChevronRight size={16} className={clsx(
                                    "transition-transform",
                                    selectedStudent?.id === student.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                )} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 px-4">
                            <p className="text-grey-dark italic">Aucun élève trouvé</p>
                        </div>
                    )}
                </div>

                {/* Add Student Button */}
                <div className="p-4 border-t border-white/5 bg-surface/30">
                    <button
                        onClick={handleOpenCreate}
                        className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Ajouter un élève</span>
                    </button>
                </div>
            </div>

            {/* Detail Column */}
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col relative">
                {!selectedStudent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-grey-dark p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <UserIcon size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-grey-medium mb-2">Sélectionnez un élève</h3>
                        <p className="max-w-xs">Cliquez sur un nom dans la liste pour afficher ses informations détaillées.</p>
                    </div>
                ) : (
                    <>
                        {/* Header Section */}
                        <div className="p-8 border-b border-white/5 bg-surface/20 flex justify-between items-start">
                            <div className="flex gap-6 items-center">
                                <div className={clsx(
                                    "w-24 h-24 rounded-2xl border-4 border-background flex items-center justify-center text-3xl font-bold text-primary shadow-2xl shrink-0 overflow-hidden",
                                    selectedStudent.photo_base64 ? "bg-[#D9B981]" : "bg-surface"
                                )}>
                                    {selectedStudent.photo_base64 ? (
                                        <img src={selectedStudent.photo_base64} alt="Student" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <>{selectedStudent.prenom[0]}{selectedStudent.nom[0]}</>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-text-main mb-1 truncate">{selectedStudent.prenom} {selectedStudent.nom}</h2>
                                    <p className="text-primary font-medium flex items-center gap-2">
                                        <ShieldCheck size={16} />
                                        Élève actif
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Personal Info */}
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Informations Personnelles</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-primary"><Calendar size={18} /></div>
                                            <div>
                                                <p className="text-xs text-grey-medium">Date de Naissance</p>
                                                <p className="text-text-main font-medium">{selectedStudent.date_naissance ? new Date(selectedStudent.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-primary"><GraduationCap size={18} /></div>
                                            <div>
                                                <p className="text-xs text-grey-medium">Année d'Inscription</p>
                                                <p className="text-text-main font-medium">{selectedStudent.annee_inscription || 'Non renseignée'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Parcours Académique</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-primary"><BookOpen size={18} /></div>
                                            <div>
                                                <p className="text-xs text-grey-medium">Classe</p>
                                                <p className="text-text-main font-medium">{selectedStudent.Classe?.nom || 'Non affecté'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-primary"><Layers size={18} /></div>
                                            <div>
                                                <p className="text-xs text-grey-medium">Groupes</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {selectedStudent.EleveGroupe && selectedStudent.EleveGroupe.length > 0 ? (
                                                        selectedStudent.EleveGroupe.map(eg => eg.Groupe && (
                                                            <span key={eg.Groupe.id} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                                                {eg.Groupe.nom}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-text-main font-medium">Non affecté</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-primary"><UserIcon size={18} /></div>
                                            <div>
                                                <p className="text-xs text-grey-medium">Titulaire Responsable</p>
                                                <p className="text-text-main font-medium">{selectedStudent.CompteUtilisateur?.full_name || 'En attente'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats / Other (Placeholder) */}
                            <div className="mt-12 p-6 rounded-xl bg-white/5 border border-white/5 text-center">
                                <p className="text-grey-medium italic text-sm">Notes et absences bientôt disponibles...</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {studentToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Supprimer l'élève ?</h2>
                        <p className="text-sm text-grey-medium mb-6">
                            Êtes-vous sûr de vouloir supprimer <span className="text-white font-bold">"{studentToDelete.prenom} {studentToDelete.nom}"</span> ?
                            <br />Cette action est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStudentToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shared Student Modal */}
            <StudentModal
                showModal={showModal}
                onClose={handleCloseModal}
                isEditing={isEditing}
                editId={editId}
                onSaved={handleStudentSaved}
            />
        </div>
    );
};

export default Students;
