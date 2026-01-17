import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchStudentPdfData } from '../../lib/pdfUtils';
import { calculateAge } from '../../lib/utils';
import {
    Search, User as UserIcon, Calendar, GraduationCap, ShieldCheck, Loader2, ChevronRight, ChevronDown,
    Filter, Plus, X, BookOpen, Layers, Trash2, Edit, Users, CheckCircle2, Clock, AlertCircle,
    LayoutList, GitGraph, FileText, Activity, GitBranch, Camera
} from 'lucide-react';
import { isOverdue } from '../../features/tracking/utils/progressionHelpers';
import clsx from 'clsx';
import StudentModal from '../../features/students/components/StudentModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import StudentTrackingPDFModern from '../../components/StudentTrackingPDFModern';

// Hooks extraits
import { useStudentsData } from './hooks/useStudentsData';
import { useStudentProgress } from './hooks/useStudentProgress';
import { useStudentPhoto } from './hooks/useStudentPhoto';
import { useBranchIndices } from './hooks/useBranchIndices';

const Students = () => {
    const location = useLocation();
    const initialStudentId = location.state?.selectedStudentId;
    const initialTabFromNav = location.state?.initialTab;

    // --- Hooks ---
    const {
        students, setStudents, selectedStudent, setSelectedStudent, loading,
        searchQuery, setSearchQuery, filterClass, setFilterClass, filterGroup, setFilterGroup,
        showModal, isEditing, editId, studentToDelete, setStudentToDelete,
        filteredStudents, fetchStudents, handleStudentSaved, handleUpdateImportance,
        handleEdit, handleOpenCreate, handleCloseModal, handleDelete
    } = useStudentsData(initialStudentId, initialTabFromNav);

    const {
        studentProgress, loadingProgress, currentTab, setCurrentTab,
        suiviMode, setSuiviMode, showPendingOnly, setShowPendingOnly,
        expandedModules, expandedBranches, expandedSubBranches, expandedTreeModules,
        fetchStudentProgress, resetProgress,
        toggleModuleExpansion, toggleBranchExpansion, toggleSubBranchExpansion, toggleTreeModuleExpansion,
        handleUrgentValidation
    } = useStudentProgress();

    const {
        isDraggingPhoto, draggingPhotoId, updatingPhotoId, setDraggingPhotoId,
        processAndSavePhoto, handlePhotoDrop, handlePhotoDragOver, handlePhotoDragLeave, handlePhotoChange
    } = useStudentPhoto(setSelectedStudent, setStudents);

    const {
        branches, studentIndices, fetchBranches, loadUserPreferences, handleUpdateBranchIndex
    } = useBranchIndices();

    // --- Effects ---
    useEffect(() => {
        fetchStudents();
        fetchBranches();
        loadUserPreferences();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentProgress(selectedStudent.id, students, selectedStudent);

            if (location.state?.initialTab && location.state?.selectedStudentId === selectedStudent.id) {
                setCurrentTab(location.state.initialTab);
            } else {
                setCurrentTab('infos');
            }

            resetProgress();
        } else {
            resetProgress();
        }
    }, [selectedStudent, location.state]);

    // --- Logging Overdue Work ---
    useEffect(() => {
        if (!loadingProgress && selectedStudent && studentProgress.length > 0) {
            const now = new Date();
            const overdueModules = {};
            let hasOverdueWork = false;

            studentProgress.forEach(p => {
                const module = p.Activite?.Module;
                const status = p.etat;

                // Check if module exists, has a deadline, and activity is not done
                if (!module || !module.date_fin || status === 'termine') return;

                // Check if overdue
                const endDate = new Date(module.date_fin);
                // Reset time part to ensure we only compare dates effectively (though user probably means strictly past deadline)
                // If deadline is today, is it overdue? Usually overdue means past the date. 
                // Let's assume strict inequality: now > endDate
                if (endDate >= now) return;

                if (!overdueModules[module.id]) {
                    overdueModules[module.id] = {
                        ...module,
                        activities: []
                    };
                }
                overdueModules[module.id].activities.push(p.Activite.titre);
                hasOverdueWork = true;
            });

            if (hasOverdueWork) {
                const sortedModules = Object.values(overdueModules).sort((a, b) => {
                    // Sort by Date
                    const dateA = new Date(a.date_fin);
                    const dateB = new Date(b.date_fin);
                    if (dateA - dateB !== 0) return dateA - dateB;

                    // Sort by Branch
                    const branchA = a.SousBranche?.Branche?.nom || '';
                    const branchB = b.SousBranche?.Branche?.nom || '';
                    if (branchA.localeCompare(branchB) !== 0) return branchA.localeCompare(branchB);

                    // Sort by Module Name
                    return a.nom.localeCompare(b.nom);
                });

                const totalOverdueActivities = sortedModules.reduce((acc, mod) => acc + mod.activities.length, 0);

                console.groupCollapsed(`%c📅 Travaux en retard pour ${selectedStudent.prenom} ${selectedStudent.nom} (${totalOverdueActivities} ateliers)`, 'font-size: 14px; font-weight: bold; color: #e11d48; background: #ffe4e6; padding: 4px 8px; border-radius: 4px;');

                sortedModules.forEach(mod => {
                    const dateStr = new Date(mod.date_fin).toLocaleDateString('fr-FR');
                    const branchName = mod.SousBranche?.Branche?.nom ? `[${mod.SousBranche.Branche.nom}] ` : '';

                    console.groupCollapsed(`%c${branchName}${mod.nom} %c(${dateStr}) - ${mod.activities.length} atelier(s) restant(s)`, 'font-weight: bold; color: #2563eb;', 'color: #dc2626; font-weight: bold;');

                    mod.activities.forEach(actName => {
                        console.log(`%c• ${actName}`, 'color: #4b5563; margin-left: 10px;');
                    });

                    console.groupEnd();
                });

                console.groupEnd();
            }
        }
    }, [loadingProgress, selectedStudent, studentProgress]);

    // --- PDF Generation ---
    const generatePDF = async () => {
        if (!selectedStudent) {
            alert("Aucun élève sélectionné.");
            return;
        }

        try {
            const pdfResult = await fetchStudentPdfData(selectedStudent.id, selectedStudent.niveau_id);
            if (!pdfResult || pdfResult.modules.length === 0) {
                alert("Aucune activité à faire trouvée.");
                return;
            }

            const pdfData = {
                studentName: `${selectedStudent.prenom} ${selectedStudent.nom}`,
                printDate: new Date().toLocaleDateString('fr-FR'),
                modules: pdfResult.modules
            };

            // Dynamic import PDF library
            const { pdf } = await import('@react-pdf/renderer');
            const { saveAs } = await import('file-saver');

            const blob = await pdf(<StudentTrackingPDFModern data={pdfData} />).toBlob();
            const fileName = `ToDoList_Suivi_${selectedStudent.prenom}_${selectedStudent.nom}.pdf`;

            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return;
                }
            } catch (err) { }

            saveAs(blob, fileName);
        } catch (error) {
            alert("Erreur lors de la génération du PDF.");
        }
    };

    // --- Render Helper Functions ---
    const renderJournalView = () => {
        const moduleGroups = Object.values(studentProgress.reduce((acc, p) => {
            const mod = p.Activite?.Module;
            if (!mod) return acc;
            if (!acc[mod.id]) acc[mod.id] = { ...mod, activities: [] };
            acc[mod.id].activities.push(p);
            return acc;
        }, {}));

        return moduleGroups
            .sort((a, b) => {
                if (a.date_fin && b.date_fin) {
                    if (a.date_fin !== b.date_fin) return new Date(a.date_fin) - new Date(b.date_fin);
                } else if (a.date_fin) return -1;
                else if (b.date_fin) return 1;
                const aBOrder = a.SousBranche?.Branche?.ordre || 0;
                const bBOrder = b.SousBranche?.Branche?.ordre || 0;
                if (aBOrder !== bBOrder) return aBOrder - bBOrder;
                const aSBOrder = a.SousBranche?.ordre || 0;
                const bSBOrder = b.SousBranche?.ordre || 0;
                if (aSBOrder !== bSBOrder) return aSBOrder - bSBOrder;
                return a.nom.localeCompare(b.nom);
            })
            .map(module => {
                const activities = module.activities;
                const completedCount = activities.filter(a => a.etat === 'termine').length;
                const totalCount = activities.length;
                const percent = Math.round((completedCount / totalCount) * 100);
                const isExpanded = expandedModules[module.id];

                if (showPendingOnly && completedCount === totalCount) return null;

                return (
                    <div key={module.id} className="bg-surface/30 border border-white/5 rounded-xl overflow-hidden hover:border-primary/20 transition-all">
                        <div
                            onClick={() => toggleModuleExpansion(module.id)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg"><Layers size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-text-main">
                                        {module.nom}
                                        {module.date_fin && <span className="text-primary/70 font-black ml-1 text-xs">({format(new Date(module.date_fin), 'dd/MM', { locale: fr })})</span>}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                                {isExpanded ? <ChevronDown size={20} className="text-grey-medium" /> : <ChevronRight size={20} className="text-grey-medium" />}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-white/5 bg-black/20">
                                {activities.sort((a, b) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map(p => (
                                    <div key={p.id} className="p-3 pl-16 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                        <h4 className="text-sm text-grey-light font-medium group-hover:text-white transition-colors">{p.Activite?.titre}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-grey-dark font-mono">{new Date(p.updated_at).toLocaleDateString()}</span>
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
            });
    };

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

                    {/* Filters Row */}
                    <div className="flex gap-2">
                        <div className="relative group neu-selector-container rounded-xl overflow-hidden min-w-[120px]">
                            <select
                                value={filterGroup}
                                onChange={(e) => setFilterGroup(e.target.value)}
                                className="w-full bg-transparent border-none py-2 pl-3 pr-6 text-[10px] font-bold text-white uppercase tracking-wider focus:ring-0 outline-none appearance-none cursor-pointer truncate"
                            >
                                <option value="all" className="bg-background text-grey-medium">Groupes: Tts</option>
                                {Array.from(new Set(students.flatMap(s => s.EleveGroupe?.map(eg => eg.Groupe?.nom)).filter(Boolean))).sort().map(g => (
                                    <option key={g} value={g} className="bg-background text-text-main">{g}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-hover:text-primary transition-colors">
                                <Users size={12} />
                            </div>
                        </div>

                        <div className="relative group neu-selector-container rounded-xl overflow-hidden min-w-[120px]">
                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                className="w-full bg-transparent border-none py-2 pl-3 pr-6 text-[10px] font-bold text-white uppercase tracking-wider focus:ring-0 outline-none appearance-none cursor-pointer truncate"
                            >
                                <option value="all" className="bg-background text-grey-medium">Classes: Tts</option>
                                {Array.from(new Set(students.map(s => s.Classe?.nom).filter(Boolean))).map(c => (
                                    <option key={c} value={c} className="bg-background text-text-main">{c}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-hover:text-primary transition-colors">
                                <Filter size={12} />
                            </div>
                        </div>
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
                                <div
                                    className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden relative group/photo cursor-pointer transition-all",
                                        selectedStudent?.id === student.id ? "bg-white/20 text-text-dark" : "bg-background text-primary",
                                        student.photo_base64 && "bg-[#D9B981]",
                                        draggingPhotoId === student.id && "ring-2 ring-primary scale-110 bg-primary/20"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(student.id); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(null); }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDraggingPhotoId(null);
                                        const file = e.dataTransfer.files[0];
                                        if (file) await processAndSavePhoto(file, student);
                                    }}
                                >
                                    {updatingPhotoId === student.id ? (
                                        <Loader2 className="animate-spin text-primary" size={16} />
                                    ) : student.photo_base64 ? (
                                        <img src={student.photo_base64} alt="Student" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <>{student.prenom[0]}{student.nom[0]}</>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                        <Camera className="text-white" size={14} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handlePhotoChange(e, student)}
                                        />
                                    </div>
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
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 bg-surface/20 flex flex-col justify-between items-start gap-6">
                            <div className="flex gap-6 items-center w-full">
                                <div
                                    className={clsx(
                                        "w-24 h-24 rounded-2xl border-4 flex items-center justify-center text-3xl font-bold transition-all duration-300 shadow-2xl shrink-0 overflow-hidden relative group cursor-pointer",
                                        isDraggingPhoto ? "border-primary bg-primary/20 scale-105" : "border-background",
                                        selectedStudent.photo_base64 ? "bg-[#D9B981]" : "bg-surface"
                                    )}
                                    onDragOver={handlePhotoDragOver}
                                    onDragLeave={handlePhotoDragLeave}
                                    onDrop={(e) => handlePhotoDrop(e, selectedStudent)}
                                >
                                    {updatingPhotoId === selectedStudent.id ? (
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    ) : selectedStudent.photo_base64 ? (
                                        <img src={selectedStudent.photo_base64} alt="Student" className="w-[90%] h-[90%] object-contain" />
                                    ) : (
                                        <>{selectedStudent.prenom[0]}{selectedStudent.nom[0]}</>
                                    )}

                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white mb-1" size={24} />
                                        <span className="text-[10px] text-white font-black uppercase tracking-tighter">Changer</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handlePhotoChange(e, selectedStudent)}
                                        />
                                    </div>

                                    {isDraggingPhoto && (
                                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                                            <Plus className="text-primary animate-bounce" size={40} />
                                        </div>
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

                            {/* Tabs */}
                            <div className="flex justify-center w-full px-8 mb-4 mt-2">
                                <div className="neu-selector-container p-1 rounded-2xl w-full">
                                    {['infos', 'suivi', 'todo', 'urgent'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setCurrentTab(tab)}
                                            data-active={currentTab === tab}
                                            className={clsx(
                                                "flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.12em] transition-all duration-300",
                                                currentTab === tab ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                                            )}
                                        >
                                            <span className="tab-label">
                                                {tab === 'infos' ? 'Informations' :
                                                    tab === 'suivi' ? 'Suivi Pédagogique' :
                                                        tab === 'todo' ? 'To-Do List' :
                                                            'Suivi Urgent'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                            {currentTab === 'infos' && (
                                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Parcours Scolaire</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-white/5 text-primary"><BookOpen size={24} /></div>
                                                <p className="text-text-main font-bold text-lg">{selectedStudent.Classe?.nom || 'Non affecté'}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-white/5 text-primary"><Layers size={24} /></div>
                                                <p className="text-text-main font-bold text-lg">{selectedStudent.Niveau?.nom || 'Non renseigné'}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-white/5 text-primary"><Calendar size={24} /></div>
                                                <p className="text-text-main font-bold text-lg">{calculateAge(selectedStudent.date_naissance)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Informations & Responsables</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-white/5 text-primary"><ShieldCheck size={18} /></div>
                                                <div>
                                                    <p className="text-xs text-grey-medium">Équipe Enseignante</p>
                                                    <div className="space-y-1 mt-1">
                                                        {selectedStudent.Classe?.ClasseAdulte?.length > 0 ? (
                                                            selectedStudent.Classe.ClasseAdulte.map((ca, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                                    <p className="text-text-main font-bold truncate">{ca.Adulte.prenom} {ca.Adulte.nom}</p>
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

                                    {/* Branch Indices */}
                                    <div className="md:col-span-2 space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-grey-dark border-b border-white/5 pb-2">Indices de Branche (Performance)</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
                                            <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex flex-col gap-0.5 shadow-lg hover:bg-white/10 transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden px-1">
                                                    <Activity size={12} className="text-primary shrink-0" />
                                                    <span className="text-xs font-bold text-gray-300 truncate" title="Importance Globale">Global</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="50"
                                                    className="w-full bg-black/20 text-center text-xs font-mono font-bold text-white rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                    value={selectedStudent.importance_suivi ?? ''}
                                                    onChange={(e) => handleUpdateImportance(e.target.value)}
                                                />
                                            </div>

                                            {branches.map(branch => {
                                                const val = studentIndices[selectedStudent.id]?.[branch.id];
                                                return (
                                                    <div key={branch.id} className="bg-white/5 p-1 rounded-xl border border-white/5 flex flex-col gap-0.5 shadow-lg hover:bg-white/10 transition-colors">
                                                        <div className="flex items-center gap-2 overflow-hidden px-1">
                                                            <GitBranch size={12} className="text-primary shrink-0" />
                                                            <span className="text-xs font-bold text-gray-300 truncate" title={branch.nom}>{branch.nom}</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="50"
                                                            className="w-full bg-black/20 text-center text-xs font-mono font-bold text-white rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                            value={val ?? ''}
                                                            onChange={(e) => handleUpdateBranchIndex(selectedStudent.id, branch.id, e.target.value)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentTab === 'suivi' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex w-full justify-center">
                                        <div className="neu-selector-container flex p-1.5 rounded-2xl w-full max-w-md">
                                            <button
                                                onClick={() => setSuiviMode('journal')}
                                                data-active={suiviMode === 'journal'}
                                                className={clsx(
                                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-300",
                                                    suiviMode === 'journal' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <LayoutList size={14} /> Journal
                                            </button>
                                            <button
                                                onClick={() => setSuiviMode('progression')}
                                                data-active={suiviMode === 'progression'}
                                                className={clsx(
                                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-300",
                                                    suiviMode === 'progression' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <GitGraph size={14} /> Progression
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowPendingOnly(!showPendingOnly)}
                                            className={clsx(
                                                "text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                                                showPendingOnly ? "bg-primary/10 border-primary text-primary" : "bg-surface/30 border-white/5 text-grey-medium hover:text-white"
                                            )}
                                        >
                                            <Filter size={12} />
                                            {showPendingOnly ? "En cours uniquement" : "Tout afficher"}
                                        </button>
                                    </div>

                                    {loadingProgress ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
                                    ) : studentProgress.length === 0 ? (
                                        <div className="text-center p-8 text-grey-medium opacity-60 italic">Aucune activité commencée.</div>
                                    ) : (
                                        <div className="space-y-4">{suiviMode === 'journal' && renderJournalView()}</div>
                                    )}
                                </div>
                            )}

                            {currentTab === 'urgent' && (() => {
                                const now = new Date();
                                const overdueModules = {};
                                let hasOverdueWork = false;
                                let totalOverdueCount = 0;

                                studentProgress.forEach(p => {
                                    const module = p.Activite?.Module;

                                    // Check if overdue: not finished AND deadline passed AND module is 'en_cours'
                                    if (isOverdue(p, now)) {
                                        const moduleId = p.Activite.Module.id;
                                        if (!overdueModules[moduleId]) {
                                            overdueModules[moduleId] = {
                                                ...module,
                                                activities: []
                                            };
                                        }
                                        overdueModules[moduleId].activities.push(p);
                                        hasOverdueWork = true;
                                        totalOverdueCount++;
                                    }
                                });

                                const sortedModules = Object.values(overdueModules).sort((a, b) => {
                                    // 1. Date Fin (Closest deadlines first)
                                    if (a.date_fin !== b.date_fin) {
                                        if (!a.date_fin) return 1;
                                        if (!b.date_fin) return -1;
                                        return a.date_fin.localeCompare(b.date_fin);
                                    }

                                    const branchA = a.SousBranche?.Branche;
                                    const branchB = b.SousBranche?.Branche;
                                    const subBranchA = a.SousBranche;
                                    const subBranchB = b.SousBranche;

                                    // 2. Branch Order
                                    if (branchA?.ordre !== branchB?.ordre) {
                                        return (branchA?.ordre ?? 999) - (branchB?.ordre ?? 999);
                                    }

                                    // 3. Branch Name
                                    if (branchA?.nom !== branchB?.nom) {
                                        return (branchA?.nom || '').localeCompare(branchB?.nom || '');
                                    }

                                    // 4. SubBranch Order
                                    if (subBranchA?.ordre !== subBranchB?.ordre) {
                                        return (subBranchA?.ordre ?? 999) - (subBranchB?.ordre ?? 999);
                                    }

                                    // 5. SubBranch Name
                                    if (subBranchA?.nom !== subBranchB?.nom) {
                                        return (subBranchA?.nom || '').localeCompare(subBranchB?.nom || '');
                                    }

                                    // 6. Module Name
                                    return a.nom.localeCompare(b.nom);
                                });

                                return (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <h3 className="text-xl font-bold text-danger flex items-center gap-2 mb-4">
                                            <AlertCircle size={24} />
                                            Travaux en Retard : {totalOverdueCount} ateliers
                                        </h3>

                                        {!hasOverdueWork ? (
                                            <div className="flex flex-col items-center justify-center p-12 text-center text-grey-medium opacity-60">
                                                <CheckCircle2 size={48} className="mb-4 text-success" />
                                                <p className="text-lg font-medium">Aucun travail en retard !</p>
                                                <p className="text-sm">Tout est à jour.</p>
                                            </div>
                                        ) : (
                                            sortedModules.map(module => {
                                                const isExpanded = expandedModules[module.id];
                                                const branchName = module.SousBranche?.Branche?.nom;

                                                return (
                                                    <div key={module.id} className="bg-danger/5 border border-danger/20 rounded-xl overflow-hidden hover:border-danger/40 transition-all">
                                                        <div
                                                            onClick={() => toggleModuleExpansion(module.id)}
                                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-2 bg-danger/10 text-danger rounded-lg"><AlertCircle size={20} /></div>
                                                                <div>
                                                                    <h3 className="font-bold text-text-main flex items-center gap-2">
                                                                        {branchName && <span className="text-xs uppercase tracking-wider text-grey-medium font-normal">[{branchName}]</span>}
                                                                        {module.nom}
                                                                        <span className="text-danger font-black ml-1 text-xs">({format(new Date(module.date_fin), 'dd/MM', { locale: fr })})</span>
                                                                    </h3>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-xs font-bold text-danger uppercase tracking-wider bg-danger/10 px-2 py-1 rounded">
                                                                    {module.activities.length} Ateliers
                                                                </span>
                                                                {isExpanded ? <ChevronDown size={20} className="text-grey-medium" /> : <ChevronRight size={20} className="text-grey-medium" />}
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="border-t border-danger/10 bg-black/20">
                                                                {module.activities.sort((a, b) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map(p => (
                                                                    <div key={p.id} className="p-3 pl-16 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                                        <h4 className="text-sm text-grey-light font-medium group-hover:text-white transition-colors">{p.Activite?.titre}</h4>
                                                                        <div className="flex items-center gap-3">
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleUrgentValidation(p.Activite.id, selectedStudent.id, studentIndices);
                                                                                }}
                                                                                className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 bg-danger/20 text-danger animate-pulse cursor-pointer hover:bg-danger/30 hover:scale-105 transition-all"
                                                                            >
                                                                                <Clock size={10} />
                                                                                En Retard
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                );
                            })()}

                            {currentTab === 'todo' && (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-grey-medium">
                                    <button
                                        onClick={generatePDF}
                                        className="px-6 py-3 bg-white text-primary border-2 border-primary font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                                    >
                                        <FileText size={20} />
                                        Créer le PDF
                                    </button>
                                    <p className="text-sm italic opacity-60">Le contenu sera généré automatiquement.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Delete Modal */}
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
