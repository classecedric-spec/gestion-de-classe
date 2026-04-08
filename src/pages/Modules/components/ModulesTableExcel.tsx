import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Table, ChevronRight, X, Layers, Filter, ArrowUp, ArrowDown, Search, Users, Plus } from 'lucide-react';
import { CardInfo, Modal, Badge } from '../../../core';
import { ModuleWithRelations } from '../utils/moduleHelpers';
import clsx from 'clsx';
import { useUserPreferences } from '../../../hooks/useUserPreferences';

type ColumnId = 'statut' | 'nom' | 'branche' | 'sous_branche' | 'date_fin' | 'ateliers' | 'studentCount';
type ColumnConfig = { id: ColumnId; width: number };

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'statut', width: 120 },
    { id: 'nom', width: 250 },
    { id: 'branche', width: 180 },
    { id: 'sous_branche', width: 180 },
    { id: 'date_fin', width: 180 },
    { id: 'studentCount', width: 150 },
    { id: 'ateliers', width: 300 }
];

interface ModulesTableExcelProps {
    modules: ModuleWithRelations[];
    onClose: () => void;
    onAddModule?: () => void;
    updateModule?: (id: string, moduleData: any) => Promise<any>;
    onSelectModule?: (module: ModuleWithRelations) => void;
}

