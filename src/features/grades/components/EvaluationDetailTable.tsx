/**
 * Nom du module/fichier : EvaluationDetailTable.tsx
 * 
 * Données en entrée : L'identifiant d'une évaluation spécifique.
 * 
 * Données en sortie : L'enregistrement et la mise à jour en temps réel des notes, des statuts (présent/absent) et des commentaires des élèves pour cette évaluation.
 * 
 * Objectif principal : Ce fichier gère la page de type "tableau de bord" où l'enseignant peut voir tous les élèves et saisir leurs résultats pour un contrôle donné.
 * 
 * Ce que ça affiche : Un grand tableau listant les élèves d'un groupe, avec des colonnes pour la note globale, les notes détaillées par question, le statut de présence et des commentaires.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { 
    ArrowLeft, 
    Table, 
    User, 
    Loader2, 
    LayoutGrid, 
    X, 
    Trash2,
    Settings2,
    Upload
} from 'lucide-react';
// import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { useGrades, useGradeMutations } from '../hooks/useGrades';
import { useAuth } from '../../../hooks/useAuth';
import { trackingService } from '../../tracking/services/trackingService';
import { Badge, Button, ConfirmModal } from '../../../core';
import { gradeService } from '../services';
import clsx from 'clsx';

import StudentGradeEntryModal from './StudentGradeEntryModal';
import GradeRow from './GradeRow';

interface EvaluationDetailTableProps {
    evaluation?: any;
    evaluationId?: string;
    onBack: () => void;
    onEdit: (evaluation: any) => void;
}

interface StudentQueryResult {
    ids: string[];
    full: any[];
}

const EvaluationDetailTable: React.FC<EvaluationDetailTableProps> = ({ evaluation: evaluationProp, evaluationId: idFromProp, onBack, onEdit }) => {
    const evaluationId = evaluationProp?.id || idFromProp;
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isBulkEdit, setIsBulkEdit] = useState(false);
    const [evalToDelete, setEvalToDelete] = useState<string | null>(null);
    const [pendingAbsences, setPendingAbsences] = useState<Record<string, { timeoutId: any, startTime: number }>>({});
    const { session } = useAuth();
    const userId = session?.user?.id;

    console.log('[EvaluationDetail] Rendering component:', { evaluationId, hasProp: !!evaluationProp, userId });

    const {
        setSelectedEvaluationId,
        selectedEvaluationId,
        activeEvaluation,
        questions,
        currentResults,
        contextResults,
        questionResults,
        loading: hookLoading,
        saveResult,
        saveResults,
        saveQuestionResults,
        formatStatut,
        noteTypes,
        getConversionPalier,
        evaluations,
    } = useGrades(undefined, undefined, evaluationId);

    // On récupère aussi les états de chargement individuels pour plus de finesse si besoin
    // Mais on peut utiliser hookLoading qui est déjà une aggrégation dans useGrades

    // Le "coeur" de l'évaluation (les données descriptives comme le titre, la matière, le groupe).
    // On privilégie l'objet passé en prop (façon Excel) pour éviter d'attendre le hook.
    const evaluation = useMemo(() => {
        const ev = evaluationProp || activeEvaluation || evaluations?.find((e: any) => e.id === evaluationId);
        console.log('[EvaluationDetail] Resolved evaluation:', {
            source: evaluationProp ? 'prop' : (activeEvaluation ? 'active' : 'list'),
            id: ev?.id,
            groupId: ev?.group_id || ev?.groupe_id
        });
        return ev;
    }, [evaluationProp, activeEvaluation, evaluations, evaluationId]);

    const hasQuestions = useMemo(() => {
        const val = questions && questions.length > 0;
        console.log('[EvaluationDetail] Questions check:', { count: questions?.length, hasQuestions: val });
        return val;
    }, [questions]);

    /* 
    const [dictatingField, setDictatingField] = useState<{ studentId: string, type: 'note' | 'commentaire' | string } | null>(null);
    */
    const [isGlobalVoiceActive, setIsGlobalVoiceActive] = useState(false);
    const [focusedField, setFocusedField] = useState<{ studentId: string, type: string } | null>(null);

    /* 
    // Refs for speech callbacks — avoids circular dependency with handlers defined below
    const onSpeechResultRef = useRef<(text: string, isFinal: boolean) => void>(() => {});
    const onSpeechErrorRef = useRef<(err: string) => void>(() => {});

    // Stable wrappers that delegate to the refs — safe to pass to useSpeechRecognition
    const onSpeechResultStable = useCallback((text: string, isFinal: boolean) => {
        onSpeechResultRef.current(text, isFinal);
    }, []);

    const onSpeechErrorStable = useCallback((err: string) => {
        onSpeechErrorRef.current(err);
    }, []);
    */

    /*
    const { isListening, isSupported, startListening, stopListening, toggleListening } = useSpeechRecognition({
        continuous: true,
        interimResults: true,
        onResult: onSpeechResultStable,
        onError: onSpeechErrorStable
    });
    */

    const { deleteEvaluation } = useGradeMutations();

    // Synchronisation de l'ID avec le hook useGrades pour charger les questions et résultats
    useEffect(() => {
        if (evaluationId) {
            setSelectedEvaluationId(evaluationId);
        }
    }, [evaluationId, setSelectedEvaluationId]);

    // Memoized changes handlers
    const handleStatutChange = useCallback((studentId: string, newStatut: string) => {
        if (!userId) return;

        if (pendingAbsences[studentId]) {
            clearTimeout(pendingAbsences[studentId].timeoutId);
            setPendingAbsences(prev => {
                const updated = { ...prev };
                delete updated[studentId];
                return updated;
            });
            if (newStatut === 'absent') return;
        }

        if (newStatut === 'absent') {
            const timeoutId = setTimeout(async () => {
                const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
                saveResult({
                    result: {
                        id: currentResult?.id,
                        eleve_id: studentId,
                        evaluation_id: evaluationId,
                        statut: 'absent',
                        note: null,
                        commentaire: currentResult?.commentaire,
                        user_id: userId
                    }
                });

                if (hasQuestions) {
                    const studentQs = questions.filter(q => q.evaluation_id === evaluationId);
                    const resultsToDelete = questionResults.filter(qr => qr.eleve_id === studentId && studentQs.some(q => q.id === qr.question_id));
                    if (resultsToDelete.length > 0) {
                         saveQuestionResults({ results: resultsToDelete.map(r => ({ ...r, note: null })) });
                    }
                }

                setPendingAbsences(prev => {
                    const updated = { ...prev };
                    delete updated[studentId];
                    return updated;
                });
            }, 3000);

            setPendingAbsences(prev => ({
                ...prev,
                [studentId]: { timeoutId, startTime: Date.now() }
            }));
            return;
        }

        const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
        saveResult({
            result: {
                id: currentResult?.id,
                eleve_id: studentId,
                evaluation_id: evaluationId,
                statut: newStatut,
                note: hasQuestions ? undefined : currentResult?.note,
                commentaire: currentResult?.commentaire,
                user_id: userId
            }
        });
    }, [userId, pendingAbsences, currentResults, evaluationId, hasQuestions, questions, questionResults, saveResult, saveQuestionResults]);

    const handleNoteChange = useCallback((studentId: string, note: string) => {
        if (!userId) return;
        const val = note === '' ? null : parseFloat(note);
        if (evaluation?.note_max && val !== null && (val < 0 || val > evaluation.note_max)) return;

        const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
        saveResult({
            result: {
                id: currentResult?.id,
                eleve_id: studentId,
                evaluation_id: evaluationId,
                note: val,
                statut: currentResult?.statut || 'present',
                commentaire: currentResult?.commentaire,
                user_id: userId
            }
        });
    }, [userId, evaluation, currentResults, evaluationId, saveResult]);

    const calculateScore = useCallback((studentId: string) => {
        if (!evaluation || !questions.length) return { total: null, formula: null };
        
        const studentQuestionResults = questionResults.filter(qr => qr.eleve_id === studentId);
        if (studentQuestionResults.length === 0) return { total: null, formula: null };

        let weightedSum = 0;
        let maxWeightedSum = 0;
        let hasAnyNote = false;
        let notesList: string[] = [];

        for (const q of questions) {
            const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
            const qMax = parseFloat(q.note_max.toString());
            maxWeightedSum += qMax * ratio;

            const qr = studentQuestionResults.find(r => r.question_id === q.id);
            if (qr && qr.note !== null) {
                const noteVal = parseFloat(qr.note.toString());
                weightedSum += noteVal * ratio;
                hasAnyNote = true;
                notesList.push(ratio === 1 ? noteVal.toString() : `${noteVal}×${ratio}`);
            }
        }

        if (!hasAnyNote) return { total: null, formula: null };
        const evalMax = parseFloat(evaluation.note_max?.toString() || '20');
        const finalTotal = (weightedSum / maxWeightedSum) * evalMax;
        
        let formulaPart = notesList.length > 1 ? `(${notesList.join(' + ')})` : notesList[0];
        let fullFormula = formulaPart;
        
        if (Math.abs(maxWeightedSum - evalMax) > 0.01) {
            fullFormula = `${formulaPart} / ${maxWeightedSum} × ${evalMax}`;
        }
        
        return { 
            total: parseFloat(finalTotal.toFixed(2)), 
            formula: `${fullFormula} = ${finalTotal.toFixed(2)}` 
        };
    }, [evaluation, questions, questionResults]);

    const handleQuestionNoteChange = useCallback((studentId: string, questionId: string, note: string) => {
        if (!userId) return;
        const q = questions.find(q => q.id === questionId);
        const val = note === '' ? null : parseFloat(note);
        if (q && val !== null && (val < 0 || val > q.note_max)) return;

        saveQuestionResults({
            results: [{ eleve_id: studentId, question_id: questionId, note: val }]
        });

        if (evaluation) {
            let weightedSum = 0;
            let maxWeightedSum = 0;
            let hasAnyNote = false;

            for (const quest of questions) {
                const ratio = quest.ratio != null ? parseFloat(quest.ratio.toString()) : 1;
                const qMax = parseFloat(quest.note_max.toString());
                maxWeightedSum += qMax * ratio;

                let currentVal: number | null = null;
                if (quest.id === questionId) {
                    currentVal = val;
                } else {
                    const qr = questionResults.find(r => r.eleve_id === studentId && r.question_id === quest.id);
                    currentVal = (qr && qr.note !== null) ? parseFloat(qr.note.toString()) : null;
                }

                if (currentVal !== null) {
                    weightedSum += currentVal * ratio;
                    hasAnyNote = true;
                }
            }

            if (hasAnyNote && maxWeightedSum > 0) {
                const evalMax = parseFloat(evaluation.note_max?.toString() || '20');
                const finalTotal = (weightedSum / maxWeightedSum) * evalMax;
                const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
                
                saveResult({
                    result: {
                        id: currentResult?.id,
                        eleve_id: studentId,
                        evaluation_id: evaluationId,
                        note: parseFloat(finalTotal.toFixed(2)),
                        statut: currentResult?.statut || 'present',
                        commentaire: currentResult?.commentaire,
                        user_id: userId
                    }
                });
            }
        }
    }, [userId, questions, evaluation, questionResults, currentResults, evaluationId, saveResult, saveQuestionResults]);

    const handleCommentChange = useCallback((studentId: string, comment: string) => {
        if (!userId) return;
        const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);

        saveResult({
            result: {
                id: currentResult?.id,
                eleve_id: studentId,
                evaluation_id: evaluationId,
                commentaire: comment,
                note: hasQuestions ? undefined : currentResult?.note,
                statut: currentResult?.statut || 'present',
                user_id: userId
            }
        });
    }, [userId, currentResults, evaluationId, hasQuestions, saveResult]);

    // Synchronise la page en lui indiquant sur quelle évaluation on se trouve pour qu'elle prépare le téléchargement des notes.
    useEffect(() => {
        setSelectedEvaluationId(evaluationId);
    }, [evaluationId, setSelectedEvaluationId]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
            e.preventDefault();
            const container = e.currentTarget.closest('table');
            if (!container) return;

            const inputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
            const index = inputs.indexOf(e.currentTarget);

            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                const next = inputs[index + 1];
                if (next) {
                    next.focus();
                    next.select();
                }
            } else if (e.key === 'ArrowLeft') {
                const prev = inputs[index - 1];
                if (prev) {
                    prev.focus();
                    prev.select();
                }
            }
        }
    }, []);


    // Identifie tous les élèves inscrits dans le groupe de l'évaluation pour constuire la liste du tableau.
    const { data: studentData, isLoading: loadingStudents } = useQuery<StudentQueryResult>({
        queryKey: ['students_group', 
            evaluation?.group_id || (evaluation as any)?.groupe_id,
            userId
        ],
        queryFn: async (): Promise<StudentQueryResult> => {
            const gid = evaluation?.group_id || (evaluation as any)?.groupe_id;
            console.log('[EvaluationDetail] QueryFn Triggered - GroupID:', gid, 'UserID:', userId);
            if (!gid) {
                console.warn('[EvaluationDetail] QueryFn Aborted - Missing GroupID');
                return { ids: [], full: [] };
            }
            try {
                const result = await trackingService.fetchStudentsInGroup(gid, userId!);
                console.log('[EvaluationDetail] QueryFn Result:', result);
                return result as StudentQueryResult;
            } catch (err) {
                console.error('[EvaluationDetail] QueryFn Error:', err);
                throw err;
            }
        },
        enabled: !!(evaluation?.group_id || (evaluation as any)?.groupe_id) && !!userId && userId !== 'undefined',
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    // Trie rigoureusement les élèves pour l'affichage (d'abord par section/niveau, puis par ordre alphabétique de prénom).
    const students = [...(studentData?.full || [])].sort((a: any, b: any) => {
        // 1. Sort by Niveau (Level)
        const niveauA = a.Niveau?.ordre ?? 0;
        const niveauB = b.Niveau?.ordre ?? 0;
        if (niveauA !== niveauB) return niveauA - niveauB;

        const niveauNomA = a.Niveau?.nom || '';
        const niveauNomB = b.Niveau?.nom || '';
        const niveauCmp = niveauNomA.localeCompare(niveauNomB);
        if (niveauCmp !== 0) return niveauCmp;

        // 2. Sort by Prénom (First Name)
        const prenomA = a.prenom || '';
        const prenomB = b.prenom || '';
        const prenomCmp = prenomA.localeCompare(prenomB);
        if (prenomCmp !== 0) return prenomCmp;
        
        // 3. Sort by Nom (Last Name)
        return (a.nom || '').localeCompare(b.nom || '');
    });

    // Vérifie si cet examen demande une conversion spéciale (ex: transformer une note sur 20 en code couleur A, B, C).
    // Memoized values
    const activeNoteType = useMemo(() => noteTypes.find(nt => nt.id === evaluation?.type_note_id), [noteTypes, evaluation]);
    const isConversion = useMemo(() => activeNoteType?.systeme === 'conversion', [activeNoteType]);
    // hasQuestions is declared above near useGrades to be available in handlers
    
    // Calcul de la note maximale réelle (somme des questions ou note_max configurée)
    const noteMax = useMemo(() => {
        if (hasQuestions && questions && questions.length > 0) {
            return questions.reduce((acc, q) => acc + (Number(q.note_max) * (q.ratio != null ? Number(q.ratio) : 1)), 0);
        }
        return Number(evaluation?.note_max) || 20;
    }, [evaluation, questions, hasQuestions]);
    
    // Calcul de la moyenne des notes déjà encodées
    const averageGrade = useMemo(() => {
        const resultsWithNotes = currentResults.filter((r: any) => r.note !== null && r.note !== undefined);
        const evalMaxScale = Number(evaluation?.note_max) || 20;

        if (resultsWithNotes.length === 0 || evalMaxScale <= 0) return null;
        
        // Formule : (Somme des notes / (Nombre d'élèves * Max de l'évaluation)) * 100
        const notesSum = resultsWithNotes.reduce((acc: number, r: any) => acc + Number(r.note), 0);
        return (notesSum / (resultsWithNotes.length * evalMaxScale)) * 100;
    }, [currentResults, evaluation]);

    const colorMap = useMemo(() => ({
        emerald: 'text-emerald-400',
        blue: 'text-blue-400',
        amber: 'text-primary',
        rose: 'text-rose-400',
        purple: 'text-purple-400',
        grey: 'text-grey-medium'
    }), []);
    
    const onRowClick = useCallback((student: any) => {
        setSelectedStudent(student);
        setIsEntryModalOpen(true);
    }, []);

    const memoizedFormatStatut = useCallback((s: string) => formatStatut(s), [formatStatut]);
    const memoizedGetConversionPalier = useCallback((total: number | null, max: number, type: any) => 
        getConversionPalier(total, max, type), [getConversionPalier]);


    const isLoading = hookLoading || loadingStudents;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-grey-medium font-bold uppercase tracking-widest text-xs">Chargement des résultats...</p>
            </div>
        );
    }

    const brancheName = evaluation?.Branche?.nom || evaluation?.branche_nom || '';
    const groupeName = evaluation?.Groupe?.nom || evaluation?.groupe_nom || '';

    return (
        <div className="w-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between bg-surface rounded-2xl border border-white/5 p-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white transition-all border border-white/10"
                        title="Retour au tableau"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                            <Table size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-text-main uppercase">{groupeName || 'Groupe'}</h2>
                            <p className="text-xs font-medium text-grey-medium uppercase tracking-widest mt-0.5 flex items-center">
                                <span>
                                    {brancheName && `${brancheName} • `}{evaluation?.titre || 'Évaluation'}{evaluation?.periode ? ` • ${evaluation.periode}` : ''}
                                </span>
                                {averageGrade !== null && (
                                    <span className="text-primary font-bold ml-2">
                                        • MOYENNE: {averageGrade.toFixed(2)}%
                                        {isConversion && activeNoteType && (
                                            <span className="ml-1 opacity-80">
                                                ({memoizedGetConversionPalier(averageGrade, 100, activeNoteType)?.letter || '-'})
                                            </span>
                                        )}
                                    </span>
                                )}
                                <span className="ml-[50px]">
                                    • {students.length} élève{students.length > 1 ? 's' : ''}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={isBulkEdit ? 'primary' : 'secondary'}
                        onClick={() => setIsBulkEdit(!isBulkEdit)}
                        className={clsx(
                            "h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                            isBulkEdit ? "bg-primary text-grey-dark" : "border-white/10 text-grey-medium hover:text-white"
                        )}
                    >
                        {isBulkEdit ? <X size={14} className="mr-2" /> : <LayoutGrid size={14} className="mr-2" />}
                        {isBulkEdit ? 'Quitter l\'encodage' : 'Encodage à la suite'}
                    </Button>

                    <Button 
                        variant="secondary"
                        onClick={() => evaluation && onEdit(evaluation)}
                        className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 text-grey-medium hover:text-white transition-all flex items-center"
                    >
                        <Settings2 size={16} className="mr-2 text-primary" />
                        <span>Modifier paramètres</span>
                    </Button>

                    <div className="w-px h-8 bg-white/10 mx-1" />
                    <button
                        onClick={() => setEvalToDelete(evaluationId)}
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                        title="Supprimer l'évaluation"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-hidden bg-surface rounded-2xl border border-white/10 flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0 text-sm">
                        <thead className="sticky top-0 z-30 bg-table-header">
                            <tr>
                                <th className="p-5 font-black text-white uppercase tracking-tighter text-xs border-b border-r border-white/10 sticky left-0 bg-surface z-40">
                                    Élève
                                </th>
                                <th className="p-5 font-black text-primary uppercase tracking-tighter text-xs border-b border-l border-r border-primary/50 text-center min-w-[120px] bg-primary/10">
                                    Total / {evaluation?.note_max}
                                </th>
                                {hasQuestions && questions.map(q => (
                                    <th key={q.id} className="p-5 font-black text-grey-light uppercase tracking-tighter text-[10px] border-b border-r border-white/10 text-center min-w-[100px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="truncate max-w-[120px] text-primary">{q.titre}</span>
                                            <Badge variant="secondary" className="text-[9px] opacity-80 px-2 py-0">/ {q.note_max}</Badge>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-5 font-black text-white uppercase tracking-tighter text-xs border-b border-r border-white/10 text-center min-w-[120px]">
                                    Statut
                                </th>
                                <th className="p-5 font-black text-white uppercase tracking-tighter text-xs border-b border-white/10 min-w-[250px]">
                                    Commentaire
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={4 + (hasQuestions ? questions.length : 0)} className="p-20 text-center">
                                       <div className="flex flex-col items-center gap-4 opacity-30">
                                           <User size={48} />
                                           <p className="font-bold uppercase tracking-widest text-sm">Aucun élève trouvé</p>
                                       </div>
                                    </td>
                                </tr>
                            ) : (() => {
                                    let lastLevelId: string | null = null;
                                    return students.map((student: any) => {
                                        const showLevelHeader = student.Niveau?.id !== lastLevelId;
                                        lastLevelId = student.Niveau?.id;
                                        
                                        const result = currentResults.find((r: any) => r.eleve_id === student.id);
                                        const studentQuestionResults = questionResults.filter(qr => qr.eleve_id === student.id);

                                        return (
                                            <React.Fragment key={student.id}>
                                                {showLevelHeader && (
                                                    <tr className="bg-table-row-group">
                                                        <td colSpan={4 + (hasQuestions ? questions.length : 0)} className="px-5 py-3 border-b border-white/10 border-l-4 border-primary">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] select-none">
                                                                    Section : {student.Niveau?.nom || 'Sans Niveau'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                <GradeRow 
                                                    student={student}
                                                    result={result}
                                                    questionResults={studentQuestionResults}
                                                    questions={questions}
                                                    evaluation={evaluation}
                                                    isBulkEdit={isBulkEdit}
                                                     /* isSupported={false}
                                                     isListening={false}
                                                     dictatingField={null} */
                                                    isGlobalVoiceActive={isGlobalVoiceActive}
                                                    focusedField={focusedField?.studentId === student.id ? focusedField : null}
                                                    pendingAbsences={pendingAbsences}
                                                    hasQuestions={hasQuestions}
                                                    isConversion={isConversion}
                                                    noteMax={noteMax}
                                                    activeNoteType={activeNoteType}
                                                    colorMap={colorMap}
                                                    onRowClick={onRowClick}
                                                    onNoteChange={handleNoteChange}
                                                    onQuestionNoteChange={handleQuestionNoteChange}
                                                    onStatutChange={handleStatutChange}
                                                    onCommentChange={handleCommentChange}
                                                    onKeyDown={handleKeyDown}
                                                    calculateScore={calculateScore}
                                                    getConversionPalier={memoizedGetConversionPalier}
                                                    formatStatut={memoizedFormatStatut}
                                                     /* setDictatingField={() => {}} */
                                                    setFocusedField={setFocusedField}
                                                     /* stopListening={stopListening} */
                                                />
                                            </React.Fragment>
                                        );
                                    });
                                })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {evaluation && isEntryModalOpen && (
                <StudentGradeEntryModal
                    isOpen={isEntryModalOpen}
                    onClose={() => setIsEntryModalOpen(false)}
                    student={selectedStudent}
                    evaluation={(evaluation || evalDetails) as any}
                    questions={questions as any}
                    currentResult={currentResults.find((r: any) => r.eleve_id === selectedStudent?.id)}
                    questionResults={questionResults}
                    noteTypes={noteTypes}
                    getConversionPalier={getConversionPalier}
                />
            )}

            <ConfirmModal
                isOpen={!!evalToDelete}
                onClose={() => setEvalToDelete(null)}
                onConfirm={async () => {
                    if (evalToDelete) {
                        deleteEvaluation({ id: evalToDelete });
                        setEvalToDelete(null);
                        onBack();
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

/**
 * 1. Le composant s'allume avec le jeton d'une évaluation bien définie.
 * 2. Il lance deux recherches : il collecte les informations du contrôle d'un côté, et la liste de la classe concernée de l'autre.
 * 3. En attendant le retour, une petite icône de chargement fait patienter.
 * 4. Une fois reçu, il trie minutieusement la classe par groupe de niveau puis par ordre alphabétique.
 * 5. L'enseignant peut alors utiliser le tableau selon deux méthodes :
 *    - Mode rapide ("Encodage à la suite") : Les cases du tableau se transforment pour être saisies directement, les couleurs des boutons alertent des présences/absences.
 *    - Mode détaillé : En cliquant sur une ligne, l'enseignant affiche la fiche grand format de cet élève particulier.
 * 6. Lors de toute tentative de changement, le système vérifie toujours que les points de l'étudiant ne dépassent pas frauduleusement le plafond fixé.
 * 7. A chaque étape, que ce soit une note ajoutée ou une absence cochée, le système expédie discrètement la donnée validée dans le serveur cloud pour une sauvegarde permanente et instantanée.
 */
export default EvaluationDetailTable;
