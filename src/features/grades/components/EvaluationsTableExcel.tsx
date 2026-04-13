/**
 * Nom du module/fichier : EvaluationsTableExcel.tsx
 * 
 * Données en entrée : La liste globale de toutes les évaluations créées par le professeur.
 * 
 * Données en sortie : Un tableau interactif riche affichant ces évaluations avec leurs moyennes, permettant de trier, filtrer et réorganiser l'affichage.
 * 
 * Objectif principal : Offrir une vue d'ensemble puissante (façon "Excel") de tous les devoirs, pour faciliter la recherche et la comparaison des résultats entre les classes.
 * 
 * Ce que ça affiche : Un grand tableau listant les devoirs avec leurs attributs (date, moyenne, matière). Les colonnes peuvent être cliquées pour trier, glissées pour réorganiser, ou étirées pour s'élargir.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Table, Filter, ArrowUp, ArrowDown, Search, X, ChevronRight, Loader2, BarChart3, Trash2, Edit2, Download, Info as InfoIcon, FileText } from 'lucide-react';
import { CardInfo, ConfirmModal } from '../../../core';
import { useAllEvaluations } from '../hooks/useAllEvaluations';
import { useGradeMutations } from '../hooks/useGrades';
import { useUserPreferences } from '../../../hooks/useUserPreferences';
import clsx from 'clsx';

type ColumnId = 'select' | 'titre' | 'branche' | 'groupe' | 'periode' | 'date' | 'note_max' | 'type_note' | 'nbQuestions' | 'nbResultats' | 'moyenne' | 'actions';
type ColumnConfig = { id: ColumnId; width: number };

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'select', width: 50 },
    { id: 'titre', width: 250 },
    { id: 'branche', width: 160 },
    { id: 'groupe', width: 140 },
    { id: 'periode', width: 130 },
    { id: 'date', width: 130 },
    { id: 'note_max', width: 100 },
    { id: 'type_note', width: 150 },
    { id: 'nbQuestions', width: 90 },
    { id: 'nbResultats', width: 120 },
    { id: 'moyenne', width: 120 },
    { id: 'actions', width: 80 }
];

const COLUMN_LABELS: Record<ColumnId, string> = {
    select: '',
    titre: 'Titre',
    branche: 'Branche',
    groupe: 'Groupe',
    periode: 'Période',
    date: 'Date',
    note_max: 'Note Max',
    type_note: 'Type',
    nbQuestions: 'Questions',
    nbResultats: 'Résultats',
    moyenne: 'Moyenne',
    actions: ''
};

interface EvaluationsTableExcelProps {
    onSelectEvaluation: (evalId: string) => void;
    onEditEvaluation: (ev: any) => void;
    branchFilter: string;
    setBranchFilter: (v: string) => void;
    groupFilter: string;
    setGroupFilter: (v: string) => void;
    periodeFilter: string;
}

const EvaluationsTableExcel: React.FC<EvaluationsTableExcelProps> = ({ 
    onSelectEvaluation, 
    onEditEvaluation,
    branchFilter,
    setBranchFilter,
    groupFilter,
    setGroupFilter,
    periodeFilter,
    setPeriodeFilter
}) => {
    /*
    // --- DEBUG SYSTEM ---
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [isDebugVisible, setIsDebugVisible] = useState(false);

    const addDebugLog = (msg: string) => {
        setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setIsDebugVisible(true);
    };

    const clearDebug = () => {
        setDebugLogs([]);
        setIsDebugVisible(false);
    };

    // Attach to window so we can trigger from exportEvaluationPDF
    (window as any)._addDebugLog = addDebugLog;
    (window as any)._clearDebug = clearDebug;
    // ----------------------
    */

    const { evaluations, loading } = useAllEvaluations();
    const { deleteEvaluation } = useGradeMutations();
    const [evalToDelete, setEvalToDelete] = useState<string | null>(null);

    // Multi-sélection
    const [selectedEvalIds, setSelectedEvalIds] = useState<Set<string>>(new Set());
    const [isPrintMode, setIsPrintMode] = useState(false);

    // Prépare un lien avec la mémoire locale pour mémoriser et restaurer la largeur des colonnes choisie par l'utilisateur d'une session à l'autre.
    const [savedColumns, setSavedColumns, loadingColumns] = useUserPreferences<ColumnConfig[]>('evaluations_table_columns_v1', DEFAULT_COLUMNS);
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

    useEffect(() => {
        if (!loadingColumns && savedColumns) {
            const preserved = savedColumns
                .filter(c => DEFAULT_COLUMNS.some(dc => dc.id === c.id));
            
            // On s'assure que la colonne 'select' est présente (elle est nouvelle)
            const hasSelect = preserved.some(c => c.id === 'select');
            let merged = preserved;
            
            if (!hasSelect) {
                merged = [{ id: 'select', width: 50 }, ...preserved];
            } else {
                // On force 'select' à être la première colonne pour plus d'ergonomie
                const selectIdx = merged.findIndex(c => c.id === 'select');
                if (selectIdx > 0) {
                    const selectCol = merged[selectIdx];
                    merged.splice(selectIdx, 1);
                    merged.unshift(selectCol);
                }
            }

            const finalCols = merged.map(c => ({
                ...c,
                width: Math.max(c.width, getMinColumnWidth(c.id))
            }));

            const missing = DEFAULT_COLUMNS.filter(dc => !finalCols.some(mc => mc.id === dc.id));
            setColumns([...finalCols, ...missing]);
        }
    }, [savedColumns, loadingColumns]);

    const savePreferences = useCallback((newCols: ColumnConfig[]) => {
        setColumns(newCols);
        setSavedColumns(newCols);
    }, [setSavedColumns]);

    // Prépare la mécanique complexe permettant de cliquer, maintenir et glisser une colonne (drag and drop) pour la déplacer ailleurs dans le tableau.
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        setDraggedColumnIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) return;
        const newCols = [...columns];
        const draggedCol = newCols[draggedColumnIndex];
        newCols.splice(draggedColumnIndex, 1);
        newCols.splice(dropIndex, 0, draggedCol);
        savePreferences(newCols);
        setDraggedColumnIndex(null);
    }, [draggedColumnIndex, columns, savePreferences]);

    // Aide pour calculer la largeur minimale d'une colonne en fonction de son titre (5px + texte + 5px)
    const getMinColumnWidth = (colId: ColumnId): number => {
        const label = COLUMN_LABELS[colId];
        if (!label) return 60; // Largeur par défaut pour les colonnes sans titre (ex: actions)
        
        // Estimation : environ 8px par caractère pour du texte gras en petites majuscules + 10px de marge + 20px pour les icônes (filtre/tri)
        return (label.length * 8) + 10 + 20;
    };

    // Prépare la mécanique visuelle qui permet d'attraper le bord d'une colonne avec la souris pour l'élargir ou la rétrécir.
    const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
    const [startX, setStartX] = useState<number | null>(null);
    const [startWidth, setStartWidth] = useState<number | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumnIndex(index);
        setStartX(e.clientX);
        setStartWidth(columns[index].width);
    }, [columns]);

    useEffect(() => {
        let frameId: number;
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingColumnIndex === null || startX === null || startWidth === null) return;
            
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => {
                const diff = e.clientX - startX;
                const minWidth = getMinColumnWidth(columns[resizingColumnIndex].id);
                const newWidth = Math.max(minWidth, startWidth + diff);
                
                setColumns(prev => {
                    const updated = [...prev];
                    if (updated[resizingColumnIndex].width === newWidth) return prev;
                    updated[resizingColumnIndex] = { ...updated[resizingColumnIndex], width: newWidth };
                    return updated;
                });
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
            cancelAnimationFrame(frameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumnIndex, startX, startWidth, setSavedColumns, columns]);

    // Prépare la mécanique pour mettre le tableau en ordre (ex: classer alphabétiquement par titre, ou par moyenne de la plus haute à la plus basse).
    const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = useCallback((colId: ColumnId) => {
        setSortColumn(current => {
            if (current === colId) {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                return prev === 'desc' ? null : colId; // Cycle: asc -> desc -> none
            }
            setSortDirection('asc');
            return colId;
        });
    }, []);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchMenuRef = useRef<HTMLDivElement>(null);
    const searchTriggerRef = useRef<HTMLDivElement>(null);

    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
    const branchMenuRef = useRef<HTMLDivElement>(null);

    const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
    const groupMenuRef = useRef<HTMLDivElement>(null);

    const [isPeriodeMenuOpen, setIsPeriodeMenuOpen] = useState(false);
    const periodeMenuRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            // Search menu handling
            if (isSearchOpen && 
                searchMenuRef.current && !searchMenuRef.current.contains(target) && 
                searchTriggerRef.current && !searchTriggerRef.current.contains(target)) {
                setIsSearchOpen(false);
            }
            
            if (branchMenuRef.current && !branchMenuRef.current.contains(target)) setIsBranchMenuOpen(false);
            if (groupMenuRef.current && !groupMenuRef.current.contains(target)) setIsGroupMenuOpen(false);
            if (periodeMenuRef.current && !periodeMenuRef.current.contains(target)) setIsPeriodeMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen]);

    // Scanne toutes les évaluations existantes pour en extraire et bâtir astucieusement les listes des matières et groupes disponibles pour les menus de filtrage.
    const availableBranches = useMemo(() => Array.from(new Set(evaluations.map((e: any) => e._brancheName))).filter(Boolean).sort() as string[], [evaluations]);
    const availableGroups = useMemo(() => Array.from(new Set(evaluations.map((e: any) => e._groupeName))).filter(Boolean).sort() as string[], [evaluations]);
    const availablePeriodes = useMemo(() => Array.from(new Set(evaluations.map((e: any) => e.periode))).filter(Boolean).sort() as string[], [evaluations]);

    // En comparant la liste brute aux "filtres actifs" choisis par le prof, le système construit la liste définitive des évaluations à afficher à l'écran.
    const displayedEvaluations = useMemo(() => {
        return evaluations
            .filter((ev: any) => {
                if (searchQuery && !ev.titre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                if (branchFilter !== 'all' && ev._brancheName !== branchFilter) return false;
                if (groupFilter !== 'all' && ev._groupeName !== groupFilter) return false;
                if (periodeFilter !== 'all' && ev.periode !== periodeFilter) return false;
                return true;
            })
            .sort((a: any, b: any) => {
                if (!sortColumn) return 0;
                const dir = sortDirection === 'asc' ? 1 : -1;
                const valA = getCellSortValue(a, sortColumn);
                const valB = getCellSortValue(b, sortColumn);
                if (valA === null && valB === null) return 0;
                if (valA === null) return 1;
                if (valB === null) return -1;
                if (typeof valA === 'string') return valA.localeCompare(valB as string) * dir;
                return ((valA as number) - (valB as number)) * dir;
            });
    }, [evaluations, searchQuery, branchFilter, groupFilter, periodeFilter, sortColumn, sortDirection]);

    const activeColumns = useMemo(() => {
        if (!isPrintMode) return columns.filter(c => c.id !== 'select');
        return columns;
    }, [columns, isPrintMode]);

    const totalTableWidth = useMemo(() => activeColumns.reduce((acc, col) => acc + col.width, 0), [activeColumns]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-grey-medium font-bold uppercase tracking-widest text-xs">Chargement des évaluations...</p>
            </div>
        );
    }

    if (evaluations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-surface rounded-3xl border-2 border-dashed border-white/5 animate-in fade-in duration-500">
                <div className="p-8 rounded-3xl bg-primary/5 text-primary/20 shadow-inner">
                    <BarChart3 size={80} strokeWidth={1} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Aucune évaluation</h3>
                    <p className="max-w-xs text-grey-medium font-medium">
                        Votre carnet de cotes est vide. Commencez par créer une évaluation pour vos élèves.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-surface rounded-2xl border border-white/5 p-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                        <Table size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-text-main uppercase">
                            {groupFilter !== 'all' ? `Évaluations - ${groupFilter}` : 'Tableau des Évaluations'}
                        </h2>
                        <p className="text-xs font-medium text-grey-medium uppercase tracking-widest mt-0.5">
                            {displayedEvaluations.length} évaluation{displayedEvaluations.length > 1 ? 's' : ''}{evaluations.length !== displayedEvaluations.length ? ` / ${evaluations.length} total` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                            isPrintMode ? "text-primary" : "text-grey-medium"
                        )}>
                            Mode Impression
                        </span>
                        <button
                            onClick={() => setIsPrintMode(!isPrintMode)}
                            className={clsx(
                                "relative w-10 h-5 rounded-full transition-all duration-300 p-1",
                                isPrintMode ? "bg-primary shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.4)]" : "bg-white/10"
                            )}
                        >
                            <div className={clsx(
                                "w-3 h-3 rounded-full bg-white transition-all duration-300 transform shadow-sm",
                                isPrintMode ? "translate-x-5" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    {isPrintMode && selectedEvalIds.size > 0 && (
                        <button
                            onClick={() => exportBulkEvaluationPDF(Array.from(selectedEvalIds), Array.from(selectedEvalIds).map(id => evaluations.find((e: any) => e.id === id)))}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600/30 transition-all animate-in zoom-in-95 duration-200"
                        >
                            <FileText size={16} />
                            Exporter PDF ({selectedEvalIds.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <CardInfo className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-auto custom-scrollbar" style={{ minHeight: '480px' }}>
                    <table 
                        className="text-left border-collapse text-sm whitespace-nowrap table-fixed"
                        style={{ minWidth: totalTableWidth, width: '100%' }}
                    >
                        <thead className="sticky top-0 z-10 bg-table-header select-none">
                            <tr>
                                {activeColumns.map((col, index) => (
                                    <th
                                        key={col.id}
                                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                                        className={clsx(
                                            "p-4 font-bold text-grey-light uppercase tracking-wider text-xs border-b border-white/10 relative transition-colors duration-200",
                                            draggedColumnIndex === index && "opacity-50 bg-white/5",
                                            col.id === 'titre' && "sticky left-0 z-30 bg-table-header after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-white/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]"
                                        )}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                    >
                                        <div className="flex-1 w-full min-w-0">
                                            {renderHeaderContent(col.id, {
                                                handleSort,
                                                sortColumn, sortDirection,
                                                searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchMenuRef, searchTriggerRef,
                                                branchFilter, setBranchFilter, isBranchMenuOpen, setIsBranchMenuOpen, branchMenuRef, availableBranches,
                                                groupFilter, setGroupFilter, isGroupMenuOpen, setIsGroupMenuOpen, groupMenuRef, availableGroups,
                                                periodeFilter, setPeriodeFilter, isPeriodeMenuOpen, setIsPeriodeMenuOpen, periodeMenuRef, availablePeriodes,
                                                // Pour la sélection
                                                displayedEvaluations,
                                                selectedEvalIds,
                                                setSelectedEvalIds
                                            })}
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
                            {displayedEvaluations.length === 0 ? (
                                <tr>
                                    <td colSpan={activeColumns.length} className="p-12 text-center text-grey-medium">
                                        Aucune évaluation ne correspond aux filtres.
                                    </td>
                                </tr>
                            ) : (
                                displayedEvaluations.map((ev: any) => (
                                        <EvaluationRow
                                            key={ev.id}
                                            ev={ev}
                                            columns={activeColumns}
                                            onSelectEvaluation={onSelectEvaluation}
                                            onEditEvaluation={onEditEvaluation}
                                            setEvalToDelete={setEvalToDelete}
                                            selectedEvalIds={selectedEvalIds}
                                            setSelectedEvalIds={setSelectedEvalIds}
                                        />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardInfo>

            <ConfirmModal
                isOpen={!!evalToDelete}
                onClose={() => setEvalToDelete(null)}
                onConfirm={() => {
                    if (evalToDelete) {
                        deleteEvaluation({ id: evalToDelete });
                        setEvalToDelete(null);
                    }
                }}
                title="Supprimer l'évaluation"
                message="Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action supprimera également toutes les notes associées."
                confirmText="Supprimer"
                variant="danger"
            />

            {/* DEBUG OVERLAY 
            {isDebugVisible && (
                <div className="fixed bottom-6 right-6 w-96 bg-surface border-2 border-primary/30 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-primary/10 p-3 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="font-bold text-xs uppercase tracking-widest text-primary">Debug Export console</span>
                        </div>
                        <button 
                            onClick={clearDebug}
                            className="text-grey-medium hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar bg-black/40">
                        {debugLogs.length === 0 && <span className="text-grey-medium italic">En attente d'actions...</span>}
                        {debugLogs.map((log, i) => (
                            <div key={i} className={clsx(
                                "border-l-2 pl-2 py-0.5",
                                log.includes('❌') ? "border-rose-500 text-rose-400" : 
                                log.includes('✅') ? "border-emerald-500 text-emerald-400" : "border-primary/30 text-text-main"
                            )}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            */}
        </div>
    );
};

// Petite aide : convertit les informations compliquées d'une case (ex: une date) en un simple texte ou chiffre facilement triable par le système.
function getCellSortValue(ev: any, colId: ColumnId): string | number | null {
    switch (colId) {
        case 'select': return 0;
        case 'titre': return ev.titre || '';
        case 'branche': return ev._brancheName || '';
        case 'groupe': return ev._groupeName || '';
        case 'periode': return ev.periode || '';
        case 'date': return ev.date ? new Date(ev.date).getTime() : null;
        case 'note_max': return ev.note_max ?? 0;
        case 'type_note': return ev._typeNoteName || '';
        case 'nbQuestions': return ev._nbQuestions ?? 0;
        case 'nbResultats': return ev._nbResultats ?? 0;
        case 'moyenne': return ev._moyenne ?? null;
        default: return null;
    }
}

// Render header content with filters
function renderHeaderContent(colId: ColumnId, ctx: any) {
    const { handleSort, sortColumn, sortDirection } = ctx;
    const isSorted = sortColumn === colId;
    const SortIcon = isSorted ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : null;

    switch (colId) {
        case 'select': {
            const { displayedEvaluations, selectedEvalIds, setSelectedEvalIds } = ctx;
            const allSelected = displayedEvaluations.length > 0 && displayedEvaluations.every((ev: any) => selectedEvalIds.has(ev.id));
            const someSelected = displayedEvaluations.some((ev: any) => selectedEvalIds.has(ev.id)) && !allSelected;

            return (
                <div className="flex justify-center items-center">
                    <div 
                        onClick={() => {
                            const newSelected = new Set(selectedEvalIds);
                            if (allSelected) {
                                displayedEvaluations.forEach((ev: any) => newSelected.delete(ev.id));
                            } else {
                                displayedEvaluations.forEach((ev: any) => newSelected.add(ev.id));
                            }
                            setSelectedEvalIds(newSelected);
                        }}
                        className={clsx(
                            "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
                            allSelected ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)]" : 
                            someSelected ? "bg-primary/20 border-primary shadow-inner" : "bg-white/5 border-white/20 hover:border-white/40"
                        )}
                    >
                        {allSelected && <ChevronRight className="w-3.5 h-3.5 text-white rotate-90" strokeWidth={4} />}
                        {someSelected && <div className="w-2.5 h-0.5 bg-primary rounded-full" />}
                    </div>
                </div>
            );
        }
        case 'titre': {
            const { searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchMenuRef, searchTriggerRef } = ctx;
            
            const getPos = () => {
                if (!searchTriggerRef.current) return { top: 0, left: 0 };
                const rect = searchTriggerRef.current.getBoundingClientRect();
                return {
                    top: rect.bottom + window.scrollY + 8,
                    left: rect.left + window.scrollX
                };
            };
            const pos = getPos();

            return (
                <>
                    <div
                        ref={searchTriggerRef}
                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                    >
                        Titre
                        <Filter size={14} className={clsx(searchQuery || isSearchOpen ? "text-primary" : "text-grey-medium")} />
                        {SortIcon && <SortIcon size={12} className="text-primary" />}
                    </div>
                    {isSearchOpen && createPortal(
                        <div
                            ref={searchMenuRef}
                            style={{ 
                                position: 'fixed', 
                                top: pos.top - window.scrollY, 
                                left: pos.left - window.scrollX,
                                zIndex: 9999 
                            }}
                            className="w-64 bg-surface border border-white/20 rounded-xl py-3 px-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-grey-medium uppercase tracking-wider">Recherche</span>
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-xs text-grey-medium hover:text-danger transition-colors flex items-center gap-1">
                                        <X size={12} /> Effacer
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <Search size={14} className="text-grey-medium" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Entrez un titre..."
                                        autoFocus
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-surface-light border border-white/10 rounded-lg pl-8 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-colors placeholder:text-grey-medium"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        handleSort('titre');
                                        setIsSearchOpen(false);
                                    }}
                                    className={clsx("p-2 rounded-lg border transition-colors shrink-0", isSorted ? "bg-primary/20 border-primary/30 text-primary" : "border-white/10 text-grey-medium hover:text-white hover:bg-white/5")}
                                    title="Trier"
                                >
                                    {SortIcon ? <SortIcon size={14} /> : <ArrowUp size={14} />}
                                </button>
                            </div>
                        </div>,
                        document.body
                    )}
                </>
            );
        }
        case 'branche': {
            const { branchFilter, setBranchFilter, isBranchMenuOpen, setIsBranchMenuOpen, availableBranches } = ctx;
            return (
                <FilterDropdown
                    label="Branche"
                    filter={branchFilter}
                    setFilter={setBranchFilter}
                    isOpen={isBranchMenuOpen}
                    setIsOpen={setIsBranchMenuOpen}
                    options={availableBranches}
                    handleSort={handleSort}
                    colId={colId}
                    isSorted={isSorted}
                    SortIcon={SortIcon}
                />
            );
        }
        case 'groupe': {
            const { groupFilter, setGroupFilter, isGroupMenuOpen, setIsGroupMenuOpen, availableGroups } = ctx;
            return (
                <FilterDropdown
                    label="Groupe"
                    filter={groupFilter}
                    setFilter={setGroupFilter}
                    isOpen={isGroupMenuOpen}
                    setIsOpen={setIsGroupMenuOpen}
                    options={availableGroups}
                    handleSort={handleSort}
                    colId={colId}
                    isSorted={isSorted}
                    SortIcon={SortIcon}
                />
            );
        }
        case 'periode': {
            const { periodeFilter, setPeriodeFilter, isPeriodeMenuOpen, setIsPeriodeMenuOpen, availablePeriodes } = ctx;
            return (
                <FilterDropdown
                    label="Période"
                    filter={periodeFilter}
                    setFilter={setPeriodeFilter}
                    isOpen={isPeriodeMenuOpen}
                    setIsOpen={setIsPeriodeMenuOpen}
                    options={availablePeriodes}
                    handleSort={handleSort}
                    colId={colId}
                    isSorted={isSorted}
                    SortIcon={SortIcon}
                />
            );
        }
        default: {
            return (
                <div
                    className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort(colId)}
                >
                    {COLUMN_LABELS[colId]}
                    {SortIcon && <SortIcon size={12} className="text-primary" />}
                </div>
            );
        }
    }
}

const FilterDropdown = ({
    label,
    filter,
    setFilter,
    isOpen,
    setIsOpen,
    options,
    handleSort,
    colId,
    isSorted,
    SortIcon
}: {
    label: string,
    filter: string,
    setFilter: (v: string) => void,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    options: string[],
    handleSort: (id: ColumnId) => void,
    colId: ColumnId,
    isSorted: boolean,
    SortIcon: any
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, setIsOpen]);

    const getMenuPosition = () => {
        if (!triggerRef.current) return { top: 0, left: 0 };
        const rect = triggerRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX
        };
    };

    const pos = getMenuPosition();

    return (
        <>
            <div
                ref={triggerRef}
                className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                {label}
                <Filter size={14} className={clsx(filter !== 'all' || isOpen ? "text-primary" : "text-grey-medium")} />
                {SortIcon && <SortIcon size={12} className="text-primary" />}
            </div>
            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    style={{ 
                        position: 'fixed', 
                        top: pos.top - window.scrollY, 
                        left: pos.left - window.scrollX,
                        zIndex: 9999 
                    }}
                    className="w-56 bg-surface border border-white/20 rounded-xl py-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm max-h-64 overflow-y-auto custom-scrollbar"
                >
                    <div
                        className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-text-main"
                        onClick={() => { setFilter('all'); setIsOpen(false); }}
                    >
                        Tous
                        {filter === 'all' && <ChevronRight size={14} className="ml-auto text-primary" />}
                    </div>
                    <div className="h-px bg-white/10 my-1 mx-3" />
                    {options.map(opt => (
                        <div
                            key={opt}
                            className={clsx(
                                "px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors",
                                filter === opt ? "text-primary font-semibold" : "text-text-main"
                            )}
                            onClick={() => { setFilter(opt); setIsOpen(false); }}
                        >
                            <span className="truncate">{opt}</span>
                            {filter === opt && <ChevronRight size={14} className="ml-auto" />}
                        </div>
                    ))}
                    <div className="h-px bg-white/10 my-1 mx-3" />
                    <div
                        className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-2 transition-colors text-grey-medium"
                        onClick={() => { handleSort(colId); setIsOpen(false); }}
                    >
                        {isSorted && SortIcon === ArrowDown ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        <span>Trier</span>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

// --- Components memoïsés pour la performance ---

const EvaluationCell = React.memo(({ 
    colId, 
    ev, 
    width,
    onSelectEvaluation, 
    setEvalToDelete, 
    onEditEvaluation,
    selectedEvalIds,
    setSelectedEvalIds
}: { 
    colId: ColumnId, 
    ev: any, 
    width: number,
    onSelectEvaluation: (id: string) => void,
    setEvalToDelete: (id: string | null) => void,
    onEditEvaluation: (ev: any) => void,
    selectedEvalIds: Set<string>,
    setSelectedEvalIds: (s: Set<string>) => void
}) => {
    return (
        <td
            style={{ width, minWidth: width, maxWidth: width }}
            className={clsx(
                "p-4 relative whitespace-nowrap overflow-hidden text-ellipsis",
                colId === 'titre' && "sticky left-0 z-20 bg-surface group-hover:bg-white/[0.05] transition-colors after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-white/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] cursor-pointer"
            )}
            onClick={() => {
                if (colId === 'titre') onSelectEvaluation(ev.id);
            }}
        >
            {renderCellContent(colId, ev, onSelectEvaluation, setEvalToDelete, onEditEvaluation, selectedEvalIds, setSelectedEvalIds)}
        </td>
    );
});

EvaluationCell.displayName = 'EvaluationCell';

const EvaluationRow = React.memo(({ 
    ev, 
    columns, 
    onSelectEvaluation, 
    onEditEvaluation, 
    setEvalToDelete,
    selectedEvalIds,
    setSelectedEvalIds
}: { 
    ev: any, 
    columns: ColumnConfig[], 
    onSelectEvaluation: (id: string) => void,
    onEditEvaluation: (ev: any) => void,
    setEvalToDelete: (id: string | null) => void,
    selectedEvalIds: Set<string>,
    setSelectedEvalIds: (s: Set<string>) => void
}) => {
    const isSelected = selectedEvalIds.has(ev.id);
    return (
        <tr className={clsx(
            "transition-colors group",
            isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/[0.02]"
        )}>
            {columns.map(col => (
                <EvaluationCell
                    key={col.id}
                    colId={col.id}
                    ev={ev}
                    width={col.width}
                    onSelectEvaluation={onSelectEvaluation}
                    onEditEvaluation={onEditEvaluation}
                    setEvalToDelete={setEvalToDelete}
                    selectedEvalIds={selectedEvalIds}
                    setSelectedEvalIds={setSelectedEvalIds}
                />
            ))}
        </tr>
    );
});

EvaluationRow.displayName = 'EvaluationRow';

// Render cell content - helper non-react function for flexibility
function renderCellContent(
    colId: ColumnId, 
    ev: any, 
    onSelectEvaluation: (id: string) => void,
    setEvalToDelete: (id: string | null) => void,
    onEditEvaluation: (ev: any) => void,
    selectedEvalIds: Set<string>,
    setSelectedEvalIds: (s: Set<string>) => void
) {
    switch (colId) {
        case 'select': {
            const isSelected = selectedEvalIds.has(ev.id);
            return (
                <div className="flex justify-center items-center">
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedEvalIds);
                            if (isSelected) newSelected.delete(ev.id);
                            else newSelected.add(ev.id);
                            setSelectedEvalIds(newSelected);
                        }}
                        className={clsx(
                            "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
                            isSelected ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)]" : "bg-white/5 border-white/20 hover:border-white/40"
                        )}
                    >
                        {isSelected && <ChevronRight className="w-3.5 h-3.5 text-white rotate-90" strokeWidth={4} />}
                    </div>
                </div>
            );
        }
        case 'titre':
            return (
                <div
                    className="flex items-center gap-2 group/title cursor-pointer"
                    onClick={() => onSelectEvaluation(ev.id)}
                >
                    <span className="font-semibold text-text-main group-hover/title:text-primary transition-colors truncate">
                        {ev.titre}
                    </span>
                    <ChevronRight size={14} className="text-grey-medium opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                </div>
            );
        case 'branche':
            return <span className="text-text-main truncate">{ev._brancheName}</span>;
        case 'groupe':
            return <span className="text-text-main truncate">{ev._groupeName}</span>;
        case 'periode':
            return ev.periode ? (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {ev.periode}
                </span>
            ) : <span className="text-white/20">—</span>;
        case 'date':
            return ev.date ? (
                <span className="text-grey-light text-xs font-semibold uppercase tracking-wider">
                    {new Date(ev.date).toLocaleDateString('fr-FR')}
                </span>
            ) : <span className="text-white/20">—</span>;
        case 'note_max':
            const displayMax = ev._real_note_max !== undefined ? ev._real_note_max : ev.note_max;
            return <span className="text-text-main font-semibold">/ {displayMax}</span>;
        case 'type_note':
            return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-grey-medium border border-white/10 truncate inline-block">
                    {ev._typeNoteName}
                </span>
            );
        case 'nbQuestions':
            return (
                <span className={clsx("font-semibold", ev._nbQuestions > 0 ? "text-text-main" : "text-white/20")}>
                    {ev._nbQuestions}
                </span>
            );
        case 'nbResultats':
            return (
                <span className={clsx("font-semibold", ev._nbResultats > 0 ? "text-text-main" : "text-white/20")}>
                    {ev._nbResultats}
                </span>
            );
        case 'moyenne':
            const realAvgMax = ev._real_note_max !== undefined ? ev._real_note_max : ev.note_max;
            let displayAvg = ev._moyenne;
            let percentage = 0;
            if (ev._moyenne !== null && ev.note_max > 0) {
                percentage = (ev._moyenne / ev.note_max) * 100;
                if (ev._real_note_max !== undefined) {
                    displayAvg = (ev._moyenne / ev.note_max) * ev._real_note_max;
                }
            }
            return (
                <div className="flex items-center gap-2 group">
                    {ev._moyenne !== null ? (
                        <div className="flex flex-col items-start justify-center gap-0.5">
                            <span className={clsx(
                                "font-black text-base tabular-nums leading-none",
                                percentage >= 80 ? "text-emerald-500" :
                                percentage >= 50 ? "text-blue-500" : "text-rose-500"
                            )}>
                                {Math.round(percentage)}%
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-[10px] text-grey-light leading-none">
                                    {displayAvg.toFixed(1)}
                                </span>
                                <span className="text-[9px] text-grey-medium leading-none">/ {realAvgMax}</span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-white/20 italic text-xs">—</span>
                    )}
                    
                    <div 
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                        title={ev._moyenne !== null 
                            ? "Moyenne calculée sur l'ensemble des élèves présents ayant une note." 
                            : "La moyenne n'apparaît que si au moins un élève présent a une note enregistrée."
                        }
                    >
                        <InfoIcon size={12} className="text-grey-medium hover:text-primary transition-colors" />
                    </div>
                </div>
            );
        case 'actions':
            return (
                <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("[UI] Excel button clicked");
                            exportEvaluationData(ev);
                        }}
                        className="p-2 rounded-lg text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors mr-1"
                        title="Télécharger Excel/CSV"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            exportEvaluationPDF(ev);
                        }}
                        className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors mr-1"
                        title="Télécharger PDF"
                    >
                        <FileText size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditEvaluation(ev);
                        }}
                        className="p-2 rounded-lg text-grey-medium hover:text-white hover:bg-white/10 transition-colors mr-1"
                        title="Modifier"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEvalToDelete(ev.id);
                        }}
                        className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Supprimer"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            );
        default:
            return null;
    }
}

