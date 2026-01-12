import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Layers, Plus, X, Loader2, Trash2, BookOpen, Search, ChevronRight, GraduationCap, Edit, Camera, LayoutList, FileText, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import StudentModal from '../components/StudentModal';
import AddStudentToGroupModal from '../components/AddStudentToGroupModal';
import AddGroupModal from '../components/AddGroupModal';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb } from 'pdf-lib';
import StudentTrackingPDFModern from '../components/StudentTrackingPDFModern';

// --- SORTABLE ITEM COMPONENT ---
function SortableGroupItem({ group, selectedGroup, onClick, onEdit, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onClick(group)}
            className={clsx(
                "w-full flex items-center gap-4 p-4 rounded-xl transition-all border text-left group relative cursor-pointer",
                isDragging ? "opacity-50 bg-background/50 border-primary/50 shadow-lg" : "",
                selectedGroup?.id === group.id
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="p-2 -ml-2 text-grey-dark hover:text-white cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Déplacer"
            >
                <GripVertical size={16} />
            </div>

            <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
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
                    onClick={(e) => { e.stopPropagation(); onEdit(group); }}
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
                onClick={(e) => { e.stopPropagation(); onDelete(group); }}
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
    );
}

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
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const abortRef = useRef(false);

    // --- REMOVE STUDENT MODAL LOGIC ---
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);

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

    useEffect(() => {
        const handleEsc = (e) => {
            if (loading && e.key === 'Escape') {
                handleCancelGeneration();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [loading]);

    const handleCancelGeneration = () => {
        if (loading) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    };

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
            // Try to order by 'ordre' then 'nom'
            const { data, error } = await supabase
                .from('Groupe')
                .select('*')
                .order('ordre', { ascending: true })
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
            // Fallback for missing 'ordre' column
            if (error.code === '42703' || error.message?.includes('does not exist')) {
                const { data: fallbackData } = await supabase.from('Groupe').select('*').order('nom');
                setGroups(fallbackData || []);

                // Re-sync selected group
                if (selectedGroup) {
                    const updated = fallbackData?.find(g => g.id === selectedGroup.id);
                    if (updated) setSelectedGroup(updated);
                } else if (fallbackData && fallbackData.length > 0) {
                    setSelectedGroup(fallbackData[0]);
                }
            } else { }
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
        } catch (error) { }
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
        } catch (error) { } finally {
            setLoadingStudents(false);
        }
    };

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

    // --- REORDER LOGIC ---
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = groups.findIndex(g => g.id === active.id);
        const newIndex = groups.findIndex(g => g.id === over.id);

        // Optimistic Update
        const newGroups = arrayMove(groups, oldIndex, newIndex);
        setGroups(newGroups);

        // Update Backend - use individual updates instead of upsert to avoid RLS issues
        try {
            await Promise.all(newGroups.map((g, index) =>
                supabase
                    .from('Groupe')
                    .update({ ordre: index })
                    .eq('id', g.id)
            ));
        } catch (error) {
            // Revert on error
            fetchGroups();
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

    // Remove Student Modal Handlers
    const handleRemoveClick = (e, student) => {
        e.stopPropagation();
        setStudentToRemove(student);
        setShowRemoveModal(true);
    };

    const confirmRemoveStudent = async () => {
        if (!selectedGroup || !studentToRemove) return;

        try {
            const { error } = await supabase
                .from('EleveGroupe')
                .delete()
                .match({ eleve_id: studentToRemove.id, groupe_id: selectedGroup.id });

            if (error) throw error;
            fetchStudentsInGroup(selectedGroup.id);
            setShowRemoveModal(false);
            setStudentToRemove(null);
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    // The logic to generate the PDF
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
                if (err.name === 'AbortError') return;
            }
        }

        setLoading(true);
        abortRef.current = false; // Reset abort flag
        setProgress(10);
        setProgressText('Récupération des données...');

        try {
            if (abortRef.current) throw new Error('ABORTED');

            // 2. Fetch data needed for PDF generation
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

                const activeModules = modulesData.map(module => {
                    if (!module.date_fin) return null;

                    const moduleActivities = module.Activite || [];

                    // Filter activities: Must have a progression AND not be validated
                    const relevantActivities = moduleActivities.filter(act => {
                        const prog = studentProgress.find(p => p.activite_id === act.id);
                        return prog && prog.statut !== 'valide';
                    });

                    if (relevantActivities.length === 0) return null;

                    return {
                        title: module.nom,
                        dueDate: module.date_fin,
                        activities: relevantActivities.map(a => ({
                            name: a.titre
                        }))
                    };
                }).filter(Boolean);

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

            setProgress(10);
            setProgressText('Préparation de la fusion...');

            // 4. Generate & Merge PDFs
            const mergedPdf = await PDFDocument.create();

            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 10 + Math.round((processed / bulkData.length) * 70);
                setProgress(percentage);
                setProgressText(`Génération : ${studentData.studentName}...`);

                const blob = await pdf(<StudentTrackingPDFModern data={studentData} />).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            let finalPdfBlob;

            // 6. Eco Mode (2 pages per sheet)
            if (ecoMode) {
                setProgress(82);
                setProgressText('Mise en page LIVRET A5...');

                const bookletPdf = await PDFDocument.create();
                const mergedPdfBytes = await mergedPdf.save();
                const srcDoc = await PDFDocument.load(mergedPdfBytes);
                const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());
                const pageCount = embeddedPages.length;

                for (let i = 0; i < pageCount; i += 2) {
                    if (abortRef.current) throw new Error('ABORTED');

                    const assemblyPercentage = 82 + Math.round((i / pageCount) * 13);
                    setProgress(assemblyPercentage);
                    setProgressText(`Assemblage page ${Math.floor(i / 2) + 1}...`);

                    const page = bookletPdf.addPage([841.89, 595.28]);
                    const leftPage = embeddedPages[i];

                    page.drawPage(leftPage, {
                        x: 0,
                        y: 0,
                        width: 420.945,
                        height: 595.28
                    });

                    if (i + 1 < pageCount) {
                        const rightPage = embeddedPages[i + 1];
                        page.drawPage(rightPage, {
                            x: 420.945,
                            y: 0,
                            width: 420.945,
                            height: 595.28
                        });
                    }

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
                const mergedPdfBytes = await mergedPdf.save();
                finalPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            }

            setProgress(90);
            setProgressText('Finalisation du fichier...');

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                saveAs(finalPdfBlob, filename);
            }

            setProgress(100);
            setProgressText('Téléchargement terminé !');
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 2000);

        } catch (error) {
            if (error.message !== 'ABORTED') {
                alert("Erreur lors de la génération du PDF.");
            }
        } finally {
            setLoading(false);
            setProgress(0);
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

                        {/* Tabs - Modern Capsule Style */}
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
                isOpen={showAddToGroupModal}
                onClose={() => setShowAddToGroupModal(false)}
                groupId={selectedGroup?.id}
                onAdded={() => {
                    fetchStudentsInGroup(selectedGroup.id);
                    fetchGroups(); // Update counts
                }}
            />

            {/* CONFIRMATION MODAL FOR REMOVAL */}
            {showRemoveModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-card-bg border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
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