export const ModulesTableExcel: React.FC<ModulesTableExcelProps> = ({ modules, onClose, onAddModule, updateModule, onSelectModule }) => {
    // We already have filtered & sorted modules passed from moduleHook
    const [selectedModuleForModal, setSelectedModuleForModal] = useState<ModuleWithRelations | null>(null);

    // Inline Date Editing
    const [editingDateId, setEditingDateId] = useState<string | null>(null);
    const [editingDateValue, setEditingDateValue] = useState<string>('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Inline Status Editing
    const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
    const [editingStatusValue, setEditingStatusValue] = useState<'en_preparation' | 'en_cours' | 'archive'>('en_preparation');
    const statusSelectRef = useRef<HTMLSelectElement>(null);

    // Name Search Filter
    const [nameSearchQuery, setNameSearchQuery] = useState('');
    const [isNameSearchOpen, setIsNameSearchOpen] = useState(false);

    // Column Preferences & Resize/Drag State
    const [savedColumns, setSavedColumns, loadingColumns] = useUserPreferences<ColumnConfig[]>('modules_table_columns_v1', DEFAULT_COLUMNS);
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

    useEffect(() => {
        if (!loadingColumns && savedColumns) {
            // Merge saved with default to avoid missing columns if we add new ones later
            const merged = savedColumns.filter(c => DEFAULT_COLUMNS.some(dc => dc.id === c.id));
            const missing = DEFAULT_COLUMNS.filter(dc => !merged.some(mc => mc.id === dc.id));
            setColumns([...merged, ...missing]);
        }
    }, [savedColumns, loadingColumns]);

    const savePreferences = (newCols: ColumnConfig[]) => {
        setColumns(newCols);
        setSavedColumns(newCols);
    };

    // Drag & Drop Reordering
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedColumnIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) return;

        const newCols = [...columns];
        const draggedCol = newCols[draggedColumnIndex];
        newCols.splice(draggedColumnIndex, 1);
        newCols.splice(dropIndex, 0, draggedCol);

        savePreferences(newCols);
        setDraggedColumnIndex(null);
    };

    // Column Resizing
    const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
    const [startX, setStartX] = useState<number | null>(null);
    const [startWidth, setStartWidth] = useState<number | null>(null);

    const handleResizeStart = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumnIndex(index);
        setStartX(e.clientX);
        setStartWidth(columns[index].width);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingColumnIndex === null || startX === null || startWidth === null) return;
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(60, startWidth + deltaX); // Min width 60px

            setColumns(prev => {
                const newCols = [...prev];
                newCols[resizingColumnIndex] = { ...newCols[resizingColumnIndex], width: newWidth };
                return newCols;
            });
        };

        const handleMouseUp = () => {
            if (resizingColumnIndex !== null) {
                // To avoid multiple writes during drag, we could save only on mouseUp.
                // But current closure of columns might be stale, so we rely on the state update to settle, then save effect?
                // Actually, let's just trigger a sync to supabase by passing a functional update to setSavedColumns if possible,
                // or just calling setSavedColumns with the latest columns. We'll use a small timeout to let state settle.
                setTimeout(() => {
                    setColumns(currentCols => {
                        setSavedColumns(currentCols);
                        return currentCols;
                    });
                }, 0);
                setResizingColumnIndex(null);
            }
        };

        if (resizingColumnIndex !== null) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumnIndex, startX, startWidth, columns, setSavedColumns]);

    const renderHeaderContent = (colId: ColumnId) => {
        switch (colId) {
            case 'statut': return (
                <>
<div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                                    >
                                        Statut
                                        <Filter size={14} className={clsx(isStatusMenuOpen ? "text-primary" : "text-grey-medium")} />
                                    </div>
                                    
                                    {isStatusMenuOpen && (
                                        <div 
                                            ref={statusMenuRef}
                                            className="absolute top-full left-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm"
                                        >
                                            <div className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors" onClick={() => toggleStatus('en_preparation')}>
                                                <input type="checkbox" checked={statusFilter.en_preparation} title="En préparation" readOnly className="w-4 h-4 rounded border-white/20 bg-background accent-primary cursor-pointer" />
                                                <span className="text-text-main">En préparation</span>
                                            </div>
                                            <div className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors" onClick={() => toggleStatus('en_cours')}>
                                                <input type="checkbox" checked={statusFilter.en_cours} title="En cours" readOnly className="w-4 h-4 rounded border-white/20 bg-background accent-primary cursor-pointer" />
                                                <span className="text-text-main">En cours</span>
                                            </div>
                                            <div className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors" onClick={() => toggleStatus('archive')}>
                                                <input type="checkbox" checked={statusFilter.archive} title="Archivé" readOnly className="w-4 h-4 rounded border-white/20 bg-background accent-primary cursor-pointer" />
                                                <span className="text-text-main">Archivé</span>
                                            </div>
                                        </div>
                                    )}
                </>
            );
            case 'nom': return (
                <>
<div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => setIsNameSearchOpen(!isNameSearchOpen)}
                                    >
                                        Nom du Module
                                        <Filter size={14} className={clsx(nameSearchQuery || isNameSearchOpen ? "text-primary" : "text-grey-medium")} />
                                    </div>

                                    {isNameSearchOpen && (
                                        <div 
                                            ref={nameSearchMenuRef}
                                            className="absolute top-full left-0 mt-2 w-64 bg-surface border border-white/10 rounded-xl shadow-xl z-50 py-3 px-4 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-grey-medium uppercase tracking-wider">Recherche</span>
                                                {nameSearchQuery && (
                                                    <button 
                                                        onClick={() => setNameSearchQuery('')}
                                                        className="text-xs text-grey-medium hover:text-danger transition-colors flex items-center gap-1"
                                                    >
                                                        <X size={12} /> Effacer
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative w-full">
                                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                    <Search size={14} className="text-grey-medium" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Entrez un nom..."
                                                    value={nameSearchQuery}
                                                    onChange={(e) => setNameSearchQuery(e.target.value)}
                                                    className="w-full bg-surface-light border border-white/10 rounded-lg pl-8 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-colors placeholder:text-grey-medium"
                                                />
                                            </div>
                                        </div>
                                    )}
                </>
            );
            case 'branche': return (
                <>
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                                    >
                                        Branche
                                        <Filter size={14} className={clsx(branchFilter !== 'all' || isBranchMenuOpen ? "text-primary" : "text-grey-medium")} />
                                    </div>
                                    
                                    {isBranchMenuOpen && (
                                        <div 
                                            ref={branchMenuRef}
                                            className="absolute top-full left-0 mt-2 w-56 bg-surface border border-white/10 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm max-h-64 overflow-y-auto custom-scrollbar"
                                        >
                                            <div 
                                                className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-text-main" 
                                                onClick={() => { setBranchFilter('all'); setSubBranchFilter('all'); }}
                                            >
                                                Toutes les branches
                                                {branchFilter === 'all' && <ChevronRight size={14} className="ml-auto text-primary" />}
                                            </div>
                                            <div className="h-px bg-white/10 my-1 mx-3" />
                                            {availableBranches.map(branch => (
                                                <div 
                                                    key={branch.id}
                                                    className={clsx(
                                                        "px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors",
                                                        branchFilter === branch.id ? "text-primary font-semibold" : "text-text-main"
                                                    )}
                                                    onClick={() => { 
                                                        setBranchFilter(branch.id);
                                                        // Reset sub-branch filter if the new branch doesn't contain current sub-branch
                                                        if (subBranchFilter !== 'all') {
                                                            setSubBranchFilter('all'); 
                                                        }
                                                    }}
                                                >
                                                    <span className="truncate">{branch.nom}</span>
                                                    {branchFilter === branch.id && <ChevronRight size={14} className="ml-auto" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                </>
            );
            case 'sous_branche': return (
                <>
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => setIsSubBranchMenuOpen(!isSubBranchMenuOpen)}
                                    >
                                        Sous-Branche
                                        <Filter size={14} className={clsx(subBranchFilter !== 'all' || isSubBranchMenuOpen ? "text-primary" : "text-grey-medium")} />
                                    </div>
                                    
                                    {isSubBranchMenuOpen && (
                                        <div 
                                            ref={subBranchMenuRef}
                                            className="absolute top-full left-0 mt-2 w-56 bg-surface border border-white/10 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm max-h-64 overflow-y-auto custom-scrollbar"
                                        >
                                            <div 
                                                className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-text-main" 
                                                onClick={() => setSubBranchFilter('all')}
                                            >
                                                Toutes les sous-branches
                                                {subBranchFilter === 'all' && <ChevronRight size={14} className="ml-auto text-primary" />}
                                            </div>
                                            <div className="h-px bg-white/10 my-1 mx-3" />
                                            {availableSubBranches.map(subBranch => (
                                                <div 
                                                    key={subBranch.id}
                                                    className={clsx(
                                                        "px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors",
                                                        subBranchFilter === subBranch.id ? "text-primary font-semibold" : "text-text-main"
                                                    )}
                                                    onClick={() => setSubBranchFilter(subBranch.id)}
                                                >
                                                    <span className="truncate">{subBranch.nom}</span>
                                                    {subBranchFilter === subBranch.id && <ChevronRight size={14} className="ml-auto" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                </>
            );
            case 'date_fin': return (
                <>
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                                    >
                                        Date Fin
                                        <Filter size={14} className={clsx(dateFilterType || isDateMenuOpen ? "text-primary" : "text-grey-medium")} />
                                    </div>

                                    {isDateMenuOpen && (
                                        <div 
                                            ref={dateMenuRef}
                                            className="absolute top-full right-0 mt-2 w-72 bg-surface border border-white/10 rounded-xl shadow-xl z-50 py-3 px-4 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm"
                                        >
                                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                                                <span className="text-xs font-semibold text-grey-medium uppercase tracking-wider">Filtre Date</span>
                                                {(dateSort || dateFilterType) && (
                                                    <button 
                                                        onClick={() => { setDateSort(null); setDateFilterType(null); setDateFilterValue(''); }}
                                                        className="text-xs text-grey-medium hover:text-danger transition-colors flex items-center gap-1"
                                                    >
                                                        <X size={12} /> Réinitialiser
                                                    </button>
                                                )}
                                            </div>

                                            {/* Sort */}
                                            <div className="mb-4">
                                                <div className="text-[11px] font-semibold text-grey-medium uppercase tracking-wider mb-2">Tri</div>
                                                <div className="flex bg-surface-light rounded-lg p-1 border border-white/5">
                                                    <button
                                                        onClick={() => setDateSort(dateSort === 'asc' ? null : 'asc')}
                                                        className={clsx(
                                                            "flex-1 py-1.5 px-2 text-xs rounded-md transition-all flex items-center justify-center gap-1.5",
                                                            dateSort === 'asc' ? "bg-primary text-white shadow-md font-medium" : "text-grey-light hover:text-white hover:bg-white/5"
                                                        )}
                                                    >
                                                        <ArrowUp size={12} /> Proches
                                                    </button>
                                                    <button
                                                        onClick={() => setDateSort(dateSort === 'desc' ? null : 'desc')}
                                                        className={clsx(
                                                            "flex-1 py-1.5 px-2 text-xs rounded-md transition-all flex items-center justify-center gap-1.5",
                                                            dateSort === 'desc' ? "bg-primary text-white shadow-md font-medium" : "text-grey-light hover:text-white hover:bg-white/5"
                                                        )}
                                                    >
                                                        <ArrowDown size={12} /> Lointains
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Filter */}
                                            <div>
                                                <div className="text-[11px] font-semibold text-grey-medium uppercase tracking-wider mb-2">Filtre</div>
                                                <div className="space-y-2">
                                                    <select 
                                                        className="w-full bg-surface-light border border-white/10 rounded-lg py-2 px-3 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                                                        value={dateFilterType || ''}
                                                        onChange={(e) => setDateFilterType(e.target.value as any || null)}
                                                    >
                                                        <option value="">Aucun filtre</option>
                                                        <option value="before">Avant le</option>
                                                        <option value="equal">Le</option>
                                                        <option value="after">Après le</option>
                                                    </select>
                                                    
                                                    {dateFilterType && (
                                                        <input 
                                                            type="date"
                                                            value={dateFilterValue}
                                                            onChange={(e) => setDateFilterValue(e.target.value)}
                                                            className="w-full bg-surface-light border border-white/10 rounded-lg py-2 px-3 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-colors"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                </>
            );
            case 'ateliers': return "Ateliers inclus";
            case 'studentCount': return (
                <>
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => setIsStudentCountMenuOpen(!isStudentCountMenuOpen)}
                                    >
                                        Enfants liés
                                        <Filter size={14} className={clsx(studentCountFilter.length > 0 || isStudentCountMenuOpen ? "text-primary" : "text-grey-medium")} />
                                    </div>
                                    
                                    {isStudentCountMenuOpen && (
                                        <div 
                                            ref={studentCountMenuRef}
                                            className="absolute top-full left-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm"
                                        >
                                            <div 
                                                className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-text-main" 
                                                onClick={() => setStudentCountFilter([])}
                                            >
                                                Tous les nombres
                                                {studentCountFilter.length === 0 && <ChevronRight size={14} className="ml-auto text-primary" />}
                                            </div>
                                            <div className="h-px bg-white/10 my-1 mx-3" />
                                            {availableStudentCounts.map(count => (
                                                <div 
                                                    key={count}
                                                    className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                                                    onClick={() => {
                                                        setStudentCountFilter(prev => 
                                                            prev.includes(count) 
                                                                ? prev.filter(c => c !== count) 
                                                                : [...prev, count]
                                                        );
                                                    }}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={studentCountFilter.includes(count)} 
                                                        readOnly 
                                                        className="w-4 h-4 rounded border-white/20 bg-background accent-primary cursor-pointer" 
                                                    />
                                                    <span className={clsx(
                                                        "transition-colors",
                                                        studentCountFilter.includes(count) ? "text-primary font-semibold" : "text-text-main"
                                                    )}>
                                                        {count} enfant{count > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                </>
            );
            default: return null;
        }
    };

    const renderCellContent = (colId: ColumnId, module: ModuleWithRelations, isExpired: boolean) => {
        switch (colId) {
            case 'statut': return (
                <>
                                                {editingStatusId === module.id ? (
                                                    <select
                                                        ref={statusSelectRef}
                                                        value={editingStatusValue}
                                                        onChange={(e) => setEditingStatusValue(e.target.value as any)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleStatusSubmit(module.id, editingStatusValue);
                                                            if (e.key === 'Escape') setEditingStatusId(null);
                                                        }}
                                                        className="bg-surface-light border border-primary/50 shadow-[0_0_10px_rgba(var(--color-primary),0.2)] rounded px-2 py-1 text-xs font-semibold tracking-wider text-text-main focus:outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="en_preparation">En prép.</option>
                                                        <option value="en_cours">En cours</option>
                                                        <option value="archive">Archivé</option>
                                                    </select>
                                                ) : (
                                                    <div className={clsx(updateModule && "group-hover/statut:scale-105 transition-transform w-fit origin-left")}>
                                                        <Badge
                                                            variant={
                                                                module.statut === 'en_cours' ? 'success' :
                                                                    module.statut === 'archive' ? 'danger' :
                                                                        'warning'
                                                            }
                                                            size="xs"
                                                        >
                                                            {module.statut === 'en_cours' ? 'En cours' :
                                                                module.statut === 'archive' ? 'Archivé' :
                                                                    'En prép.'}
                                                        </Badge>
                                                    </div>
                                                )}
                </>
            );
            case 'nom': return (
                <>
                                                <div 
                                                    className={clsx(
                                                        "font-semibold text-text-main transition-colors flex items-center gap-2",
                                                        onSelectModule ? "cursor-pointer hover:text-primary hover:underline underline-offset-4" : ""
                                                    )}
                                                    onClick={() => onSelectModule?.(module)}
                                                >
                                                    {module.nom}
                                                </div>
                </>
            );
            case 'branche': return (
                <>{module.SousBranche?.Branche?.nom || '-'}</>
            );
            case 'sous_branche': return (
                <>{module.SousBranche?.nom || '-'}</>
            );
            case 'date_fin': return (
                <>
                                                {editingDateId === module.id ? (
                                                    <input
                                                        ref={dateInputRef}
                                                        type="date"
                                                        title="Modifier la date"
                                                        value={editingDateValue}
                                                        onChange={(e) => setEditingDateValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleDateSubmit(module.id);
                                                            if (e.key === 'Escape') setEditingDateId(null);
                                                        }}
                                                        className="w-full bg-surface-light border border-primary/50 shadow-[0_0_10px_rgba(var(--color-primary),0.2)] rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider text-text-main focus:outline-none transition-all"
                                                    />
                                                ) : module.date_fin ? (
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors",
                                                        isExpired ? "bg-danger/10 text-danger border border-danger/20" : "bg-white/5 text-grey-light border border-white/10",
                                                        updateModule && "group-hover/date:border-white/30 group-hover/date:bg-white/10 group-hover/date:text-white group-hover/date:shadow-xs"
                                                    )}>
                                                        {new Date(module.date_fin).toLocaleDateString('fr-FR')}
                                                    </span>
                                                ) : (
                                                    <span className={clsx("text-grey-dark px-2 py-1 rounded transition-colors", updateModule && "group-hover/date:bg-white/5 group-hover/date:text-grey-light block w-fit")}>
                                                        -
                                                    </span>
                                                )}
                </>
            );
            case 'ateliers': return (
                <>
                                                <div className="flex flex-wrap gap-1.5 items-center max-w-xl whitespace-normal">
                                                    {module.Activite && module.Activite.length > 0 ? (
                                                        <>
                                                            {module.Activite.slice(0, 2).map((act) => (
                                                                <div 
                                                                    key={act.id} 
                                                                    className="px-2 py-1 bg-surface-light border border-white/10 rounded-md text-[11px] text-grey-light flex items-center shadow-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                                                                    title={act.titre || ''}
                                                                >
                                                                    {act.titre}
                                                                </div>
                                                            ))}
                                                            {module.Activite.length > 2 && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-grey-medium font-bold px-1">...</span>
                                                                    <button
                                                                        onClick={() => setSelectedModuleForModal(module)}
                                                                        className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center border border-primary/20"
                                                                        title="Voir tous les ateliers par niveau"
                                                                    >
                                                                        <ChevronRight size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-grey-dark text-xs italic">Aucun atelier</span>
                                                    )}
                                                </div>
                </>
            );
            case 'studentCount': return (
                <div className="font-semibold text-text-main flex items-center gap-2">
                    {module.studentCount || 0}
                    <Users size={14} className="text-grey-medium shrink-0" />
                </div>
            );
            default: return null;
        }
    };

    // End of renderCellContent component logic and hook logic.
    // The previous script accidentally pasted the useEffect handler out of order.

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingColumnIndex === null || startX === null || startWidth === null) return;
            const diff = e.clientX - startX;
            const newWidth = Math.max(100, startWidth + diff); // Minimum width 100px

            setColumns(prev => {
                const updated = [...prev];
                updated[resizingColumnIndex].width = newWidth;
                return updated;
            });
        };

        const handleMouseUp = () => {
            if (resizingColumnIndex !== null) {
                setColumns(currentCols => {
                    setSavedColumns(currentCols.map(c => ({ id: c.id, width: c.width })));
                    return currentCols;
                });
            }
            setResizingColumnIndex(null);
            setStartX(null);
            setStartWidth(null);
        };

        if (resizingColumnIndex !== null) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumnIndex, startX, startWidth, setSavedColumns]);

    // Filter states
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState({
        en_cours: true,
        en_preparation: true,
        archive: true
    });
    
    // Branch Filter
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
    const [branchFilter, setBranchFilter] = useState<string>('all');
    
    // SubBranch Filter
    const [isSubBranchMenuOpen, setIsSubBranchMenuOpen] = useState(false);
    const [subBranchFilter, setSubBranchFilter] = useState<string>('all');

    // Student Count Filter
    const [isStudentCountMenuOpen, setIsStudentCountMenuOpen] = useState(false);
    const [studentCountFilter, setStudentCountFilter] = useState<number[]>([]);

    // Date Filter & Sort
    const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
    const [dateSort, setDateSort] = useState<'asc' | 'desc' | null>(null);
    const [dateFilterType, setDateFilterType] = useState<'before' | 'equal' | 'after' | null>(null);
    const [dateFilterValue, setDateFilterValue] = useState<string>('');

    const statusMenuRef = useRef<HTMLDivElement>(null);
    const branchMenuRef = useRef<HTMLDivElement>(null);
    const subBranchMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);
    const nameSearchMenuRef = useRef<HTMLDivElement>(null);
    const studentCountMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (statusMenuRef.current && !statusMenuRef.current.contains(target)) setIsStatusMenuOpen(false);
            if (branchMenuRef.current && !branchMenuRef.current.contains(target)) setIsBranchMenuOpen(false);
            if (subBranchMenuRef.current && !subBranchMenuRef.current.contains(target)) setIsSubBranchMenuOpen(false);
            if (dateMenuRef.current && !dateMenuRef.current.contains(target)) setIsDateMenuOpen(false);
            if (nameSearchMenuRef.current && !nameSearchMenuRef.current.contains(target)) setIsNameSearchOpen(false);
            if (studentCountMenuRef.current && !studentCountMenuRef.current.contains(target)) setIsStudentCountMenuOpen(false);
            
            // Handle inline date edit blur
            if (editingDateId && dateInputRef.current && !dateInputRef.current.contains(target)) {
                handleDateSubmit(editingDateId);
            }
            
            // Handle inline status edit blur
            if (editingStatusId && statusSelectRef.current && !statusSelectRef.current.contains(target)) {
                handleStatusSubmit(editingStatusId, editingStatusValue);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingDateId, editingDateValue, editingStatusId, editingStatusValue]);

    const handleDateSubmit = async (moduleId: string) => {
        if (!updateModule) {
            setEditingDateId(null);
            return;
        }

        try {
            // Only update if it actually changed to a valid value (or empty to clear it)
            // The value from input is YYYY-MM-DD which is perfect for supabase
            const valueToSave = editingDateValue || null;
            await updateModule(moduleId, { date_fin: valueToSave });
        } catch (error) {
            console.error('Failed to update date:', error);
        } finally {
            setEditingDateId(null);
        }
    };

    const startEditingDate = (module: ModuleWithRelations, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingDateId(module.id);
        // Format to YYYY-MM-DD for the date input
        setEditingDateValue(module.date_fin ? new Date(module.date_fin).toISOString().split('T')[0] : '');
        // We use a timeout to let the input render before focusing
        setTimeout(() => dateInputRef.current?.focus(), 10);
    };

    const handleStatusSubmit = async (moduleId: string, newStatus: string) => {
        if (!updateModule) {
            setEditingStatusId(null);
            return;
        }

        try {
            await updateModule(moduleId, { statut: newStatus });
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setEditingStatusId(null);
        }
    };

    const startEditingStatus = (module: ModuleWithRelations, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingStatusId(module.id);
        setEditingStatusValue(module.statut as any || 'en_preparation');
        setTimeout(() => statusSelectRef.current?.focus(), 10);
    };

    const toggleStatus = (status: keyof typeof statusFilter) => {
        setStatusFilter(prev => ({ ...prev, [status]: !prev[status] }));
    };

    // Derived lists for filters based on current modules
    // Extract unique student counts
    const availableStudentCounts = Array.from(new Set(
        modules.map(m => m.studentCount || 0)
    )).sort((a, b) => a - b);

    // Extract unique branches
    const availableBranches = Array.from(new Map(
        modules
            .filter(m => m.SousBranche?.Branche?.id)
            .map(m => [m.SousBranche!.Branche!.id, m.SousBranche!.Branche!.nom])
    ).entries()).map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom));

    // Extract unique sub-branches (respecting branch filter if active)
    const availableSubBranches = Array.from(new Map(
        modules
            .filter(m => m.SousBranche?.id && (branchFilter === 'all' || m.SousBranche.branche_id === branchFilter))
            .map(m => [m.SousBranche!.id, m.SousBranche!.nom])
    ).entries()).map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom));

    const displayedModules = modules.filter(module => {
        // Name Search Match
        const matchesNameSearch = !nameSearchQuery || module.nom.toLowerCase().includes(nameSearchQuery.toLowerCase());

        const s = module.statut || 'en_preparation';
        const matchesStatus = statusFilter[s as keyof typeof statusFilter];
        
        const matchesBranch = branchFilter === 'all' || module.SousBranche?.branche_id === branchFilter;
        const matchesSubBranch = subBranchFilter === 'all' || module.sous_branche_id === subBranchFilter;

        const matchesDate = !dateFilterType || !dateFilterValue || (() => {
            if (!module.date_fin) return false;
            const moduleDate = new Date(module.date_fin);
            moduleDate.setHours(0, 0, 0, 0);
            const filterDate = new Date(dateFilterValue);
            filterDate.setHours(0, 0, 0, 0);
            if (dateFilterType === 'before') return moduleDate < filterDate;
            if (dateFilterType === 'equal') return moduleDate.getTime() === filterDate.getTime();
            if (dateFilterType === 'after') return moduleDate > filterDate;
            return true;
        })();

        const matchesStudentCount = studentCountFilter.length === 0 || studentCountFilter.includes(module.studentCount || 0);

        return matchesNameSearch && matchesStatus && matchesBranch && matchesSubBranch && matchesDate && matchesStudentCount;
    }).sort((a, b) => {
        // 1. Status Priority: en_cours (1), en_preparation (2), archive (3)
        const statusPriority: Record<string, number> = { 
            en_cours: 1, 
            en_preparation: 2, 
            archive: 3 
        };
        const sA = statusPriority[a.statut || 'en_preparation'] || 2;
        const sB = statusPriority[b.statut || 'en_preparation'] || 2;
        if (sA !== sB) return sA - sB;

        // 2. Date Sort (use user preference if active, otherwise default to ascending)
        // If a specific dateSort is active ('asc' or 'desc'), respect it.
        // Otherwise, default to earliest first ('asc') for non-archived modules.
        const dSort = dateSort || 'asc';
        const dateA = a.date_fin ? new Date(a.date_fin).getTime() : Infinity;
        const dateB = b.date_fin ? new Date(b.date_fin).getTime() : Infinity;
        
        if (dateA !== dateB) {
            return dSort === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // 3. Branch (Alphabetical)
        const branchA = a.SousBranche?.Branche?.nom || '';
        const branchB = b.SousBranche?.Branche?.nom || '';
        if (branchA !== branchB) return branchA.localeCompare(branchB);

        // 4. Sub-branch (Alphabetical)
        const subA = a.SousBranche?.nom || '';
        const subB = b.SousBranche?.nom || '';
        if (subA !== subB) return subA.localeCompare(subB);

        // 5. Module Name (Alphabetical)
        return a.nom.localeCompare(b.nom);
    });


    // Helper to group activities by niveau
    const getGroupedActivitiesByLevel = (module: ModuleWithRelations) => {
        const levelsMap = new Map<string, { niveauInfo: any, activities: any[] }>();

        (module.Activite || []).forEach(act => {
            if (act.ActiviteNiveau && act.ActiviteNiveau.length > 0) {
                act.ActiviteNiveau.forEach(an => {
                    if (an.Niveau) {
                        const niveauId = an.Niveau.id;
                        if (!levelsMap.has(niveauId)) {
                            levelsMap.set(niveauId, { niveauInfo: an.Niveau, activities: [] });
                        }
                        levelsMap.get(niveauId)!.activities.push(act);
                    }
                });
            } else {
                // If an activity has no level, we can put it in a 'Sans Niveau' bucket
                const noLevelId = 'no_level';
                if (!levelsMap.has(noLevelId)) {
                    levelsMap.set(noLevelId, { niveauInfo: { id: noLevelId, nom: 'Sans Niveau', ordre: 999 }, activities: [] });
                }
                levelsMap.get(noLevelId)!.activities.push(act);
            }
        });

        // Sort levels by ordre
        const sortedLevels = Array.from(levelsMap.values()).sort((a, b) => (a.niveauInfo.ordre || 0) - (b.niveauInfo.ordre || 0));

        // Sort activities within each level by ordre
        sortedLevels.forEach(levelBucket => {
            levelBucket.activities.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
        });

        return sortedLevels;
    };

    
    return (
        <div className="w-full h-full flex flex-col gap-6 overflow-hidden min-h-0 animate-in fade-in duration-500">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md rounded-2xl border border-white/5 p-4 shadow-lg shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white transition-all border border-white/10"
                        title="Retour à la vue par liste"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                            <Table size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-text-main">Tableau Excel des Modules</h1>
                            <p className="text-xs font-medium text-grey-medium uppercase tracking-widest mt-0.5">
                                Vue d'ensemble de {modules.length} module{modules.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {onAddModule && (
                    <button
                        onClick={onAddModule}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/90 rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        Ajouter un nouveau module
                    </button>
                )}
            </div>

            {/* Table Container */}
            <CardInfo 
                className="flex-1 overflow-hidden min-h-0" 
                contentClassName="flex-1 flex flex-col p-0 min-h-0"
            >
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-sm whitespace-nowrap table-fixed">
                        
                        <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur shadow-sm select-none">
                            <tr>
                                {columns.map((col, index) => (
                                    <th 
                                        key={col.id}
                                        style={{ width: col.width }}
                                        className={clsx(
                                            "p-4 font-bold text-grey-light uppercase tracking-wider text-xs border-b border-white/10 relative transition-colors duration-200",
                                            draggedColumnIndex === index && "opacity-50 bg-white/5",
                                        )}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                    >
                                        <div className="flex-1 w-full min-w-0">
                                            {renderHeaderContent(col.id)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-primary/50 z-20"
                                            onMouseDown={(e) => handleResizeStart(e, index)}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        
                        <tbody className="divide-y divide-white/5">
                            {displayedModules.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="p-12 text-center text-grey-medium">
                                        Aucun module à afficher dans le tableau.
                                    </td>
                                </tr>
                            ) : (
                                displayedModules.map((module) => {
                                    const isExpired = !!module.date_fin && new Date(module.date_fin) < new Date();
                                    return (
                                        <tr key={module.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {columns.map(col => (
                                                <td 
                                                    key={col.id} 
                                                    className={clsx(
                                                        "p-4 relative whitespace-nowrap overflow-hidden text-ellipsis",
                                                        col.id === 'date_fin' && updateModule && "cursor-pointer group/date",
                                                        col.id === 'statut' && updateModule && "cursor-pointer group/statut"
                                                    )}
                                                    style={{ width: col.width, maxWidth: col.width }}
                                                    onDoubleClick={(e) => {
                                                        if (!updateModule) return;
                                                        if (col.id === 'date_fin') startEditingDate(module, e);
                                                        if (col.id === 'statut') startEditingStatus(module, e);
                                                    }}
                                                    title={
                                                        updateModule ? (
                                                            col.id === 'date_fin' ? "Double-cliquez pour modifier la date" : 
                                                            col.id === 'statut' ? "Double-cliquez pour modifier le statut" : 
                                                            undefined
                                                        ) : undefined
                                                    }
                                                >
                                                    {renderCellContent(col.id, module, isExpired)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                    </table>
                </div>
            </CardInfo>

            {/* Modal for Ateliers */}
            {selectedModuleForModal && (
                <Modal 
                    isOpen={!!selectedModuleForModal} 
                    onClose={() => setSelectedModuleForModal(null)}
                    title={`Ateliers : ${selectedModuleForModal.nom}`}
                >
                    <div className="space-y-6">
                        {getGroupedActivitiesByLevel(selectedModuleForModal).map(group => (
                            <div key={group.niveauInfo.id} className="space-y-3">
                                <h3 className="text-sm font-bold text-text-main flex items-center gap-2 border-b border-white/10 pb-2">
                                    <Layers className="text-primary" size={16} />
                                    {group.niveauInfo.nom}
                                    <span className="text-xs font-medium text-grey-medium bg-white/5 px-2 py-0.5 rounded-full ml-2">
                                        {group.activities.length} atelier{group.activities.length > 1 ? 's' : ''}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {group.activities.map((act, idx) => (
                                        <div key={act.id} className="flex gap-3 items-center p-3 rounded-xl bg-surface-light border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-grey-medium shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-text-main truncate" title={act.titre || ''}>
                                                    {act.titre}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {getGroupedActivitiesByLevel(selectedModuleForModal).length === 0 && (
                            <div className="text-center py-8 text-grey-medium italic">
                                Aucun atelier trouvé.
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setSelectedModuleForModal(null)}
                            className="px-4 py-2 rounded-xl bg-surface border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            <X size={16} />
                            Fermer
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