/**
 * 1. Le composant principal est lancé et télécharge la quasi-totalité des évaluations inscrites sur le compte de l'enseignant.
 * 2. Rapidement, il interroge les préférences du navigateur pour retrouver la disposition des colonnes (largeur, ordre) telle que le prof l'avait laissée.
 * 3. Il inventorie lui-même tous les mots-clés présents dans ces évaluations (noms de branches, de trimestres, etc.) pour créer automatiquement les options de filtrage dans les entêtes du tableau.
 * 4. De base, il liste l'intégralité du travail avec une moyenne globale calculée de façon automatique montrant la réussite de la classe.
 * 5. L'utilisateur peut interagir d'un clic pour trier une colonne, taper dans une barre de recherche cachée sous le titre, ou bien glisser les colonnes entières de gauche à droite. Le tableau réagit en temps réel et masque les éléments indésirables.
 * 6. S'il clique enfin sur le titre de l'une des lignes existantes, le module range son tableau et transporte l'utilisateur vers l'outil détaillé de cette évaluation (ce qui clôt l'usage de ce fichier).
 */

async function exportEvaluationData(ev: any) {
    try {
        const { toast } = await import('sonner');
        toast.loading("Génération du fichier Excel...", { id: `export_${ev.id}` });

        const { supabase, getCurrentUser } = await import('../../../lib/database');
        const user = await getCurrentUser();
        if (!user) return;

        // 1. Get Students
        const { trackingService } = await import('../../tracking/services/trackingService');
        const studentsData = await trackingService.fetchStudentsInGroup(ev.group_id, user.id);
        const students = (studentsData?.full || []).sort((a: any, b: any) => a.nom.localeCompare(b.nom));

        // 2. Get Results
        const { data: resultsData } = await supabase.from('Resultat').select('*').eq('evaluation_id', ev.id);
        const results = resultsData || [];

        // 3. Get Questions and Question Results
        const { data: qData } = await supabase.from('EvaluationQuestion').select('*').eq('evaluation_id', ev.id).order('ordre', { ascending: true });
        const questions = qData || [];

        let questionResults: any[] = [];
        if (questions.length > 0) {
            const questionIds = questions.map((q: any) => q.id);
            const { data: qrData } = await supabase.from('ResultatQuestion').select('*').in('question_id', questionIds);
            questionResults = qrData || [];
        }

        // 4. Build CSV
        const sep = ";";
        const headers = ["Élève", "Niveau", "Statut", `Total (/${ev.note_max})`];
        questions.forEach((q: any) => {
            headers.push(`${q.titre} (/${q.note_max})`);
        });
        headers.push("Commentaire");

        let csvContent = headers.join(sep) + "\n";

        students.forEach((student: any) => {
            const res = results.find((r: any) => r.eleve_id === student.id);

            const formatField = (field: any) => {
                if (field === null || field === undefined) return "";
                let str = String(field);
                if (str.includes(sep) || str.includes('"') || str.includes('\n')) {
                    str = `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const stat = res?.statut || "present";
            const total = res?.note ?? "";

            const row = [
                `${student.prenom} ${student.nom}`,
                student.Niveau?.nom || "",
                stat,
                total
            ];

            questions.forEach((q: any) => {
                const qRes = questionResults.find((qr: any) => qr.question_id === q.id && qr.eleve_id === student.id);
                row.push(qRes?.note ?? "");
            });

            row.push(res?.commentaires || "");

            csvContent += row.map(formatField).join(sep) + "\n";
        });

        // 5. Download
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        let safeTitle = (ev.titre || 'evaluation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("download", `export_${safeTitle}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Fichier Excel généré avec succès !", { id: `export_${ev.id}` });
    } catch (error) {
        console.error("Export error", error);
        const { toast } = await import('sonner');
        toast.error("Erreur lors de la génération de l'export", { id: `export_${ev.id}` });
    }
}

async function exportEvaluationPDF(ev: any) {
    return exportBulkEvaluationPDF([ev.id], [ev]);
}

async function exportBulkEvaluationPDF(evalIds: string[], evalSummaryList: any[]) {
    // On désactive les logs de debug pour la version finale
    const log = (msg: string) => {}; 
    /*
    const logHelper = (msg: string) => (window as any)._addDebugLog?.(msg);
    (window as any)._clearDebug?.();
    logHelper(`🚀 [1/4] Démarrage export groupé (${evalIds.length} évaluations)`);
    */
    
    try {
        log("📂 Chargement des dépendances...");
        const { toast } = await import('sonner');
        const { pdf } = await import('@react-pdf/renderer');
        const { default: EvaluationPDFComponent } = await import('./EvaluationPDF');
        const { gradeService } = await import('../services');
        const { getCurrentUser, supabase } = await import('../../../lib/database');
        const { trackingService } = await import('../../tracking/services/trackingService');
        
        const toastId = `bulk_pdf_export_${Date.now()}`;
        toast.loading(`Préparation de l'export (${evalIds.length} évaluations)...`, { id: toastId });

        log("👤 Identification de l'utilisateur...");
        const user = await getCurrentUser();
        if (!user) {
            log("❌ Erreur: Utilisateur non trouvé");
            toast.error("Utilisateur non authentifié", { id: toastId });
            return;
        }

        log("📡 Récupération globale des données en lot...");
        
        // 1. Fetch all detailed evaluation data (to get group_id, type_note_id, etc.)
        const { data: fullEvals, error: evalError } = await supabase
            .from('Evaluation')
            .select('*, Branche(nom), Groupe(nom)')
            .in('id', evalIds);
        
        if (evalError) throw evalError;

        // 2. Identify all groups involved to get all unique students
        const groupIds = Array.from(new Set(fullEvals.map(e => e.group_id)));
        log(`👥 Recherche des élèves dans ${groupIds.length} groupes...`);
        
        // Fetch all students for these groups
        const studentsPromises = groupIds.map(gid => trackingService.fetchStudentsInGroup(gid, user.id));
        const studentsResults = await Promise.all(studentsPromises);
        
        // Merge and unique students
        const allStudentsMap = new Map();
        studentsResults.forEach(res => {
            (res?.full || []).forEach((s: any) => {
                allStudentsMap.set(s.id, s);
            });
        });
        const allStudents = Array.from(allStudentsMap.values()).sort((a, b) => a.nom.localeCompare(b.nom));
        log(`✅ ${allStudents.length} élèves identifiés au total.`);

        // 3. Fetch all questions, results, questionResults for ALL evaluations
        log("📊 Récupération de tous les résultats et critères...");
        const [
            allQuestions,
            allResults,
            allQuestionResults,
            noteTypes
        ] = await Promise.all([
            gradeService.getQuestionsForEvaluations(evalIds, user.id),
            gradeService.getResultsForEvaluations(evalIds, user.id),
            gradeService.getQuestionResultsForEvaluations(evalIds, user.id),
            gradeService.getNoteTypes(user.id)
        ]);

        log(`✅ Données chargées : ${allQuestions.length} critères, ${allResults.length} notes.`);

        // 4. Group data for the PDF component
        // The PDF component will now expect an array of evaluations, each with its own specific data.
        const evaluationsData = fullEvals.map(ev => {
            const evQuestions = allQuestions.filter((q: any) => q.evaluation_id === ev.id);
            const evResults = allResults.filter((r: any) => r.evaluation_id === ev.id);
            const evQuestionResults = allQuestionResults.filter((qr: any) => {
                // Since qr might not have evaluation_id directly (depending on DB structure), 
                // we match it via question_id -> evQuestions
                return evQuestions.some((q: any) => q.id === qr.question_id);
            });
            const typeNote = noteTypes.find((nt: any) => nt.id === ev.type_note_id);

            return {
                evaluation: { ...ev, _brancheName: ev.Branche?.nom },
                questions: evQuestions,
                results: evResults,
                questionResults: evQuestionResults,
                typeNote
            };
        });

        // --- GÉNÉRATION DU FICHIER RÉEL ---
        log("");
        log("📁 GÉNÉRATION DES DOCUMENTS INDIVIDUELS...");
        log("⏳ Fusion des fiches élèves (cela peut prendre quelques secondes)...");
        
        try {
            const { PDFDocument } = await import('pdf-lib');
            const mergedPdf = await PDFDocument.create();
            let processedCount = 0;

            for (const student of allStudents) {
                processedCount++;
                log(`📄 [${processedCount}/${allStudents.length}] Génération pour ${student.prenom} ${student.nom}...`);
                
                const pdfBlob = await pdf(
                    <EvaluationPDFComponent 
                        bulkMode={true}
                        evaluationsData={evaluationsData}
                        student={student}
                    />
                ).toBlob();
                
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            log("🔗 Fusion finale des documents...");
            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Export_Groupé_Evaluations_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            log("✅ EXPORT TERMINÉ AVEC SUCCÈS");
            toast.success("PDF groupé téléchargé !", { id: toastId });
        } catch (pdfError: any) {
            log("❌ ERREUR GÉNÉRATION PDF: " + pdfError.message);
            toast.error("Échec de génération PDF", { id: toastId });
        }
        
    } catch (error: any) {
        log("❌ ERREUR CRITIQUE: " + error.message);
        const { toast } = await import('sonner');
        toast.error(`Erreur : ${error.message}`);
    }
}

// Expose for debugging if needed
if (typeof window !== 'undefined') {
    (window as any)._exportEvaluationPDF = exportEvaluationPDF;
    (window as any)._exportEvaluationData = exportEvaluationData;
    (window as any)._exportBulkEvaluationPDF = exportBulkEvaluationPDF;
}

export default EvaluationsTableExcel;
