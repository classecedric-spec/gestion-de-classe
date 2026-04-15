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
import { CardInfo, ConfirmModal, MultiFilterSelect } from '../../../core';
import { useAllEvaluations } from '../hooks/useAllEvaluations';
import { useGradeMutations } from '../hooks/useGrades';
import { useUserPreferences } from '../../../hooks/useUserPreferences';
import { downloadFile, getFileHandle, writeToHandle } from '../../../lib/helpers/download.ts';
import { 
    Table, 
    X, 
    FileText, 
    Loader2, 
    BarChart3, 
    Search, 
    ArrowUp, 
    ArrowDown, 
    Filter, 
    Edit2, 
    Trash2, 
    ChevronRight,
    Download,
    Info as InfoIcon,
    Loader
} from 'lucide-react';
import clsx from 'clsx';
import PdfProgress from '../../../core/PdfProgress';

type ColumnId = 'select' | 'titre' | 'branche' | 'groupe' | 'periode' | 'date' | 'note_max' | 'type_note' | 'nbQuestions' | 'nbResultats' | 'moyenne' | 'actions';
type ColumnConfig = { id: ColumnId; width: number };
type SortRule = { id: ColumnId; direction: 'asc' | 'desc' };

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

const COLUMN_ALIGN: Record<ColumnId, 'left' | 'center' | 'right'> = {
    select: 'center',
    titre: 'left',
    branche: 'left',
    groupe: 'center',
    periode: 'center',
    date: 'center',
    note_max: 'center',
    type_note: 'center',
    nbQuestions: 'center',
    nbResultats: 'center',
    moyenne: 'left',
    actions: 'center'
};

interface EvaluationsTableExcelProps {
    onSelectEvaluation: (evalId: string) => void;
    onEditEvaluation: (ev: any) => void;
    selectedBranches: string[];
    setSelectedBranches: (v: string[]) => void;
    selectedGroups: string[];
    setSelectedGroups: (v: string[]) => void;
    selectedPeriodes: string[];
    setSelectedPeriodes: (v: string[]) => void;
    onResetFilters: () => void;
}

