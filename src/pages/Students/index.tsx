import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchStudentPdfData } from '../../lib/pdf';
import { calculateAge } from '../../lib/helpers';
import {
    Search, User as UserIcon, Calendar, GraduationCap, ShieldCheck, Loader2, ChevronRight, ChevronDown,
    Filter, Plus, X, BookOpen, Layers, Edit, Users, CheckCircle2, Clock, AlertCircle,
    LayoutList, GitGraph, FileText, Activity, GitBranch, SlidersHorizontal
} from 'lucide-react';
import { isOverdue } from '../../features/tracking/utils/progressionHelpers';
import clsx from 'clsx';
import StudentModal from '../../features/students/components/StudentModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import StudentTrackingPDFModern from '../../components/StudentTrackingPDFModern';

// Nouveaux composants UI
import { Badge, Avatar, EmptyState, Button, ConfirmModal, SearchBar, FilterSelect, CardInfo, CardList, CardTabs, SmartTabs, InfoSection, InfoRow, InfoSectionEditable, InfoRowEditable } from '../../components/ui';

// Hooks extraits
import { useStudentsData } from './hooks/useStudentsData';
import { useStudentProgress } from './hooks/useStudentProgress';
import { useStudentPhoto } from './hooks/useStudentPhoto';
import { useBranchIndices } from './hooks/useBranchIndices';

