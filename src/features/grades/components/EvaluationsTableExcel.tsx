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

import React, { useState, useRef, useEffect } from 'react';
import { Table, Filter, ArrowUp, ArrowDown, Search, X, ChevronRight, Loader2, BarChart3, Trash2, Edit2, Download, Info as InfoIcon } from 'lucide-react';
import { CardInfo, ConfirmModal } from '../../../core';
import { useAllEvaluations } from '../hooks/useAllEvaluations';
import { useGradeMutations } from '../hooks/useGrades';
import { useUserPreferences } from '../../../hooks/useUserPreferences';
import clsx from 'clsx';

type ColumnId = 'titre' | 'branche' | 'groupe' | 'periode' | 'date' | 'note_max' | 'type_note' | 'nbQuestions' | 'nbResultats' | 'moyenne' | 'actions';
type ColumnConfig = { id: ColumnId; width: number };

const DEFAULT_COLUMNS: ColumnConfig[] = [
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
    setPeriodeFilter: (v: string) => void;
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
    const { evaluations, loading } = useAllEvaluations();
    const { deleteEvaluation } = useGradeMutations();
    const [evalToDelete, setEvalToDelete] = useState<string | null>(null);

    // Prépare un lien avec la mémoire locale pour mémoriser et restaurer la largeur des colonnes choisie par l'utilisateur d'une session à l'autre.
    const [savedColumns, setSavedColumns, loadingColumns] = useUserPreferences<ColumnConfig[]>('evaluations_table_columns_v1', DEFAULT_COLUMNS);
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

    useEffect(() => {
        if (!loadingColumns && savedColumns) {
            const merged = savedColumns.filter(c => DEFAULT_COLUMNS.some(dc => dc.id === c.id));
            const missing = DEFAULT_COLUMNS.filter(dc => !merged.some(mc => mc.id === dc.id));
            setColumns([...merged, ...missing]);
        }
    }, [savedColumns, loadingColumns]);

    const savePreferences = (newCols: ColumnConfig[]) => {
        setColumns(newCols);
        setSavedColumns(newCols);
    };

    // Prépare la mécanique complexe permettant de cliquer, maintenir et glisser une colonne (drag and drop) pour la déplacer ailleurs dans le tableau.
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

    // Prépare la mécanique visuelle qui permet d'attraper le bord d'une colonne avec la souris pour l'élargir ou la rétrécir.
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
            const diff = e.clientX - startX;
            const newWidth = Math.max(60, startWidth + diff);
            setColumns(prev => {
                const updated = [...prev];
                updated[resizingColumnIndex] = { ...updated[resizingColumnIndex], width: newWidth };
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

    // Prépare la mécanique pour mettre le tableau en ordre (ex: classer alphabétiquement par titre, ou par moyenne de la plus haute à la plus basse).
    const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (colId: ColumnId) => {
        if (sortColumn === colId) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else {
                setSortColumn(null);
                setSortDirection('asc');
            }
        } else {
            setSortColumn(colId);
            setSortDirection('asc');
        }
    };

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchMenuRef = useRef<HTMLDivElement>(null);

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
            if (searchMenuRef.current && !searchMenuRef.current.contains(target)) setIsSearchOpen(false);
            if (branchMenuRef.current && !branchMenuRef.current.contains(target)) setIsBranchMenuOpen(false);
            if (groupMenuRef.current && !groupMenuRef.current.contains(target)) setIsGroupMenuOpen(false);
            if (periodeMenuRef.current && !periodeMenuRef.current.contains(target)) setIsPeriodeMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scanne toutes les évaluations existantes pour en extraire et bâtir astucieusement les listes des matières et groupes disponibles pour les menus de filtrage.
    const availableBranches = Array.from(new Set(evaluations.map((e: any) => e._brancheName))).filter(Boolean).sort() as string[];
    const availableGroups = Array.from(new Set(evaluations.map((e: any) => e._groupeName))).filter(Boolean).sort() as string[];
    const availablePeriodes = Array.from(new Set(evaluations.map((e: any) => e.periode))).filter(Boolean).sort() as string[];

    // En comparant la liste brute aux "filtres actifs" choisis par le prof, le système construit la liste définitive des évaluations à afficher à l'écran.
    const displayedEvaluations = evaluations
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
            </div>

            {/* Table */}
            <CardInfo className="flex-1 overflow-hidden flex flex-col p-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <style>{columns.map(c => `.col-${c.id} { width: ${c.width}px; max-width: ${c.width}px; }`).join('\n')}</style>
                    <table className="w-full text-left border-collapse text-sm whitespace-nowrap table-fixed">
                        <thead className="sticky top-0 z-10 bg-table-header select-none">
                            <tr>
                                {columns.map((col, index) => (
                                    <th
                                        key={col.id}
                                        className={clsx(
                                            `col-${col.id}`,
                                            "p-4 font-bold text-grey-light uppercase tracking-wider text-xs border-b border-white/10 relative transition-colors duration-200",
                                            draggedColumnIndex === index && "opacity-50 bg-white/5",
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
                                                searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchMenuRef,
                                                branchFilter, setBranchFilter, isBranchMenuOpen, setIsBranchMenuOpen, branchMenuRef, availableBranches,
                                                groupFilter, setGroupFilter, isGroupMenuOpen, setIsGroupMenuOpen, groupMenuRef, availableGroups,
                                                periodeFilter, setPeriodeFilter, isPeriodeMenuOpen, setIsPeriodeMenuOpen, periodeMenuRef, availablePeriodes
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
                                    <td colSpan={columns.length} className="p-12 text-center text-grey-medium">
                                        Aucune évaluation ne correspond aux filtres.
                                    </td>
                                </tr>
                            ) : (
                                displayedEvaluations.map((ev: any) => (
                                    <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors group">
                                        {columns.map(col => (
                                            <td
                                                key={col.id}
                                                className={clsx(
                                                    `col-${col.id}`,
                                                    "p-4 relative whitespace-nowrap overflow-hidden text-ellipsis",
                                                    col.id === 'titre' && "cursor-pointer"
                                                )}
                                                onClick={() => {
                                                    if (col.id === 'titre') onSelectEvaluation(ev.id);
                                                }}
                                            >
                                                {renderCellContent(col.id, ev, onSelectEvaluation, setEvalToDelete, onEditEvaluation)}
                                            </td>
                                        ))}
                                    </tr>
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
                        deleteEvaluation(evalToDelete);
                        setEvalToDelete(null);
                    }
                }}
                title="Supprimer l'évaluation"
                message="Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action supprimera également toutes les notes associées."
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
};

// Petite aide : convertit les informations compliquées d'une case (ex: une date) en un simple texte ou chiffre facilement triable par le système.
function getCellSortValue(ev: any, colId: ColumnId): string | number | null {
    switch (colId) {
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
        case 'titre': {
            const { searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchMenuRef } = ctx;
            return (
                <>
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                    >
                        Titre
                        <Filter size={14} className={clsx(searchQuery || isSearchOpen ? "text-primary" : "text-grey-medium")} />
                        {SortIcon && <SortIcon size={12} className="text-primary" />}
                    </div>
                    {isSearchOpen && (
                        <div
                            ref={searchMenuRef}
                            className="absolute top-full left-0 mt-2 w-64 bg-surface border border-white/10 rounded-xl z-50 py-3 px-4 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm"
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
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-surface-light border border-white/10 rounded-lg pl-8 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50 transition-colors placeholder:text-grey-medium"
                                    />
                                </div>
                                <button
                                    onClick={() => handleSort('titre')}
                                    className={clsx("p-2 rounded-lg border transition-colors shrink-0", isSorted ? "bg-primary/20 border-primary/30 text-primary" : "border-white/10 text-grey-medium hover:text-white hover:bg-white/5")}
                                    title="Trier"
                                >
                                    {SortIcon ? <SortIcon size={14} /> : <ArrowUp size={14} />}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            );
        }
        case 'branche': {
            const { branchFilter, setBranchFilter, isBranchMenuOpen, setIsBranchMenuOpen, branchMenuRef, availableBranches } = ctx;
            return renderDropdownFilter('Branche', branchFilter, setBranchFilter, isBranchMenuOpen, setIsBranchMenuOpen, branchMenuRef, availableBranches, handleSort, colId, isSorted, SortIcon);
        }
        case 'groupe': {
            const { groupFilter, setGroupFilter, isGroupMenuOpen, setIsGroupMenuOpen, groupMenuRef, availableGroups } = ctx;
            return renderDropdownFilter('Groupe', groupFilter, setGroupFilter, isGroupMenuOpen, setIsGroupMenuOpen, groupMenuRef, availableGroups, handleSort, colId, isSorted, SortIcon);
        }
        case 'periode': {
            const { periodeFilter, setPeriodeFilter, isPeriodeMenuOpen, setIsPeriodeMenuOpen, periodeMenuRef, availablePeriodes } = ctx;
            return renderDropdownFilter('Période', periodeFilter, setPeriodeFilter, isPeriodeMenuOpen, setIsPeriodeMenuOpen, periodeMenuRef, availablePeriodes, handleSort, colId, isSorted, SortIcon);
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

function renderDropdownFilter(
    label: string,
    filter: string,
    setFilter: (v: string) => void,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    menuRef: React.RefObject<HTMLDivElement>,
    options: string[],
    handleSort: (id: ColumnId) => void,
    colId: ColumnId,
    isSorted: boolean,
    SortIcon: any
) {
    return (
        <>
            <div
                className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                {label}
                <Filter size={14} className={clsx(filter !== 'all' || isOpen ? "text-primary" : "text-grey-medium")} />
                {SortIcon && <SortIcon size={12} className="text-primary" />}
            </div>
            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-full left-0 mt-2 w-56 bg-surface border border-white/20 rounded-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 normal-case tracking-normal font-normal text-sm max-h-64 overflow-y-auto custom-scrollbar"
                >
                    <div
                        className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-text-main"
                        onClick={() => setFilter('all')}
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
                            onClick={() => setFilter(opt)}
                        >
                            <span className="truncate">{opt}</span>
                            {filter === opt && <ChevronRight size={14} className="ml-auto" />}
                        </div>
                    ))}
                    <div className="h-px bg-white/10 my-1 mx-3" />
                    <div
                        className="px-3 py-1.5 hover:bg-white/5 cursor-pointer flex items-center gap-2 transition-colors text-grey-medium"
                        onClick={() => handleSort(colId)}
                    >
                        {isSorted ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                        <span>Trier</span>
                    </div>
                </div>
            )}
        </>
    );
}

// Render cell content
function renderCellContent(
    colId: ColumnId, 
    ev: any, 
    onSelectEvaluation: (id: string) => void,
    setEvalToDelete: (id: string | null) => void,
    onEditEvaluation: (ev: any) => void
) {
    switch (colId) {
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
        toast.loading("Génération du fichier Excel/CSV...", { id: `export_${ev.id}` });

        const { supabase } = await import('../../../lib/database');
        const { trackingService } = await import('../../tracking/services/trackingService');

        // 1. Get Students
        const studentData = await trackingService.fetchStudentsInGroup(ev.group_id);
        const students = studentData.full || [];

        // Sort Students
        students.sort((a: any, b: any) => {
            const niveauA = a.Niveau?.ordre ?? 0;
            const niveauB = b.Niveau?.ordre ?? 0;
            if (niveauA !== niveauB) return niveauA - niveauB;

            const niveauCmp = (a.Niveau?.nom || '').localeCompare(b.Niveau?.nom || '');
            if (niveauCmp !== 0) return niveauCmp;
            const prenomCmp = (a.prenom || '').localeCompare(b.prenom || '');
            if (prenomCmp !== 0) return prenomCmp;
            return (a.nom || '').localeCompare(b.nom || '');
        });

        // 2. Get Global Results
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

            row.push(res?.commentaire || "");

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

export default EvaluationsTableExcel;
