import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Search, User as UserIcon, Calendar, GraduationCap, ShieldCheck, Loader2, ChevronRight, ChevronDown, Filter, Plus, X, BookOpen, Layers, Trash2, Edit, Users, CheckCircle2, Clock, AlertCircle, LayoutList, GitGraph, FileText } from 'lucide-react';
import clsx from 'clsx';
import StudentModal from '../components/StudentModal';
import { pdf } from '@react-pdf/renderer';
import StudentTrackingPDF from '../components/StudentTrackingPDF';
import StudentTrackingPDFModern from '../components/StudentTrackingPDFModern';
import { saveAs } from 'file-saver';

const Students = () => {
    const location = useLocation();
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Detail View Tabs
    const [currentTab, setCurrentTab] = useState('infos'); // 'infos' or 'suivi'
    const [studentProgress, setStudentProgress] = useState([]);
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [expandedModules, setExpandedModules] = useState({});
    const [suiviMode, setSuiviMode] = useState('journal'); // 'journal' or 'progression'
    const [showPendingOnly, setShowPendingOnly] = useState(false);
    const [expandedBranches, setExpandedBranches] = useState({});
    const [expandedSubBranches, setExpandedSubBranches] = useState({});
    const [expandedTreeModules, setExpandedTreeModules] = useState({});

    useEffect(() => {
        fetchStudents();
        fetchClassesAndGroups();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentProgress(selectedStudent.id);
            setCurrentTab('infos');
            setExpandedModules({});
        } else {
            setStudentProgress([]);
            setExpandedModules({});
        }
    }, [selectedStudent]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('Eleve')
                .select(`
                  *,
                  Classe (
                    nom,
                    ClasseAdulte (
                      role,
                      Adulte (id, nom, prenom)
                    )
                  ),
                  Niveau (nom),
                  EleveGroupe (
                    Groupe (id, nom)
                  )
                `)
                .eq('titulaire_id', user.id)
                .order('nom', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                    console.warn("Table not found, trying lowercase fallback");
                }
                throw error;
            }

            setStudents(data || []);

            // Selection Logic with Navigation State Support
            if (data && data.length > 0) {
                // 1. Check for incoming navigation state
                if (location.state?.selectedStudentId) {
                    const target = data.find(s => s.id === location.state.selectedStudentId);
                    if (target) {
                        setSelectedStudent(target);
                        return;
                    }
                }

                // 2. Default to first student if not already selected
                if (!selectedStudent) {
                    setSelectedStudent(data[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching students:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassesAndGroups = async () => {
    };

    const handleStudentSaved = async (studentId) => {
        await fetchStudents();
        if (selectedStudent && selectedStudent.id === studentId) {
            const { data: updatedStudent } = await supabase
                .from('Eleve')
                .select(`
                  *,
                  Classe (
                    nom,
                    ClasseAdulte (
                      role,
                      Adulte (id, nom, prenom)
                    )
                  ),
                  Niveau (nom),
                  EleveGroupe (
                    Groupe (id, nom)
                  )
                `)
                .eq('id', studentId)
                .single();
            if (updatedStudent) setSelectedStudent(updatedStudent);
        }
    };

    const calculateAge = (dateString) => {
        if (!dateString) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} ans`;
        return `${age} ans`;
    };

    const fetchStudentProgress = async (studentId) => {
        setLoadingProgress(true);
        try {
            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    updated_at,
                    Activite (
                        id,
                        titre,
                        ordre,
                        Module (
                            id,
                            nom,
                            date_fin,
                            SousBranche (
                                id,
                                nom,
                                ordre,
                                Branche (
                                    id,
                                    nom,
                                    ordre
                                )
                            )
                        )
                    )
                `)
                .eq('eleve_id', studentId);

            if (error) throw error;
            setStudentProgress(data || []);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoadingProgress(false);
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

    const generatePDF = async (Component, filenameSuffix) => {
        if (!selectedStudent) {
            alert("Aucun élève sélectionné.");
            return;
        }

        try {
            // 1. Fetch ALL active curriculum (modules en_cours)
            // This ensures we get things that fall in the "To Do" even if not started yet.
            const { data: allModules, error: modError } = await supabase
                .from('Module')
                .select(`
                    id,
                    nom,
                    date_fin,
                    SousBranche (
                        id,
                        ordre,
                        Branche ( id, ordre )
                    ),
                    Activite (
                        id,
                        titre,
                        ordre
                    )
                `)
                .eq('statut', 'en_cours');

            if (modError) throw modError;

            // 2. Identification of completed activities
            const completedActivityIds = new Set(
                studentProgress
                    .filter(p => p.etat === 'termine')
                    .map(p => p.Activite?.id)
                    .filter(Boolean)
            );

            // 3. Filter and Format Modules
            const todoModuleList = [];

            allModules.forEach(mod => {
                // Filter activities: keep those NOT completed
                const pendingActivities = (mod.Activite || []).filter(act => !completedActivityIds.has(act.id));

                if (pendingActivities.length > 0) {
                    todoModuleList.push({
                        title: mod.nom,
                        dueDate: mod.date_fin,
                        // Store keys for sorting
                        branchOrder: mod.SousBranche?.Branche?.ordre || 0,
                        sbOrder: mod.SousBranche?.ordre || 0,
                        activities: pendingActivities.map(act => ({
                            name: act.titre,
                            order: act.ordre || 0,
                            material: "", // Placeholder
                            level: "" // Placeholder
                        }))
                    });
                }
            });

            // 4. Sort Modules
            const sortedModules = todoModuleList.sort((a, b) => {
                // 1. Date Fin
                if (a.dueDate && b.dueDate) {
                    if (a.dueDate !== b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
                } else if (a.dueDate) return -1;
                else if (b.dueDate) return 1;

                // 2. Branch
                if (a.branchOrder !== b.branchOrder) return a.branchOrder - b.branchOrder;

                // 3. SubBranch
                if (a.sbOrder !== b.sbOrder) return a.sbOrder - b.sbOrder;

                // 4. Alphabetical
                return a.title.localeCompare(b.title);
            });

            // 5. Sort Activities within Module
            sortedModules.forEach(m => {
                m.activities.sort((a, b) => a.order - b.order);
            });

            if (sortedModules.length === 0) {
                alert("Aucune activité à faire retrouvée.");
                return;
            }
            // 6. Prepare Data
            const pdfData = {
                studentName: `${selectedStudent.prenom} ${selectedStudent.nom}`,
                printDate: new Date().toLocaleDateString('fr-FR'),
                modules: sortedModules
            };

            // 5. Generate and Save
            const blob = await pdf(<Component data={pdfData} />).toBlob();
            const fileName = `ToDoList_${filenameSuffix}_${selectedStudent.prenom}_${selectedStudent.nom}.pdf`;

            // Try File System Access API to force "Save As" dialog
            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'PDF Document',
                            accept: { 'application/pdf': ['.pdf'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return;
                }
            } catch (err) {
                if (err.name === 'AbortError') return; // User cancelled
                console.warn("File System Access API failed, falling back to download", err);
            }

            // Fallback
            saveAs(blob, fileName);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Erreur lors de la génération du PDF.");
        }
    };

    const handleGenerateTodoPDF = () => generatePDF(StudentTrackingPDF, 'Classique');
    const handleGenerateTodoPDFModern = () => generatePDF(StudentTrackingPDFModern, 'Moderne');

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
                        <div className="p-8 border-b border-white/5 bg-surface/20 flex flex-col justify-between items-start gap-6">
                            <div className="flex gap-6 items-center w-full">
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
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {selectedStudent.EleveGroupe && selectedStudent.EleveGroupe.length > 0 ? (
                                            selectedStudent.EleveGroupe.map(eg => eg.Groupe && (
                                                <span key={eg.Groupe.id} className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/20">
                                                    {eg.Groupe.nom}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-grey-medium italic py-1">Aucun groupe</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* TABS */}
                            <div className="flex gap-1 w-full border-b border-white/5">
                                <button
                                    onClick={() => setCurrentTab('infos')}
                                    className={clsx(
                                        "px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all",
                                        currentTab === 'infos' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-white"
                                    )}
                                >
                                    Informations
                                </button>
                                <button
                                    onClick={() => setCurrentTab('suivi')}
                                    className={clsx(
                                        "px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all",
                                        currentTab === 'suivi' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-white"
                                    )}
                                >
                                    Suivi Pédagogique
                                </button>
                                <button
                                    onClick={() => setCurrentTab('todo')}
                                    className={clsx(
                                        "px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all",
                                        currentTab === 'todo' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-white"
                                    )}
                                >
                                    To-Do List
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            {currentTab === 'infos' && (
                                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Academic Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Parcours Scolaire</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-white/5 text-primary"><BookOpen size={18} /></div>
                                                <p className="text-text-main font-bold">{selectedStudent.Classe?.nom || 'Non affecté'}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-white/5 text-primary"><Layers size={18} /></div>
                                                <p className="text-text-main font-bold">{selectedStudent.Niveau?.nom || 'Non renseigné'}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-white/5 text-primary"><Calendar size={18} /></div>
                                                <p className="text-text-main font-bold">{calculateAge(selectedStudent.date_naissance)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal & Responsible Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Informations & Responsables</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-white/5 text-primary"><ShieldCheck size={18} /></div>
                                                <div>
                                                    <p className="text-xs text-grey-medium">Équipe Enseignante</p>
                                                    <div className="space-y-1 mt-1">
                                                        {selectedStudent.Classe?.ClasseAdulte && selectedStudent.Classe.ClasseAdulte.length > 0 ? (
                                                            selectedStudent.Classe.ClasseAdulte.map((ca, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                                    <p className="text-text-main font-bold truncate">
                                                                        {ca.Adulte.prenom} {ca.Adulte.nom}
                                                                    </p>
                                                                    <span className={clsx(
                                                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0",
                                                                        ca.role === 'principal' ? "bg-primary/20 text-primary" : "bg-white/10 text-grey-medium"
                                                                    )}>
                                                                        {ca.role === 'principal' ? 'Titulaire' : ca.role === 'coenseignant' ? 'Co-Ens.' : 'Support'}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-text-main font-bold italic opacity-50">Aucun membre assigné</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-white/5 text-primary"><UserIcon size={18} /></div>
                                                <div>
                                                    <p className="text-xs text-grey-medium">Parents</p>
                                                    <p className="text-text-main font-medium">
                                                        {selectedStudent.nom_parents || [
                                                            `${selectedStudent.parent1_prenom} ${selectedStudent.parent1_nom}`,
                                                            `${selectedStudent.parent2_prenom} ${selectedStudent.parent2_nom}`
                                                        ].filter(p => p.trim() !== "").join(' & ') || 'Non renseignés'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentTab === 'suivi' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Sub-Tabs Toggle */}
                                    <div className="flex w-full">
                                        <div className="w-full bg-surface/50 p-1 rounded-xl border border-white/10 flex gap-1">
                                            <button
                                                onClick={() => setSuiviMode('journal')}
                                                className={clsx(
                                                    "flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                                                    suiviMode === 'journal' ? "bg-primary text-text-dark shadow-lg" : "text-grey-medium hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <LayoutList size={14} />
                                                Journal
                                            </button>
                                            <button
                                                onClick={() => setSuiviMode('progression')}
                                                className={clsx(
                                                    "flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                                                    suiviMode === 'progression' ? "bg-primary text-text-dark shadow-lg" : "text-grey-medium hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <GitGraph size={14} />
                                                Progression
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filter Toggle */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowPendingOnly(!showPendingOnly)}
                                            className={clsx(
                                                "text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                                                showPendingOnly
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "bg-surface/30 border-white/5 text-grey-medium hover:text-white"
                                            )}
                                        >
                                            <Filter size={12} />
                                            {showPendingOnly ? "En cours uniquement" : "Tout afficher"}
                                        </button>
                                    </div>

                                    {loadingProgress ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
                                    ) : studentProgress.length === 0 ? (
                                        <div className="text-center p-8 text-grey-medium opacity-60 italic">
                                            Aucune activité commencée pour cet élève.
                                        </div>
                                    ) : (
                                        <>
                                            {suiviMode === 'journal' && (
                                                <div className="space-y-4">
                                                    {Object.values(studentProgress.reduce((acc, p) => {
                                                        const mod = p.Activite?.Module;
                                                        if (!mod) return acc;
                                                        if (!acc[mod.id]) {
                                                            acc[mod.id] = {
                                                                ...mod,
                                                                activities: []
                                                            };
                                                        }
                                                        acc[mod.id].activities.push(p);
                                                        return acc;
                                                    }, {}))
                                                        .sort((a, b) => {
                                                            // 1. Date de fin (nulls à la fin)
                                                            if (a.date_fin && b.date_fin) {
                                                                if (a.date_fin !== b.date_fin) return new Date(a.date_fin) - new Date(b.date_fin);
                                                            } else if (a.date_fin) return -1;
                                                            else if (b.date_fin) return 1;

                                                            // 2. Ordre Branche
                                                            const aBOrder = a.SousBranche?.Branche?.ordre || 0;
                                                            const bBOrder = b.SousBranche?.Branche?.ordre || 0;
                                                            if (aBOrder !== bBOrder) return aBOrder - bBOrder;

                                                            // 3. Ordre Sous-Branche
                                                            const aSBOrder = a.SousBranche?.ordre || 0;
                                                            const bSBOrder = b.SousBranche?.ordre || 0;
                                                            if (aSBOrder !== bSBOrder) return aSBOrder - bSBOrder;

                                                            // 4. Alphabétique
                                                            return a.nom.localeCompare(b.nom);
                                                        })
                                                        .map(module => {
                                                            const activities = module.activities;
                                                            const completedCount = activities.filter(a => a.etat === 'termine').length;
                                                            const totalCount = activities.length;
                                                            const percent = Math.round((completedCount / totalCount) * 100);
                                                            const isExpanded = expandedModules[module.id];
                                                            const lastUpdate = new Date(Math.max(...activities.map(act => new Date(act.updated_at).getTime())));

                                                            // Filter for Journal View
                                                            if (showPendingOnly && completedCount === totalCount) return null;

                                                            return (
                                                                <div key={module.id} className="bg-surface/30 border border-white/5 rounded-xl overflow-hidden hover:border-primary/20 transition-all">
                                                                    <div
                                                                        onClick={() => setExpandedModules(prev => ({ ...prev, [module.id]: !prev[module.id] }))}
                                                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                                                                <Layers size={20} />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="font-bold text-text-main">{module.nom}</h3>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-primary transition-all duration-500"
                                                                                        style={{ width: `${percent}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            {isExpanded ? <ChevronDown size={20} className="text-grey-medium" /> : <ChevronRight size={20} className="text-grey-medium" />}
                                                                        </div>
                                                                    </div>

                                                                    {isExpanded && (
                                                                        <div className="border-t border-white/5 bg-black/20">
                                                                            {activities.sort((a, b) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map(p => (
                                                                                <div key={p.id} className="p-3 pl-16 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                                                    <h4 className="text-sm text-grey-light font-medium group-hover:text-white transition-colors">
                                                                                        {p.Activite?.titre}
                                                                                    </h4>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="text-[10px] text-grey-dark font-mono">
                                                                                            {new Date(p.updated_at).toLocaleDateString()}
                                                                                        </span>
                                                                                        <div className={clsx(
                                                                                            "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
                                                                                            p.etat === 'termine' ? "bg-success/20 text-success" :
                                                                                                p.etat === 'besoin_d_aide' ? "bg-danger/20 text-danger animate-pulse" :
                                                                                                    "bg-primary/20 text-primary"
                                                                                        )}>
                                                                                            {p.etat === 'termine' ? <CheckCircle2 size={10} /> :
                                                                                                p.etat === 'besoin_d_aide' ? <AlertCircle size={10} /> :
                                                                                                    <Clock size={10} />}
                                                                                            {p.etat === 'termine' ? 'Terminé' :
                                                                                                p.etat === 'besoin_d_aide' ? "Besoin d'aide" :
                                                                                                    'En cours'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}

                                            {suiviMode === 'progression' && (
                                                <div className="space-y-3">
                                                    {Object.values(studentProgress.reduce((acc, p) => {
                                                        const branche = p.Activite?.Module?.SousBranche?.Branche;
                                                        if (!branche) return acc;
                                                        if (!acc[branche.id]) {
                                                            acc[branche.id] = { ...branche, sousBranches: {} };
                                                        }

                                                        const sb = p.Activite?.Module?.SousBranche;
                                                        if (!acc[branche.id].sousBranches[sb.id]) {
                                                            acc[branche.id].sousBranches[sb.id] = { ...sb, modules: {} };
                                                        }

                                                        const mod = p.Activite?.Module;
                                                        if (!acc[branche.id].sousBranches[sb.id].modules[mod.id]) {
                                                            acc[branche.id].sousBranches[sb.id].modules[mod.id] = { ...mod, activities: [] };
                                                        }

                                                        acc[branche.id].sousBranches[sb.id].modules[mod.id].activities.push(p);
                                                        return acc;
                                                    }, {}))
                                                        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                                                        .map(branch => {
                                                            const branchStart = expandedBranches[branch.id];

                                                            // Calculate Branch Progress
                                                            const allBranchActivities = Object.values(branch.sousBranches).flatMap(sb => Object.values(sb.modules).flatMap(m => m.activities));
                                                            const branchTotal = allBranchActivities.length;
                                                            const branchDone = allBranchActivities.filter(a => a.etat === 'termine').length;
                                                            const branchPercent = branchTotal > 0 ? Math.round((branchDone / branchTotal) * 100) : 0;

                                                            // Filter Logic for Branch
                                                            // We must check if there are any visible modules inside this branch
                                                            // A simplistic check: if branch is 100% done and showPendingOnly is true -> hide it.
                                                            // However, user might want to see partial progress? 
                                                            // Let's rely on recursive visibility. If all sub-branches are hidden, hide branch.

                                                            // Pre-calculate visible sub-branches to prevent rendering empty branches
                                                            const visibleSubBranches = Object.values(branch.sousBranches).filter(sb => {
                                                                if (!showPendingOnly) return true;
                                                                // Check if SB has any non-completed module
                                                                const sbModules = Object.values(sb.modules);
                                                                return sbModules.some(m => {
                                                                    const mDone = m.activities.filter(a => a.etat === 'termine').length;
                                                                    return mDone < m.activities.length;
                                                                });
                                                            });

                                                            if (showPendingOnly && visibleSubBranches.length === 0) return null;


                                                            return (
                                                                <div key={branch.id} className="rounded-xl overflow-hidden border border-white/5 bg-surface/20">
                                                                    <div
                                                                        onClick={() => setExpandedBranches(prev => ({ ...prev, [branch.id]: !prev[branch.id] }))}
                                                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div
                                                                                className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] bg-primary text-primary"
                                                                            />
                                                                            <span className="font-bold text-lg text-white">{branch.nom}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-16 h-1 bg-background rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-primary transition-all duration-500"
                                                                                        style={{ width: `${branchPercent}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            {branchStart ? <ChevronDown size={20} className="text-grey-medium" /> : <ChevronRight size={20} className="text-grey-medium" />}
                                                                        </div>
                                                                    </div>

                                                                    {branchStart && (
                                                                        <div className="pl-4 border-t border-white/5 flex flex-col">
                                                                            {Object.values(branch.sousBranches).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(sb => {
                                                                                const sbExpanded = expandedSubBranches[sb.id];

                                                                                // Calculate SubBranch Progress
                                                                                const allSbActivities = Object.values(sb.modules).flatMap(m => m.activities);
                                                                                const sbTotal = allSbActivities.length;
                                                                                const sbDone = allSbActivities.filter(a => a.etat === 'termine').length;
                                                                                const sbPercent = sbTotal > 0 ? Math.round((sbDone / sbTotal) * 100) : 0;

                                                                                // Filter Logic for SubBranch
                                                                                if (showPendingOnly && sbDone === sbTotal) return null;

                                                                                return (
                                                                                    <div key={sb.id} className="border-l border-white/10 ml-2">
                                                                                        <div
                                                                                            onClick={() => setExpandedSubBranches(prev => ({ ...prev, [sb.id]: !prev[sb.id] }))}
                                                                                            className="p-3 pl-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
                                                                                        >
                                                                                            <span className="text-sm font-bold text-grey-light group-hover:text-white transition-colors">{sb.nom}</span>
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className="w-12 h-1 bg-background/50 rounded-full overflow-hidden">
                                                                                                        <div
                                                                                                            className="h-full bg-primary/70 transition-all duration-500"
                                                                                                            style={{ width: `${sbPercent}%` }}
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                                {sbExpanded ? <ChevronDown size={16} className="text-grey-dark" /> : <ChevronRight size={16} className="text-grey-dark" />}
                                                                                            </div>
                                                                                        </div>

                                                                                        {sbExpanded && (
                                                                                            <div className="pl-6 pb-2 space-y-2">
                                                                                                {Object.values(sb.modules).sort((a, b) => a.nom.localeCompare(b.nom)).map(mod => {
                                                                                                    const modExpanded = expandedTreeModules[mod.id];
                                                                                                    const total = mod.activities.length;
                                                                                                    const done = mod.activities.filter(a => a.etat === 'termine').length;
                                                                                                    const modPercent = total > 0 ? Math.round((done / total) * 100) : 0;

                                                                                                    // Filter Logic for Module
                                                                                                    if (showPendingOnly && done === total) return null;

                                                                                                    return (
                                                                                                        <div key={mod.id} className="bg-black/20 rounded-lg overflow-hidden border border-white/5 text-sm">
                                                                                                            <div
                                                                                                                onClick={() => setExpandedTreeModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                                                                                                                className="p-2 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                                                                                            >
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <BookOpen size={14} className="text-primary/70" />
                                                                                                                    <span className="text-grey-light font-medium">{mod.nom}</span>
                                                                                                                </div>
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <div className="w-10 h-0.5 bg-background/50 rounded-full overflow-hidden">
                                                                                                                        <div
                                                                                                                            className="h-full bg-primary/70 transition-all duration-500"
                                                                                                                            style={{ width: `${modPercent}%` }}
                                                                                                                        />
                                                                                                                    </div>
                                                                                                                    <span className="text-[10px] text-grey-medium">{done}/{total}</span>
                                                                                                                    {modExpanded ? <ChevronDown size={14} className="text-grey-dark" /> : <ChevronRight size={14} className="text-grey-dark" />}
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {modExpanded && (
                                                                                                                <div className="border-t border-white/5 bg-black/40">
                                                                                                                    {mod.activities.sort((a, b) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map(act => (
                                                                                                                        <div key={act.id} className="p-2 pl-8 flex items-center justify-between border-b border-white/5 last:border-0">
                                                                                                                            <span className="text-xs text-grey-medium">{act.Activite?.titre}</span>
                                                                                                                            {act.etat === 'termine' ? (
                                                                                                                                <CheckCircle2 size={12} className="text-success" />
                                                                                                                            ) : act.etat === 'besoin_d_aide' ? (
                                                                                                                                <div className="flex items-center gap-1 text-danger">
                                                                                                                                    <AlertCircle size={12} />
                                                                                                                                    <span className="text-[10px] uppercase font-bold">Aide</span>
                                                                                                                                </div>
                                                                                                                            ) : (
                                                                                                                                <Clock size={12} className="text-primary" />
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {currentTab === 'todo' && (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-grey-medium">
                                    <button
                                        onClick={handleGenerateTodoPDF}
                                        className="px-6 py-3 bg-primary text-text-dark font-bold rounded-xl shadow-lg hover:bg-primary-light transition-all flex items-center gap-2"
                                    >
                                        <FileText size={20} />
                                        Créer le PDF (Classique)
                                    </button>
                                    <button
                                        onClick={handleGenerateTodoPDFModern}
                                        className="px-6 py-3 bg-white text-primary border-2 border-primary font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                                    >
                                        <FileText size={20} />
                                        Créer le PDF (Moderne)
                                    </button>
                                    <p className="text-sm italic opacity-60">Le contenu de la liste sera généré automatiquement.</p>
                                </div>
                            )}
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