const Students: React.FC = () => {
    const location = useLocation();
    const initialStudentId = location.state?.selectedStudentId;
    const [showFilters, setShowFilters] = React.useState(false);

    // --- Height Synchronization ---
    const leftContentRef = React.useRef<HTMLDivElement>(null);
    const rightContentRef = React.useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = React.useState<number | undefined>(undefined);

    // --- Hooks ---
    const {
        students, setStudents, selectedStudent, setSelectedStudent, loading,
        searchQuery, setSearchQuery, filterClass, setFilterClass, filterGroup, setFilterGroup,
        showModal, isEditing, editId, studentToDelete, setStudentToDelete,
        filteredStudents, fetchStudents, handleStudentSaved, handleUpdateImportance,
        handleEdit, handleOpenCreate, handleCloseModal, handleDelete
    } = useStudentsData(initialStudentId);

    const {
        studentProgress, loadingProgress, currentTab, setCurrentTab,
        suiviMode, setSuiviMode, showPendingOnly, setShowPendingOnly,
        expandedModules,
        fetchStudentProgress, resetProgress,
        toggleModuleExpansion,
        handleUrgentValidation
    } = useStudentProgress();

    const {
        isDraggingPhoto, draggingPhotoId, updatingPhotoId, setDraggingPhotoId,
        processAndSavePhoto, handlePhotoDrop, handlePhotoDragOver, handlePhotoDragLeave
    } = useStudentPhoto(setSelectedStudent, setStudents);

    const {
        branches, studentIndices, fetchBranches, loadUserPreferences, handleUpdateBranchIndex
    } = useBranchIndices();

    // --- Height Measure Effect (Inner Content Strategy) ---
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
    }, [students.length, showFilters, selectedStudent, searchQuery, filterGroup, filterClass]);

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
            interface OverdueModule {
                id: string;
                nom: string;
                date_fin: string | null;
                SousBranche: {
                    ordre: number | null;
                    Branche: {
                        nom: string;
                        ordre: number | null;
                    } | null;
                } | null;
                activities: string[];
            }
            const overdueModules: Record<string, OverdueModule> = {};
            let hasOverdueWork = false;

            studentProgress.forEach(p => {
                const module = p.Activite?.Module;
                const status = p.etat;

                if (!module || !module.date_fin || status === 'termine') return;

                const endDate = new Date(module.date_fin);
                if (endDate >= now) return;

                if (!overdueModules[module.id]) {
                    overdueModules[module.id] = {
                        ...module,
                        activities: []
                    };
                }
                overdueModules[module.id].activities.push(p.Activite?.titre || 'Activité sans titre');
                hasOverdueWork = true;
            });

            if (hasOverdueWork) {
                const sortedModules = Object.values(overdueModules).sort((a, b) => {
                    if (!a.date_fin && !b.date_fin) return 0;
                    if (!a.date_fin) return 1;
                    if (!b.date_fin) return -1;
                    const dateA = new Date(a.date_fin);
                    const dateB = new Date(b.date_fin);
                    const dateDiff = dateA.getTime() - dateB.getTime();
                    if (dateDiff !== 0) return dateDiff;
                    const branchA = a.SousBranche?.Branche?.nom || '';
                    const branchB = b.SousBranche?.Branche?.nom || '';
                    if (branchA.localeCompare(branchB) !== 0) return branchA.localeCompare(branchB);
                    return a.nom.localeCompare(b.nom);
                });

                const totalOverdueActivities = sortedModules.reduce((acc, mod) => acc + mod.activities.length, 0);
                console.groupCollapsed(`%c📅 Travaux en retard pour ${selectedStudent.prenom} ${selectedStudent.nom} (${totalOverdueActivities} ateliers)`, 'font-size: 14px; font-weight: bold; color: #e11d48; background: #ffe4e6; padding: 4px 8px; border-radius: 4px;');
                sortedModules.forEach(mod => {
                    const dateStr = mod.date_fin ? new Date(mod.date_fin).toLocaleDateString('fr-FR') : 'Date inconnue';
                    const branchName = mod.SousBranche?.Branche?.nom ? `[${mod.SousBranche.Branche.nom}] ` : '';
                    console.groupCollapsed(`%c${branchName}${mod.nom} %c(${dateStr}) - ${mod.activities.length} atelier(s) restant(s)`, 'font-weight: bold; color: #2563eb;', 'color: #dc2626; font-weight: bold;');
                    mod.activities.forEach((actName: string) => { console.log(`%c• ${actName}`, 'color: #4b5563; margin-left: 10px;'); });
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
            const pdfResult = await fetchStudentPdfData(selectedStudent.id, selectedStudent.Niveau?.id || '');
            if (!pdfResult || pdfResult.modules.length === 0) {
                alert("Aucune activité à faire trouvée.");
                return;
            }

            const pdfData = {
                studentName: `${selectedStudent.prenom} ${selectedStudent.nom}`,
                printDate: new Date().toLocaleDateString('fr-FR'),
                modules: pdfResult.modules
            };

            const { pdf } = await import('@react-pdf/renderer');
            const { saveAs } = await import('file-saver');

            const blob = await pdf(React.createElement(StudentTrackingPDFModern, { data: pdfData }) as any).toBlob();
            const fileName = `ToDoList_Suivi_${selectedStudent.prenom}_${selectedStudent.nom}.pdf`;

            try {
                if ('showSaveFilePicker' in window) {
                    const handle = await (window as any).showSaveFilePicker({
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
            console.error(error);
            alert("Erreur lors de la génération du PDF.");
        }
    };

    // --- Render Helper Functions ---
    const renderJournalView = () => {
        const moduleGroups = Object.values(studentProgress.reduce((acc: any, p) => {
            const mod = p.Activite?.Module;
            if (!mod) return acc;
            if (!acc[mod.id]) acc[mod.id] = { ...mod, activities: [] };
            acc[mod.id].activities.push(p);
            return acc;
        }, {}));

        return moduleGroups
            .sort((a: any, b: any) => {
                if (a.date_fin && b.date_fin) {
                    if (a.date_fin !== b.date_fin) return new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime();
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
            .map((module: any) => {
                const activities = module.activities;
                const completedCount = activities.filter((a: any) => a.etat === 'termine').length;
                const totalCount = activities.length;
                const percent = Math.round((completedCount / totalCount) * 100);
                const isExpanded = expandedModules[module.id];
                const isModuleOverdue = module.date_fin && new Date(module.date_fin) < new Date() && completedCount < totalCount;

                if (showPendingOnly && completedCount === totalCount) return null;

                return (
                    <div key={module.id} className="bg-surface/50 border border-transparent rounded-xl overflow-hidden hover:border-white/10 hover:bg-surface transition-all group">
                        <div
                            onClick={() => toggleModuleExpansion(module.id)}
                            className="py-2.5 px-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between gap-6"
                        >
                            {/* Left: Title & Chevron (Takes remaining space) */}
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={clsx(
                                    "transition-all duration-300",
                                    isExpanded ? "rotate-90 text-primary" : "rotate-0 text-grey-dark group-hover:text-grey-medium"
                                )}>
                                    <ChevronRight size={18} />
                                </div>
                                <h3 className={clsx(
                                    "font-bold text-text-main text-lg truncate tracking-tight group-hover:text-white transition-all w-fit",
                                    isModuleOverdue && "border-b-2 border-danger/60 hover:border-danger text-danger/90 hover:text-danger"
                                )}>
                                    {module.nom}
                                </h3>
                            </div>

                            {/* Right: Metrics Block (40% width, anchored right) */}
                            <div className="flex items-center gap-6 w-[40%] shrink-0">
                                {/* Date Badge (Before the bar) */}
                                <div className="shrink-0">
                                    {module.date_fin ? (
                                        <Badge variant="primary" size="xs" className="px-2 py-0.5 font-black">
                                            {format(new Date(module.date_fin), 'dd/MM', { locale: fr })}
                                        </Badge>
                                    ) : (
                                        <span className="text-[10px] font-bold text-grey-dark uppercase tracking-widest italic opacity-20 px-2">N/A</span>
                                    )}
                                </div>

                                {/* Progress Bar Area */}
                                <div className="flex-1 flex items-center gap-4">
                                    <div className="flex-1 h-1.5 bg-background/50 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-grey-medium min-w-[35px] text-right tabular-nums">
                                        {completedCount}/{totalCount}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-white/5 bg-black/20">
                                {activities.sort((a: any, b: any) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map((p: any) => (
                                    <div key={p.id} className="p-3 pl-16 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                        <h4 className="text-sm text-grey-light font-medium group-hover:text-white transition-colors">{p.Activite?.titre}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-grey-dark font-mono">{new Date(p.updated_at).toLocaleDateString()}</span>
                                            <Badge
                                                variant={
                                                    p.etat === 'termine' ? 'success' :
                                                        p.etat === 'besoin_d_aide' ? 'danger' :
                                                            'primary'
                                                }
                                                size="xs"
                                                icon={
                                                    p.etat === 'termine' ? <CheckCircle2 size={12} /> :
                                                        p.etat === 'besoin_d_aide' ? <AlertCircle size={12} /> :
                                                            <Clock size={12} />
                                                }
                                                className={p.etat === 'besoin_d_aide' ? 'animate-pulse' : ''}
                                            >
                                                {p.etat === 'termine' ? 'Terminé' :
                                                    p.etat === 'besoin_d_aide' ? "Besoin d'aide" :
                                                        'En cours'}
                                            </Badge>
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
            {/* List Column - Split into 2 cards */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                {/* Card 1: Title & Controls */}
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    {/* Header Row: Title & Badge */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <GraduationCap className="text-primary" size={24} />
                            Liste des Enfants
                        </h2>
                        <Badge variant="primary" size="xs">{students.length} Total</Badge>
                    </div>

                    {/* Separator */}
                    <div className="border-t border-white/10" />

                    {/* Search & Filters */}
                    <div className="space-y-4">
                        {/* Search & Toggle Row */}
                        <div className="flex gap-3">
                            <SearchBar
                                placeholder="Rechercher un élève..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                iconColor="text-primary"
                            />

                            {/* Filters Toggle Button */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={clsx(
                                    "p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0",
                                    showFilters
                                        ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/20"
                                        : "bg-surface/50 border-white/10 text-grey-medium hover:text-white hover:border-white/20"
                                )}
                                title="Afficher les filtres"
                            >
                                <SlidersHorizontal size={20} />
                            </button>
                        </div>

                        {/* Filters Row - Collapsible */}
                        {showFilters && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                <FilterSelect
                                    options={[
                                        { value: 'all', label: 'Groupes: Tous' },
                                        ...Array.from(new Set(students.flatMap(s => s.EleveGroupe?.map(eg => eg.Groupe?.nom)).filter(Boolean)))
                                            .sort()
                                            .map(g => ({ value: g as string, label: g as string }))
                                    ]}
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    icon={Users}
                                    className="flex-1"
                                />

                                <FilterSelect
                                    options={[
                                        { value: 'all', label: 'Classes: Tous' },
                                        ...Array.from(new Set(students.map(s => s.Classe?.nom).filter(Boolean)))
                                            .map(c => ({ value: c as string, label: c as string }))
                                    ]}
                                    value={filterClass}
                                    onChange={(e) => setFilterClass(e.target.value)}
                                    icon={Filter}
                                    className="flex-1"
                                />
                            </div>
                        )}
                    </div>
                </CardInfo>

                {/* Card 2: List Only */}
                <CardList
                    actionLabel="Ajouter un élève"
                    onAction={handleOpenCreate}
                    actionIcon={Plus}
                >
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
                                    "w-full flex items-center gap-4 py-2.5 px-4 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                    selectedStudent?.id === student.id
                                        ? "selected-state"
                                        : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                                )}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStudent(student); }}
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Avatar
                                        size="sm"
                                        src={student.photo_url}
                                        initials={`${student.prenom[0]}${student.nom[0]}`}
                                        editable
                                        onImageChange={(file) => processAndSavePhoto(file, student)}
                                        loading={updatingPhotoId === student.id}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(student.id); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingPhotoId(null); }}
                                        onDrop={(e, file) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDraggingPhotoId(null);
                                            processAndSavePhoto(file, student);
                                        }}
                                        className={clsx(
                                            selectedStudent?.id === student.id ? "bg-white/20" : "",
                                            draggingPhotoId === student.id && "ring-2 ring-primary scale-110 bg-primary/20"
                                        )}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={clsx(
                                        "font-semibold truncate",
                                        selectedStudent?.id === student.id ? "text-text-dark" : "text-text-main"
                                    )}>
                                        {student.prenom} {student.nom}
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
                        <EmptyState
                            icon={Search}
                            title="Aucun élève trouvé"
                            description="Essayez d'ajuster vos filtres de recherche"
                            size="sm"
                        />
                    )}
                </CardList>
            </div>

            {/* Detail Column - Split into 2 cards */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                {!selectedStudent ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={UserIcon}
                            title="Sélectionnez un élève"
                            description="Cliquez sur un nom dans la liste pour afficher ses informations détaillées."
                            size="md"
                        />
                    </div>
                ) : (
                    <>
                        {/* Card 1: Student Info */}
                        <CardInfo
                            ref={rightContentRef}
                            height={headerHeight}
                        >
                            <div className="flex gap-5 items-center">
                                <Avatar
                                    size="xl"
                                    src={selectedStudent.photo_url}
                                    initials={`${selectedStudent.prenom[0]}${selectedStudent.nom[0]}`}
                                    editable
                                    onImageChange={(file) => processAndSavePhoto(file, selectedStudent)}
                                    loading={updatingPhotoId === selectedStudent.id}
                                    onDragOver={handlePhotoDragOver}
                                    onDragLeave={handlePhotoDragLeave}
                                    onDrop={(e, _file) => handlePhotoDrop(e, selectedStudent)}
                                    className={clsx(
                                        isDraggingPhoto && "border-primary bg-primary/20 scale-105"
                                    )}
                                />
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-cq-xl font-bold text-text-main truncate">
                                        {selectedStudent.prenom} {selectedStudent.nom}
                                    </h2>
                                    <p className="text-cq-base text-grey-medium mt-0.5">
                                        {selectedStudent.Classe?.nom || 'Sans classe'} • {selectedStudent.Niveau?.nom || 'Niveau non défini'}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {selectedStudent.EleveGroupe && selectedStudent.EleveGroupe.length > 0 ? (
                                            selectedStudent.EleveGroupe.map(eg => eg.Groupe && (
                                                <Badge key={eg.Groupe.id} variant="primary" size="xs" icon={<span>🏆</span>}>
                                                    {eg.Groupe.nom}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-grey-medium italic">Aucun groupe</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardInfo>

                        {/* Card 2: Tabs & Content */}
                        <CardTabs
                            tabs={[
                                { id: 'infos', label: 'Informations' },
                                { id: 'suivi', label: 'Suivi Pédagogique' },
                                { id: 'todo', label: 'To-Do List' },
                                { id: 'urgent', label: 'Suivi Urgent' }
                            ]}
                            activeTab={currentTab}
                            onChange={setCurrentTab}
                        >
                            {currentTab === 'infos' && (
                                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Parcours Scolaire */}
                                    <InfoSection title="Parcours Scolaire">
                                        <InfoRow
                                            icon={BookOpen}
                                            value={selectedStudent.Classe?.nom || 'Non affecté'}
                                        />
                                        <InfoRow
                                            icon={Layers}
                                            value={selectedStudent.Niveau?.nom || 'Non renseigné'}
                                        />
                                        <InfoRow
                                            icon={Calendar}
                                            value={calculateAge(selectedStudent.date_naissance)}
                                        />
                                    </InfoSection>

                                    {/* Informations & Responsables */}
                                    <InfoSection title="Informations & Responsables">
                                        <InfoRow
                                            icon={ShieldCheck}
                                            label="Équipe Enseignante"
                                            value={
                                                <div className="space-y-1 mt-1">
                                                    {(selectedStudent.Classe?.ClasseAdulte?.length || 0) > 0 ? (
                                                        selectedStudent.Classe?.ClasseAdulte?.map((ca, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                                <p className="text-text-main font-bold truncate">{ca.Adulte.prenom} {ca.Adulte.nom}</p>
                                                                <Badge
                                                                    variant={ca.role === 'principal' ? 'primary' : 'default'}
                                                                    size="xs"
                                                                    style="outline"
                                                                >
                                                                    {ca.role === 'principal' ? 'Titulaire' : ca.role === 'coenseignant' ? 'Co-Ens.' : 'Support'}
                                                                </Badge>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-text-main font-bold italic opacity-50">Aucun membre assigné</p>
                                                    )}
                                                </div>
                                            }
                                        />
                                        <InfoRow
                                            icon={UserIcon}
                                            label="Parents"
                                            value={selectedStudent.nom_parents || [
                                                `${selectedStudent.parent1_prenom} ${selectedStudent.parent1_nom}`,
                                                `${selectedStudent.parent2_prenom} ${selectedStudent.parent2_nom}`
                                            ].filter(p => p.trim() !== "").join(' & ') || 'Non renseignés'}
                                        />
                                    </InfoSection>

                                    {/* Branch Indices */}
                                    <div className="md:col-span-2">
                                        <InfoSectionEditable title="Indices de Branche (Performance)">
                                            <InfoRowEditable
                                                icon={Activity}
                                                label="Global"
                                                value={selectedStudent.importance_suivi ?? ''}
                                                onChange={(val) => handleUpdateImportance(val)}
                                                placeholder="50"
                                            />
                                            {branches.map(branch => (
                                                <InfoRowEditable
                                                    key={branch.id}
                                                    icon={GitBranch}
                                                    label={branch.nom}
                                                    value={studentIndices[selectedStudent.id]?.[branch.id] ?? ''}
                                                    onChange={(val) => handleUpdateBranchIndex(selectedStudent.id, branch.id, val)}
                                                    placeholder="50"
                                                />
                                            ))}
                                        </InfoSectionEditable>
                                    </div>
                                </div>
                            )}

                            {currentTab === 'suivi' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col items-start gap-2 mb-6">
                                        <SmartTabs
                                            tabs={[
                                                { id: 'journal', label: 'Journal', icon: LayoutList },
                                                { id: 'progression', label: 'Progression', icon: GitGraph }
                                            ]}
                                            activeTab={suiviMode}
                                            onChange={(tabId) => setSuiviMode(tabId as 'journal' | 'progression')}
                                            level={3}
                                        />

                                        {suiviMode === 'journal' && (
                                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                                <SmartTabs
                                                    tabs={[
                                                        { id: 'pending', label: 'En cours', icon: Activity, variant: 'warning' },
                                                        { id: 'all', label: 'Tout voir', icon: LayoutList, variant: 'primary' }
                                                    ]}
                                                    activeTab={showPendingOnly ? 'pending' : 'all'}
                                                    onChange={(tabId) => setShowPendingOnly(tabId === 'pending')}
                                                    level={3}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {loadingProgress ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
                                    ) : studentProgress.length === 0 ? (
                                        <div className="text-center p-8 text-grey-medium opacity-60 italic">Aucune activité commencée.</div>
                                    ) : (
                                        <div className="space-y-6">
                                            {suiviMode === 'journal' && <div className="space-y-1">{renderJournalView()}</div>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentTab === 'urgent' && (() => {
                                const now = new Date();
                                const overdueModules: Record<string, any> = {};
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

                                const sortedModules = Object.values(overdueModules).sort((a: any, b: any) => {
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
                                            sortedModules.map((module: any) => {
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
                                                                {module.activities.sort((a: any, b: any) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map((p: any) => (
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
                                    <Button
                                        onClick={generatePDF}
                                        variant="secondary"
                                        size="lg"
                                        icon={FileText}
                                    >
                                        Créer le PDF
                                    </Button>
                                    <p className="text-sm italic opacity-60">Le contenu sera généré automatiquement.</p>
                                </div>
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                onConfirm={handleDelete}
                title="Supprimer l'élève ?"
                message={`Êtes-vous sûr de vouloir supprimer "${studentToDelete?.prenom} ${studentToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={loading}
            />

            <StudentModal
                showModal={showModal}
                onClose={handleCloseModal}
                isEditing={isEditing}
                editId={editId}
                onSaved={handleStudentSaved}
            />
        </div >
    );
};

export default Students;