const EvaluationsTableExcel: React.FC<EvaluationsTableExcelProps> = ({ 
    onSelectEvaluation, 
    onEditEvaluation,
    selectedBranches,
    setSelectedBranches,
    selectedGroups,
    setSelectedGroups,
    selectedPeriodes,
    setSelectedPeriodes,
    onResetFilters
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

    // États pour la génération de PDF
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);
    const [pdfProgressText, setPdfProgressText] = useState('');

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

    // ✅ Correction : on cherche la colonne par son NOM (id) dans la liste complète,
    // pas par sa position visuelle — car la liste affichée peut avoir une colonne
    // ('Sélection') en moins, ce qui décalait toutes les positions d'un cran.
    const handleResizeStart = useCallback((e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const realIndex = columns.findIndex(c => c.id === colId);
        if (realIndex === -1) return;
        setResizingColumnIndex(realIndex);
        setStartX(e.clientX);
        setStartWidth(columns[realIndex].width);
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
    // Sorting state: Multiple rules for cascade sorting
    const [sortRules, setSortRules] = useState<SortRule[]>([]);

    const handleSort = useCallback((colId: ColumnId) => {
        setSortRules(prev => {
            const existingRuleIndex = prev.findIndex(r => r.id === colId);
            
            if (existingRuleIndex === -1) {
                // Not in sort rules: add it in 'asc'
                return [...prev, { id: colId, direction: 'asc' }];
            }
            
            const existingRule = prev[existingRuleIndex];
            if (existingRule.direction === 'asc') {
                // ASC -> DESC
                const newRules = [...prev];
                newRules[existingRuleIndex] = { ...existingRule, direction: 'desc' };
                return newRules;
            } else {
                // DESC -> REMOVE
                return prev.filter(r => r.id !== colId);
            }
        });
    }, []);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchMenuRef = useRef<HTMLDivElement>(null);
    const searchTriggerRef = useRef<HTMLDivElement>(null);

    // Logic for resetting all filters
    const hasActiveFilters = searchQuery.length > 0 || 
        selectedBranches.length > 0 || 
        selectedGroups.length > 0 || 
        selectedPeriodes.length > 0 ||
        sortRules.length > 0;
    
    const handleResetFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedBranches([]);
        setSelectedGroups([]);
        setSelectedPeriodes([]);
        setSortRules([]);
        onResetFilters();
    }, [setSearchQuery, setSelectedBranches, setSelectedGroups, setSelectedPeriodes, setSortRules, onResetFilters]);

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
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen]);

    // Scanne toutes les évaluations existantes pour en extraire et bâtir astucieusement les listes des matières et groupes disponibles pour les menus de filtrage.
    const availableBranches = useMemo(() => Array.from(new Set(evaluations.map((e: any) => e._brancheName))).filter(Boolean).sort() as string[], [evaluations]);
    const availableGroups = useMemo(() => Array.from(new Set(evaluations.map((e: any) => e._groupeName))).filter(Boolean).sort() as string[], [evaluations]);
    const availablePeriodes = useMemo(() => {
        const p = Array.from(new Set(evaluations.map((e: any) => e.periode || "Sans période"))) as string[];
        return p.sort((a, b) => {
            if (a === "Sans période") return 1;
            if (b === "Sans période") return -1;
            return a.localeCompare(b);
        });
    }, [evaluations]);

    // En comparant la liste brute aux "filtres actifs" choisis par le prof, le système construit la liste définitive des évaluations à afficher à l'écran.
    const displayedEvaluations = useMemo(() => {
        return evaluations
            .filter((ev: any) => {
                if (searchQuery && !ev.titre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                if (selectedBranches.length > 0 && !selectedBranches.includes(ev._brancheName)) return false;
                if (selectedGroups.length > 0 && !selectedGroups.includes(ev._groupeName)) return false;
                if (selectedPeriodes.length > 0 && !selectedPeriodes.includes(ev.periode || "Sans période")) return false;
                return true;
            })
            .sort((a: any, b: any) => {
                if (sortRules.length === 0) return 0;
                
                for (const rule of sortRules) {
                    const dir = rule.direction === 'asc' ? 1 : -1;
                    const valA = getCellSortValue(a, rule.id);
                    const valB = getCellSortValue(b, rule.id);
                    
                    if (valA === valB) continue;
                    
                    if (valA === null) return 1;
                    if (valB === null) return -1;
                    
                    if (typeof valA === 'string') {
                        const cmp = valA.localeCompare(valB as string);
                        if (cmp !== 0) return cmp * dir;
                    } else {
                        const diff = (valA as number) - (valB as number);
                        if (diff !== 0) return diff * dir;
                    }
                }
                return 0;
            });
    }, [evaluations, searchQuery, selectedBranches, selectedGroups, selectedPeriodes, sortRules]);

    const activeColumns = useMemo(() => {
        if (!isPrintMode) return columns.filter(c => c.id !== 'select');
        return columns;
    }, [columns, isPrintMode]);

    const totalTableWidth = useMemo(() => activeColumns.reduce((acc, col) => acc + col.width, 0), [activeColumns]);

    // --- LOGIQUE D'EXPORT ---
    
    const exportEvaluationPDF = async (ev: any) => {
        return exportBulkEvaluationPDF([ev.id], [ev]);
    };

    const exportBulkEvaluationPDF = async (evalIds: string[], evalSummaryList: any[]) => {
        const setProgress = (text: string, percentage: number) => {
            setPdfProgressText(text);
            setPdfProgress(percentage);
        };

        try {
            const { toast } = await import('sonner');
            const { pdf } = await import('@react-pdf/renderer');
            const { default: EvaluationPDFComponent } = await import('./EvaluationPDF');
            const { gradeService } = await import('../services');
            const { getCurrentUser, supabase } = await import('../../../lib/database');
            const { trackingService } = await import('../../tracking/services/trackingService');
            
            // Capture du geste utilisateur pour le "Enregistrer sous"
            let suggestedName = `evaluation_${(evalSummaryList[0]?.titre || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            if (evalIds.length > 1) {
                suggestedName = `evaluations_groupe_${evalIds.length}_fiches.pdf`;
            }

            let fileHandle = null;
            try {
                fileHandle = await getFileHandle(suggestedName, 'application/pdf', 'Document PDF');
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    // L'utilisateur a annulé la fenêtre de dialogue "Enregistrer sous"
                    return;
                }
            }

            setIsGeneratingPDF(true);
            setProgress(`Préparation de l'export (${evalIds.length} évaluations)...`, 5);

            const user = await getCurrentUser();
            if (!user) {
                toast.error("Utilisateur non authentifié");
                setIsGeneratingPDF(false);
                return;
            }

            setProgress("Récupération des données d'évaluation...", 10);
            
            // 1. Fetch all detailed evaluation data
            const { data: fullEvals, error: evalError } = await supabase
                .from('EvaluationWithStats')
                .select('*, Branche(nom), Groupe(nom)')
                .in('id', evalIds);

            if (evalError) throw evalError;

            // 2. Identify all groups involved
            const groupIds = Array.from(new Set(fullEvals.map(e => e.group_id)));
            setProgress(`Recherche des élèves dans ${groupIds.length} groupes...`, 20);
            
            const studentsPromises = groupIds.map(gid => trackingService.fetchStudentsInGroup(gid, user.id));
            const studentsResults = await Promise.all(studentsPromises);
            
            const allStudentsMap = new Map();
            studentsResults.forEach(res => {
                (res?.full || []).forEach((s: any) => {
                    allStudentsMap.set(s.id, s);
                });
            });
            const allStudents = Array.from(allStudentsMap.values()).sort((a: any, b: any) => {
                // 1. Sort by Level Order
                const niveauA = a.Niveau?.ordre ?? a.niveau?.ordre ?? 0;
                const niveauB = b.Niveau?.ordre ?? b.niveau?.ordre ?? 0;
                if (niveauA !== niveauB) return niveauA - niveauB;
                
                // 2. Sort by Level Name
                const levelNomA = a.Niveau?.nom || a.niveau?.nom || '';
                const levelNomB = b.Niveau?.nom || b.niveau?.nom || '';
                const levelCmp = levelNomA.localeCompare(levelNomB);
                if (levelCmp !== 0) return levelCmp;

                // 3. Sort by Name
                return a.nom.localeCompare(b.nom);
            });

            // 3. Fetch all questions, results, questionResults
            setProgress("Chargement des résultats et critères...", 30);
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

            // 4. Group data for the PDF component
            const evaluationsData = evalSummaryList
                .map(summary => fullEvals.find((f: any) => f.id === summary.id))
                .filter(Boolean)
                .map(ev => {
                const evQuestions = allQuestions.filter((q: any) => q.evaluation_id === ev.id);
                const evResults = allResults.filter((r: any) => r.evaluation_id === ev.id);
                const evQuestionResults = allQuestionResults.filter((qr: any) => {
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
            }).sort((a, b) => {
                const branchA = a.evaluation._brancheName || 'Sans matière';
                const branchB = b.evaluation._brancheName || 'Sans matière';
                return branchA.localeCompare(branchB);
            });

            // --- GÉNÉRATION DU FICHIER ---
            setProgress("Génération des documents individuels...", 40);
            
            try {
                const { PDFDocument } = await import('pdf-lib');
                const mergedPdf = await PDFDocument.create();
                let processedCount = 0;

                for (const student of allStudents) {
                    processedCount++;
                    const percent = 40 + Math.floor((processedCount / allStudents.length) * 50);
                    setProgress(`Fiche élève: ${student.prenom} ${student.nom}...`, percent);
                    
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

                setProgress("Fusion finale des documents...", 95);
                const mergedPdfBytes = await mergedPdf.save();
                const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
                
                // Écriture finale
                if (fileHandle) {
                    await writeToHandle(fileHandle, blob);
                } else {
                    await downloadFile(blob, suggestedName, 'Document PDF');
                }
                
                setProgress("Export terminé !", 100);
                setTimeout(() => setIsGeneratingPDF(false), 1000);
                toast.success("PDF exporté avec succès !");
            } catch (pdfError: any) {
                console.error("PDF generation error", pdfError);
                toast.error("Échec de génération PDF");
                setIsGeneratingPDF(false);
            }
        } catch (error: any) {
            console.error("Critical error in export", error);
            const { toast } = await import('sonner');
            toast.error(`Erreur : ${error.message}`);
            setIsGeneratingPDF(false);
        }
    };

    const exportBulkEvaluationMarkdown = async (evalIds: string[], evalSummaryList: any[]) => {
        const setProgress = (text: string, percentage: number) => {
            setPdfProgressText(text);
            setPdfProgress(percentage);
        };

        try {
            const { toast } = await import('sonner');
            const { generateEvaluationsMarkdown } = await import('../utils/markdownGenerator');
            const { gradeService } = await import('../services');
            const { getCurrentUser, supabase } = await import('../../../lib/database');
            const { trackingService } = await import('../../tracking/services/trackingService');
            
            let suggestedName = `evaluation_${(evalSummaryList[0]?.titre || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
            if (evalIds.length > 1) {
                suggestedName = `evaluations_groupe_${evalIds.length}_fiches.md`;
            }

            let fileHandle = null;
            try {
                fileHandle = await getFileHandle(suggestedName, 'text/markdown', 'Fichier Markdown');
            } catch (err: any) {
                if (err.name === 'AbortError') return;
            }

            setIsGeneratingPDF(true);
            setProgress(`Préparation de l'export Markdown (${evalIds.length} évaluations)...`, 5);

            const user = await getCurrentUser();
            if (!user) {
                toast.error("Utilisateur non authentifié");
                setIsGeneratingPDF(false);
                return;
            }

            setProgress("Récupération des données d'évaluation...", 10);
            
            // 1. Fetch all detailed evaluation data
            const { data: fullEvals, error: evalError } = await supabase
                .from('EvaluationWithStats')
                .select('*, Branche(nom), Groupe(nom)')
                .in('id', evalIds);

            if (evalError) throw evalError;

            // 2. Identify all groups involved
            const groupIds = Array.from(new Set(fullEvals.map(e => e.group_id)));
            setProgress(`Recherche des élèves dans ${groupIds.length} groupes...`, 20);
            
            const studentsPromises = groupIds.map(gid => trackingService.fetchStudentsInGroup(gid, user.id));
            const studentsResults = await Promise.all(studentsPromises);
            
            const allStudentsMap = new Map();
            studentsResults.forEach(res => {
                (res?.full || []).forEach((s: any) => {
                    allStudentsMap.set(s.id, s);
                });
            });
            const allStudents = Array.from(allStudentsMap.values()).sort((a: any, b: any) => {
                // 1. Sort by Level Order
                const niveauA = a.Niveau?.ordre ?? a.niveau?.ordre ?? 0;
                const niveauB = b.Niveau?.ordre ?? b.niveau?.ordre ?? 0;
                if (niveauA !== niveauB) return niveauA - niveauB;
                
                // 2. Sort by Level Name
                const levelNomA = a.Niveau?.nom || a.niveau?.nom || '';
                const levelNomB = b.Niveau?.nom || b.niveau?.nom || '';
                const levelCmp = levelNomA.localeCompare(levelNomB);
                if (levelCmp !== 0) return levelCmp;

                // 3. Sort by Name
                return a.nom.localeCompare(b.nom);
            });

            // 3. Fetch all questions, results, questionResults
            setProgress("Chargement des résultats et critères...", 30);
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

            // 4. Group data
            const evaluationsData = fullEvals.map(ev => {
                const evQuestions = allQuestions.filter((q: any) => q.evaluation_id === ev.id);
                const evResults = allResults.filter((r: any) => r.evaluation_id === ev.id);
                const evQuestionResults = allQuestionResults.filter((qr: any) => {
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

            setProgress("Génération des documents individuels...", 80);
            
            const markdownString = generateEvaluationsMarkdown(allStudents, evaluationsData, evalSummaryList);
            const blob = new Blob([markdownString], { type: 'text/markdown' });
            
            if (fileHandle) {
                await writeToHandle(fileHandle, blob);
            } else {
                await downloadFile(blob, suggestedName, 'Fichier Markdown');
            }
            
            setProgress("Export terminé !", 100);
            setTimeout(() => setIsGeneratingPDF(false), 1000);
            toast.success("Markdown exporté avec succès !");
            
        } catch (error: any) {
            console.error("Critical error in export markdown", error);
            const { toast } = await import('sonner');
            toast.error(`Erreur : ${error.message}`);
            setIsGeneratingPDF(false);
        }
    };

    const exportBulkEvaluationCSV = async (evalIds: string[], evalSummaryList: any[]) => {
        const setProgress = (text: string, percentage: number) => {
            setPdfProgressText(text);
            setPdfProgress(percentage);
        };

        try {
            const { toast } = await import('sonner');
            const { generateMailMergeCSV } = await import('../utils/csvGenerator');
            const { gradeService } = await import('../services');
            const { getCurrentUser, supabase } = await import('../../../lib/database');
            const { trackingService } = await import('../../tracking/services/trackingService');
            
            let suggestedName = `evaluation_${(evalSummaryList[0]?.titre || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
            if (evalIds.length > 1) {
                suggestedName = `evaluations_publipostage_${evalIds.length}.csv`;
            }

            let fileHandle = null;
            try {
                fileHandle = await getFileHandle(suggestedName, 'text/csv', 'Fichier CSV');
            } catch (err: any) {
                if (err.name === 'AbortError') return;
            }

            setIsGeneratingPDF(true);
            setProgress(`Préparation de l'export CSV (${evalIds.length} évaluations)...`, 5);

            const user = await getCurrentUser();
            if (!user) {
                toast.error("Utilisateur non authentifié");
                setIsGeneratingPDF(false);
                return;
            }

            setProgress("Récupération des données d'évaluation...", 10);
            
            // 1. Fetch all detailed evaluation data
            const { data: fullEvals, error: evalError } = await supabase
                .from('EvaluationWithStats')
                .select('*, Branche(nom), Groupe(nom)')
                .in('id', evalIds);

            if (evalError) throw evalError;

            // 2. Identify all groups involved
            const groupIds = Array.from(new Set(fullEvals.map(e => e.group_id)));
            setProgress(`Recherche des élèves dans ${groupIds.length} groupes...`, 20);
            
            const studentsPromises = groupIds.map(gid => trackingService.fetchStudentsInGroup(gid, user.id));
            const studentsResults = await Promise.all(studentsPromises);
            
            const allStudentsMap = new Map();
            studentsResults.forEach(res => {
                (res?.full || []).forEach((s: any) => {
                    allStudentsMap.set(s.id, s);
                });
            });
            const allStudents = Array.from(allStudentsMap.values()).sort((a: any, b: any) => {
                const niveauA = a.Niveau?.ordre ?? a.niveau?.ordre ?? 0;
                const niveauB = b.Niveau?.ordre ?? b.niveau?.ordre ?? 0;
                if (niveauA !== niveauB) return niveauA - niveauB;
                
                const levelNomA = a.Niveau?.nom || a.niveau?.nom || '';
                const levelNomB = b.Niveau?.nom || b.niveau?.nom || '';
                const levelCmp = levelNomA.localeCompare(levelNomB);
                if (levelCmp !== 0) return levelCmp;

                return a.nom.localeCompare(b.nom);
            });

            // 3. Fetch all questions, results, questionResults
            setProgress("Chargement des résultats et critères...", 30);
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

            // 4. Group data
            const evaluationsData = fullEvals.map(ev => {
                const evQuestions = allQuestions.filter((q: any) => q.evaluation_id === ev.id);
                const evResults = allResults.filter((r: any) => r.evaluation_id === ev.id);
                const evQuestionResults = allQuestionResults.filter((qr: any) => {
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

            setProgress("Génération du fichier CSV...", 80);
            
            const csvString = generateMailMergeCSV(allStudents, evalSummaryList, evaluationsData);
            const blob = new Blob([csvString], { type: 'text/csv' });
            
            if (fileHandle) {
                await writeToHandle(fileHandle, blob);
            } else {
                await downloadFile(blob, suggestedName, 'Fichier CSV');
            }
            
            setProgress("Export terminé !", 100);
            setTimeout(() => setIsGeneratingPDF(false), 1000);
            toast.success("CSV exporté avec succès !");
            
        } catch (error: any) {
            console.error("Critical error in export CSV", error);
            const { toast } = await import('sonner');
            toast.error(`Erreur : ${error.message}`);
            setIsGeneratingPDF(false);
        }
    };

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
                            {selectedGroups.length === 1 ? `Évaluations - ${selectedGroups[0]}` : 'Tableau des Évaluations'}
                        </h2>
                        <p className="text-xs font-medium text-grey-medium uppercase tracking-widest mt-0.5">
                            {displayedEvaluations.length} évaluation{displayedEvaluations.length > 1 ? 's' : ''}{evaluations.length !== displayedEvaluations.length ? ` / ${evaluations.length} total` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Reset Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white border border-white/10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all animate-in fade-in slide-in-from-right-4 duration-300 group"
                        >
                            <X size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                            Réinitialiser
                        </button>
                    )}

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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const selectedEvals = displayedEvaluations.filter((ev: any) => selectedEvalIds.has(ev.id));
                                    exportBulkEvaluationPDF(Array.from(selectedEvalIds), selectedEvals);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-red-500/20"
                            >
                                <FileText size={14} />
                                <span>PDF ({selectedEvalIds.size})</span>
                            </button>
                            <button
                                onClick={() => {
                                    const selectedEvals = displayedEvaluations.filter((ev: any) => selectedEvalIds.has(ev.id));
                                    exportBulkEvaluationMarkdown(Array.from(selectedEvalIds), selectedEvals);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-blue-500/20"
                            >
                                <FileText size={14} />
                                <span>Markdown ({selectedEvalIds.size})</span>
                            </button>
                            <button
                                onClick={() => {
                                    const selectedEvals = displayedEvaluations.filter((ev: any) => selectedEvalIds.has(ev.id));
                                    exportBulkEvaluationCSV(Array.from(selectedEvalIds), selectedEvals);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Table size={14} />
                                <span>CSV ({selectedEvalIds.size})</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Pilules de tris et filtres actifs */}
            {(sortRules.length > 0 || selectedGroups.length > 0 || selectedBranches.length > 0 || selectedPeriodes.length > 0 || searchQuery.length > 0) && (
                <div className="px-6 mb-4 flex w-full items-start justify-between gap-4 text-xs">
                    {/* Tris (gauche) */}
                    <div className="flex flex-wrap gap-2 flex-1 items-center">
                        {sortRules.map((rule, idx) => (
                            <div key={`sort-${rule.id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/80 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all hover:bg-white/10">
                                <span className="font-bold text-white/30 text-[10px]">{idx + 1}</span>
                                <span className="font-medium tracking-wide">{COLUMN_LABELS[rule.id as ColumnId] || rule.id}</span>
                                {rule.direction === 'asc' ? <ArrowUp size={12} className="text-white/50" /> : <ArrowDown size={12} className="text-white/50" />}
                            </div>
                        ))}
                    </div>

                    {/* Filtres (droite) */}
                    <div className="flex flex-wrap gap-2 flex-1 justify-end items-center">
                        {selectedGroups.length > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/80 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all hover:bg-white/10">
                                <span className="font-semibold opacity-60">Groupes:</span> 
                                <span className="font-medium">{selectedGroups.join(', ')}</span>
                            </div>
                        )}
                        {selectedBranches.length > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/80 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all hover:bg-white/10">
                                <span className="font-semibold opacity-60">Branches:</span> 
                                <span className="font-medium">{selectedBranches.join(', ')}</span>
                            </div>
                        )}
                        {selectedPeriodes.length > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/80 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all hover:bg-white/10">
                                <span className="font-semibold opacity-60">Périodes:</span> 
                                <span className="font-medium">{selectedPeriodes.join(', ')}</span>
                            </div>
                        )}
                        {searchQuery && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/80 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all hover:bg-white/10 text-white/70">
                                <Search size={12} className="opacity-60" />
                                <span className="font-medium">"{searchQuery}"</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Zone de progression PDF */}
            <div className="px-6 mb-4">
                <PdfProgress
                    isGenerating={isGeneratingPDF}
                    progressText={pdfProgressText}
                    progressPercentage={pdfProgress}
                    className="w-full"
                />
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
                                            COLUMN_ALIGN[col.id] === 'center' && "text-center",
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
                                                sortRules,
                                                searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, searchMenuRef, searchTriggerRef,
                                                selectedBranches, setSelectedBranches, availableBranches,
                                                selectedGroups, setSelectedGroups, availableGroups,
                                                selectedPeriodes, setSelectedPeriodes, availablePeriodes,
                                                displayedEvaluations,
                                                selectedEvalIds,
                                                setSelectedEvalIds
                                            })}
                                        </div>
                                        <div
                                            className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-20 flex items-center justify-center group/resizer"
                                            onMouseDown={(e) => handleResizeStart(e, col.id)}
                                        >
                                            <div className={clsx(
                                                "w-px transition-all duration-150",
                                                resizingColumnIndex === index
                                                    ? "h-full bg-primary"
                                                    : "h-4 bg-white/15 group-hover/resizer:h-full group-hover/resizer:bg-primary/60"
                                            )} />
                                        </div>
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
                                            onExportPDF={exportEvaluationPDF}
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
        </div>
    );
};

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

function renderHeaderContent(colId: ColumnId, ctx: any) {
    const { handleSort, sortRules } = ctx;
    
    const ruleIndex = sortRules.findIndex((r: any) => r.id === colId);
    const isSorted = ruleIndex !== -1;
    const rule = isSorted ? sortRules[ruleIndex] : null;
    const SortIcon = rule ? (rule.direction === 'asc' ? ArrowUp : ArrowDown) : null;
    const priority = ruleIndex + 1;
    const showPriority = sortRules.length > 1 && isSorted;

    const renderSortIndicator = () => (
        <div className="flex items-center gap-1 shrink-0">
            {SortIcon && <SortIcon size={12} className="text-primary" />}
        </div>
    );

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
                        {renderSortIndicator()}
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
                                    }}
                                    className={clsx("p-2 rounded-lg border transition-colors shrink-0 relative", isSorted ? "bg-primary/20 border-primary/30 text-primary" : "border-white/10 text-grey-medium hover:text-white hover:bg-white/5")}
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
            const { selectedBranches, setSelectedBranches, availableBranches } = ctx;
            return (
                <div className="flex items-center gap-1 group/header w-full">
                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none flex-1 min-w-0"
                        onClick={() => handleSort(colId)}
                    >
                        <span className="truncate">Branche</span>
                        {isSorted ? (
                            renderSortIndicator()
                        ) : (
                            <ArrowUp size={12} className="text-primary opacity-0 group-hover/header:opacity-40 shrink-0 transition-opacity" />
                        )}
                    </div>
                    <MultiFilterSelect
                        label="Branche"
                        options={availableBranches}
                        selectedValues={selectedBranches}
                        onChange={setSelectedBranches}
                        portal
                        hideLabel
                        className="bg-transparent border-none !h-auto !p-0 hover:bg-transparent"
                        icon={<Filter size={14} className={selectedBranches.length > 0 ? "text-primary" : "text-grey-light opacity-50 shrink-0"} />}
                    />
                </div>
            );
        }
        case 'groupe': {
            const { selectedGroups, setSelectedGroups, availableGroups } = ctx;
            return (
                <div className={clsx("flex items-center gap-1 group/header w-full", COLUMN_ALIGN[colId] === 'center' && "justify-center")}>
                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none flex-1 min-w-0"
                        onClick={() => handleSort(colId)}
                    >
                        <span className="truncate">Groupe</span>
                        {isSorted ? (
                            renderSortIndicator()
                        ) : (
                            <ArrowUp size={12} className="text-primary opacity-0 group-hover/header:opacity-40 shrink-0 transition-opacity" />
                        )}
                    </div>
                    <MultiFilterSelect
                        label="Groupe"
                        options={availableGroups}
                        selectedValues={selectedGroups}
                        onChange={setSelectedGroups}
                        portal
                        hideLabel
                        className="bg-transparent border-none !h-auto !p-0 hover:bg-transparent"
                        icon={<Filter size={14} className={selectedGroups.length > 0 ? "text-primary" : "text-grey-light opacity-50 shrink-0"} />}
                    />
                </div>
            );
        }
        case 'periode': {
            const { selectedPeriodes, setSelectedPeriodes, availablePeriodes } = ctx;
            return (
                <div className={clsx("flex items-center gap-1 group/header w-full", COLUMN_ALIGN[colId] === 'center' && "justify-center")}>
                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none flex-1 min-w-0"
                        onClick={() => handleSort(colId)}
                    >
                        <span className="truncate">Période</span>
                        {isSorted ? (
                            renderSortIndicator()
                        ) : (
                            <ArrowUp size={12} className="text-primary opacity-0 group-hover/header:opacity-40 shrink-0 transition-opacity" />
                        )}
                    </div>
                    <MultiFilterSelect
                        label="Période"
                        options={availablePeriodes}
                        selectedValues={selectedPeriodes}
                        onChange={setSelectedPeriodes}
                        portal
                        hideLabel
                        className="bg-transparent border-none !h-auto !p-0 hover:bg-transparent"
                        icon={<Filter size={14} className={selectedPeriodes.length > 0 ? "text-primary" : "text-grey-light opacity-50 shrink-0"} />}
                    />
                </div>
            );
        }
        default: {
            return (
                <div
                    className={clsx(
                        "flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none",
                        COLUMN_ALIGN[colId] === 'center' && "justify-center"
                    )}
                    onClick={() => handleSort(colId)}
                >
                    {COLUMN_LABELS[colId]}
                    {renderSortIndicator()}
                </div>
            );
        }
    }
}

const EvaluationCell = React.memo(({ 
    colId, 
    ev, 
    width,
    onSelectEvaluation, 
    setEvalToDelete, 
    onEditEvaluation,
    onExportPDF,
    selectedEvalIds,
    setSelectedEvalIds
}: { 
    colId: ColumnId, 
    ev: any, 
    width: number,
    onSelectEvaluation: (id: string) => void,
    setEvalToDelete: (id: string | null) => void,
    onEditEvaluation: (ev: any) => void,
    onExportPDF: (ev: any) => void,
    selectedEvalIds: Set<string>,
    setSelectedEvalIds: (s: Set<string>) => void
}) => {
    return (
        <td
            style={{ width, minWidth: width, maxWidth: width }}
            className={clsx(
                "p-4 relative whitespace-nowrap overflow-hidden text-ellipsis",
                COLUMN_ALIGN[colId] === 'center' && "text-center",
                colId === 'titre' && "sticky left-0 z-20 bg-surface group-hover:bg-white/[0.05] transition-colors after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-white/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] cursor-pointer"
            )}
            onClick={() => {
                if (colId === 'titre') onSelectEvaluation(ev.id);
            }}
        >
            {renderCellContent(colId, ev, onSelectEvaluation, setEvalToDelete, onEditEvaluation, onExportPDF, selectedEvalIds, setSelectedEvalIds)}
        </td>
    );
});

EvaluationCell.displayName = 'EvaluationCell';

const EvaluationRow = React.memo(({ 
    ev, 
    columns, 
    onSelectEvaluation, 
    onEditEvaluation, 
    onExportPDF,
    setEvalToDelete,
    selectedEvalIds,
    setSelectedEvalIds
}: { 
    ev: any, 
    columns: ColumnConfig[], 
    onSelectEvaluation: (id: string) => void,
    onEditEvaluation: (ev: any) => void,
    onExportPDF: (ev: any) => void,
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
                    onExportPDF={onExportPDF}
                    setEvalToDelete={setEvalToDelete}
                    selectedEvalIds={selectedEvalIds}
                    setSelectedEvalIds={setSelectedEvalIds}
                />
            ))}
        </tr>
    );
});

EvaluationRow.displayName = 'EvaluationRow';

function renderCellContent(
    colId: ColumnId, 
    ev: any, 
    onSelectEvaluation: (id: string) => void,
    setEvalToDelete: (id: string | null) => void,
    onEditEvaluation: (ev: any) => void,
    onExportPDF: (ev: any) => void,
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
                <span className="text-text-main truncate">
                    {ev.periode}
                </span>
            ) : <span className="text-white/20">—</span>;
        case 'date':
            return ev.date ? (
                <span className="text-text-main tabular-nums">
                    {new Date(ev.date).toLocaleDateString('fr-FR')}
                </span>
            ) : <span className="text-white/20">—</span>;
        case 'note_max':
            const displayMax = ev._real_note_max !== undefined ? ev._real_note_max : ev.note_max;
            return <span className="text-text-main">/ {displayMax}</span>;
        case 'type_note':
            return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-grey-medium border border-white/10 truncate inline-block">
                    {ev._typeNoteName}
                </span>
            );
        case 'nbQuestions':
            return (
                <span className={clsx(ev._nbQuestions > 0 ? "text-text-main" : "text-white/20")}>
                    {ev._nbQuestions}
                </span>
            );
        case 'nbResultats':
            return (
                <span className={clsx(ev._nbResultats > 0 ? "text-text-main" : "text-white/20")}>
                    {ev._nbResultats}
                </span>
            );
        case 'moyenne':
            const realAvgMax = ev._real_note_max !== undefined ? ev._real_note_max : ev.note_max;
            let displayAvg = 0;
            let percentage = 0;
            if (ev._moyenne !== null) {
                percentage = ev._moyenne;
                displayAvg = (ev._moyenne / 100) * realAvgMax;
            }
            return (
                <div className={clsx("flex items-center gap-2 group", COLUMN_ALIGN[colId] === 'center' && "justify-center")}>
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
                            onExportPDF(ev);
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

        // 5. Download using Save As
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        let safeTitle = (ev.titre || 'evaluation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await downloadFile(blob, `export_${safeTitle}.csv`, 'Fichier Excel (CSV)');
 
        toast.success("Fichier Excel généré avec succès !", { id: `export_${ev.id}` });
    } catch (error) {
        console.error("Export error", error);
        const { toast } = await import('sonner');
        toast.error("Erreur lors de la génération de l'export", { id: `export_${ev.id}` });
    }
}


// Expose for debugging if needed
if (typeof window !== 'undefined') {
    (window as any)._exportEvaluationData = exportEvaluationData;
}

export default EvaluationsTableExcel;
