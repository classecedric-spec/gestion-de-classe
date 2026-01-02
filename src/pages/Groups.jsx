import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Layers, Plus, X, Loader2, Trash2, BookOpen, Search, ChevronRight, GraduationCap, Edit, Camera, LayoutList, FileText } from 'lucide-react';
import clsx from 'clsx';
import StudentModal from '../components/StudentModal';
import AddStudentToGroupModal from '../components/AddStudentToGroupModal';
import AddGroupModal from '../components/AddGroupModal';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb } from 'pdf-lib';
import StudentTrackingPDFModern from '../components/StudentTrackingPDFModern';

const Groups = () => {
    const navigate = useNavigate();
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
    const [activeTab, setActiveTab] = useState('students');

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

    const handleGenerateGroupTodoList = async (ecoMode = false) => {
        if (!selectedGroup || studentsInGroup.length === 0) return;

        const filename = `Listes_Travail_${selectedGroup.nom.replace(/\s+/g, '_')}${ecoMode ? '_ECO' : ''}.pdf`;
        let fileHandle = null;

        // 1. Try to open Save Dialog immediately (User Gesture context)
        if (window.showSaveFilePicker) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
            } catch (err) {
                // If user cancelled, stop everything
                if (err.name === 'AbortError') return;
                // Otherwise continue and try fallback later
                console.warn('File picker failed, falling back to download', err);
            }
        }

        setLoading(true);

        try {
            // 2. Fetch data needed for PDF generation
            // Fetch all modules with activities
            const { data: modulesData, error: modulesError } = await supabase
                .from('Module')
                .select(`
                    id,
                    nom,
                    date_fin,
                    Activite (
                        id,
                        titre
                    )
                `)
                .order('date_fin', { ascending: true });

            if (modulesError) throw modulesError;

            // Fetch all progressions for students in this group
            const { data: progressions, error: progError } = await supabase
                .from('Progression')
                .select('*')
                .in('eleve_id', studentsInGroup.map(s => s.id));

            if (progError) throw progError;

            // 3. Build bulk data for PDF
            const bulkData = studentsInGroup.map(student => {
                const studentProgress = progressions.filter(p => p.eleve_id === student.id);

                const activeModules = modulesData.filter(module => {
                    if (!module.date_fin) return false;

                    // Check completion
                    const moduleActivities = module.Activite || [];
                    if (moduleActivities.length === 0) return false;

                    const allValidated = moduleActivities.every(act => {
                        const prog = studentProgress.find(p => p.activite_id === act.id);
                        return prog && prog.statut === 'valide';
                    });

                    if (allValidated) return false; // Hide completed modules

                    return true;
                }).map(m => ({
                    title: m.nom,
                    dueDate: m.date_fin,
                    activities: m.Activite.map(a => ({
                        name: a.titre
                    }))
                }));

                if (activeModules.length === 0) return null;

                return {
                    studentName: `${student.prenom} ${student.nom}`,
                    modules: activeModules,
                    printDate: new Date().toLocaleDateString('fr-FR')
                };
            }).filter(Boolean);

            if (bulkData.length === 0) {
                alert("Aucun travail à faire trouvé pour ce groupe.");
                setLoading(false);
                return;
            }

            // 4. Generate & Merge PDFs
            // We create a new PDF Document to merge individual student PDFs
            // This ensures page numbering (1/N) is reset for each student
            const mergedPdf = await PDFDocument.create();

            for (const studentData of bulkData) {
                // Generate individual PDF blob for this student
                // We use the 'data' prop to generate a single-student document
                const blob = await pdf(<StudentTrackingPDFModern data={studentData} />).toBlob();
                const arrayBuffer = await blob.arrayBuffer();

                // Load into pdf-lib
                const studentDoc = await PDFDocument.load(arrayBuffer);

                // Copy pages
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            let finalPdfBlob;

            // 6. Eco Mode (2 pages per sheet)
            if (ecoMode) {
                const bookletPdf = await PDFDocument.create();

                // We need to save and reload to be able to embed the merged pages
                const mergedPdfBytes = await mergedPdf.save();
                const srcDoc = await PDFDocument.load(mergedPdfBytes);

                // Embed all pages
                const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());

                const pageCount = embeddedPages.length;

                for (let i = 0; i < pageCount; i += 2) {
                    // Create A4 Landscape page (approx [841.89, 595.28])
                    const page = bookletPdf.addPage([841.89, 595.28]);

                    // Left Page (i)
                    const leftPage = embeddedPages[i];

                    page.drawPage(leftPage, {
                        x: 0,
                        y: 0,
                        width: 420.945, // Half width
                        height: 595.28 // Full height
                    });

                    // Right Page (i+1)
                    if (i + 1 < pageCount) {
                        const rightPage = embeddedPages[i + 1];
                        page.drawPage(rightPage, {
                            x: 420.945,
                            y: 0,
                            width: 420.945,
                            height: 595.28
                        });
                    }

                    // Divider Line
                    page.drawLine({
                        start: { x: 420.945, y: 0 },
                        end: { x: 420.945, y: 595.28 },
                        thickness: 1,
                        color: rgb(0, 0, 0),
                    });
                }

                const bookletBytes = await bookletPdf.save();
                finalPdfBlob = new Blob([bookletBytes], { type: 'application/pdf' });
            } else {
                // 5. Standard Save
                const mergedPdfBytes = await mergedPdf.save();
                finalPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            }

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                saveAs(finalPdfBlob, filename);
            }

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            setLoading(false);
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

                        {/* Tabs */}
                        <div className="flex items-center gap-1 px-8 border-b border-white/5 bg-surface/20">
                            <button
                                onClick={() => setActiveTab('students')}
                                className={clsx(
                                    "px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'students' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-white"
                                )}
                            >
                                <GraduationCap size={16} />
                                Liste des élèves
                            </button>
                            <button
                                onClick={() => setActiveTab('actions')}
                                className={clsx(
                                    "px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'actions' ? "border-primary text-primary" : "border-transparent text-grey-medium hover:text-white"
                                )}
                            >
                                <LayoutList size={16} />
                                Boutons d'action
                            </button>
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
                                                        onClick={(e) => handleRemoveStudentFromGroup(e, student.id)}
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

                                                        {/* Edit Button */}
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
                                        <span className="font-medium">Nouveau Groupe</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Actions Tab */}
                        {activeTab === 'actions' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-grey-dark p-12 text-center bg-background/20">
                                <div className="w-full max-w-md space-y-4">
                                    <div className="bg-surface/50 p-6 rounded-2xl border border-white/10 shadow-lg">
                                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-text-main mb-2">Générer les listes de travail</h3>
                                        <p className="text-sm text-grey-medium mb-6">
                                            Téléchargez un fichier PDF unique contenant les listes de travail (To-Do Lists) pour tous les élèves de ce groupe.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleGenerateGroupTodoList(false)}
                                                disabled={loading}
                                                className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                                                <span className="text-sm">Standard (A4)</span>
                                            </button>
                                            <button
                                                onClick={() => handleGenerateGroupTodoList(true)}
                                                disabled={loading}
                                                className="w-full py-3 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold shadow-lg shadow-secondary/20 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                title="2 pages par feuille, mode paysage"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : <div className="flex gap-0.5"><FileText size={16} /><FileText size={16} /></div>}
                                                <span className="text-sm">Éco (A5)</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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
