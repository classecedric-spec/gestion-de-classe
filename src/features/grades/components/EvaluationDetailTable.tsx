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

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    ArrowLeft, 
    Table, 
    User, 
    Loader2, 
    LayoutGrid, 
    X, 
    CheckCircle2, 
    XCircle, 
    MinusCircle, 
    Octagon, 
    MessageSquare, 
    Trash2 
} from 'lucide-react';
import { useGrades, useGradeMutations } from '../hooks/useGrades';
import { useAuth } from '../../../hooks/useAuth';
import { trackingService } from '../../tracking/services/trackingService';
import { Badge, Button, Input, ConfirmModal } from '../../../core';
import clsx from 'clsx';

import StudentGradeEntryModal from './StudentGradeEntryModal';

interface EvaluationDetailTableProps {
    evaluationId: string;
    onBack: () => void;
}

interface StudentQueryResult {
    ids: string[];
    full: any[];
}

const EvaluationDetailTable: React.FC<EvaluationDetailTableProps> = ({ evaluationId, onBack }) => {
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isBulkEdit, setIsBulkEdit] = useState(false);
    const [evalToDelete, setEvalToDelete] = useState<string | null>(null);
    const [pendingAbsences, setPendingAbsences] = useState<Record<string, { timeoutId: any, startTime: number }>>({});
    const { session } = useAuth();
    const userId = session?.user?.id;

    const {
        questions,
        currentResults,
        questionResults,
        setSelectedEvaluationId,
        activeEvaluation: evaluation,
        formatStatut,
        noteTypes,
        getConversionPalier,
        loading: hookLoading,
        saveResult,
        saveQuestionResults
    } = useGrades(undefined, undefined);

    const { deleteEvaluation } = useGradeMutations();

    // Prépare une action pour modifier l'état de l'élève (ex: marquer "absent" ou "malade") et le sauvegarder immédiatement.
    const handleStatutChange = async (studentId: string, newStatut: string) => {
        if (!userId) return;

        // Si une suppression était programmée pour ce même élève, on l'annule systématiquement 
        // dès qu'on clique sur N'IMPORTE QUEL bouton de statut (y compris recliquer sur Absent pour annuler).
        if (pendingAbsences[studentId]) {
            clearTimeout(pendingAbsences[studentId].timeoutId);
            setPendingAbsences(prev => {
                const updated = { ...prev };
                delete updated[studentId];
                return updated;
            });
            
            // Si on a recliqué sur "Absent", on considère que c'était une demande d'annulation
            if (newStatut === 'absent') return;
        }

        if (newStatut === 'absent') {
            const timeoutId = setTimeout(async () => {
                const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
                
                // 1. Enregistrer le statut absent et effacer la note principale
                await saveResult({
                    id: currentResult?.id,
                    eleve_id: studentId,
                    evaluation_id: evaluationId,
                    statut: 'absent',
                    note: null, // On efface la note
                    commentaire: currentResult?.commentaire,
                    user_id: userId
                });

                // 2. Effacer les résultats détaillés par question si présents
                if (hasQuestions) {
                    const studentQs = questions.filter(q => q.evaluation_id === evaluationId);
                    const resultsToDelete = questionResults.filter(qr => qr.eleve_id === studentId && studentQs.some(q => q.id === qr.question_id));
                    
                    if (resultsToDelete.length > 0) {
                         await saveQuestionResults(resultsToDelete.map(r => ({ ...r, note: null })));
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
        await saveResult({
            id: currentResult?.id,
            eleve_id: studentId,
            evaluation_id: evaluationId,
            statut: newStatut,
            note: hasQuestions ? undefined : currentResult?.note,
            commentaire: currentResult?.commentaire,
            user_id: userId
        });
    };

    // Prépare une action pour enregistrer directement la note globale rentrée par l'enseignant pour un élève, en vérifiant les limites.
    const handleNoteChange = async (studentId: string, note: string) => {
        if (!userId) return;
        const val = note === '' ? null : parseFloat(note);
        if (evaluation?.note_max && val !== null && (val < 0 || val > evaluation.note_max)) return;

        const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
        await saveResult({
            id: currentResult?.id,
            eleve_id: studentId,
            evaluation_id: evaluationId,
            note: val,
            statut: currentResult?.statut || 'present',
            commentaire: currentResult?.commentaire,
            user_id: userId
        });
    };

    const calculateScore = (studentId: string) => {
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
    };

    const handleQuestionNoteChange = async (studentId: string, questionId: string, note: string) => {
        if (!userId) return;
        const q = questions.find(q => q.id === questionId);
        const val = note === '' ? null : parseFloat(note);
        if (q && val !== null && (val < 0 || val > q.note_max)) return;

        // 1. Sauvegarder la note de la question
        await saveQuestionResults([{
            eleve_id: studentId,
            question_id: questionId,
            note: val
        }]);

        // 2. Recalculer le score total pour mettre à jour la table Resultat (statistiques globales)
        if (evaluation) {
            let weightedSum = 0;
            let maxWeightedSum = 0;
            let hasAnyNote = false;

            for (const quest of questions) {
                const ratio = quest.ratio != null ? parseFloat(quest.ratio.toString()) : 1;
                const qMax = parseFloat(quest.note_max.toString());
                maxWeightedSum += qMax * ratio;

                // On utilise la nouvelle valeur si c'est la question en cours, sinon celle du cache
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
                
                // 3. Sauvegarder le résultat global
                await saveResult({
                    id: currentResult?.id,
                    eleve_id: studentId,
                    evaluation_id: evaluationId,
                    note: parseFloat(finalTotal.toFixed(2)),
                    statut: currentResult?.statut || 'present',
                    commentaire: currentResult?.commentaire,
                    user_id: userId
                });
            }
        }
    };

    // Prépare une action pour sauvegarder de façon permanente un texte d'appréciation libre rédigé par le professeur.
    const handleCommentChange = async (studentId: string, comment: string) => {
        if (!userId) return;
        const currentResult = currentResults.find((r: any) => r.eleve_id === studentId);
        await saveResult({
            id: currentResult?.id,
            eleve_id: studentId,
            evaluation_id: evaluationId,
            commentaire: comment,
            note: hasQuestions ? undefined : currentResult?.note,
            statut: currentResult?.statut || 'present',
            user_id: userId
        });
    };

    // Synchronise la page en lui indiquant sur quelle évaluation on se trouve pour qu'elle prépare le téléchargement des notes.
    useEffect(() => {
        setSelectedEvaluationId(evaluationId);
    }, [evaluationId, setSelectedEvaluationId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const container = e.currentTarget.closest('table');
            if (!container) return;

            const inputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
            const index = inputs.indexOf(e.currentTarget);

            if (e.key === 'ArrowRight') {
                const next = inputs[index + 1];
                if (next) {
                    next.focus();
                    next.select();
                }
            } else {
                const prev = inputs[index - 1];
                if (prev) {
                    prev.focus();
                    prev.select();
                }
            }
        }
    };

    // Va chercher dans la base de données numérique le "contexte" de l'évaluation (quelle matière, quel groupe d'élèves).
    const { data: evalDetails } = useQuery({
        queryKey: ['evaluation_meta', evaluationId],
        queryFn: async () => {
            const { supabase } = await import('../../../lib/database');
            const { data } = await supabase
                .from('Evaluation')
                .select('*, Branche(nom), Groupe(nom)')
                .eq('id', evaluationId)
                .single();
            return data;
        },
        enabled: !!evaluationId
    });

    // Identifie tous les élèves inscrits dans le groupe de l'évaluation pour constuire la liste du tableau.
    const { data: studentData, isLoading: loadingStudents } = useQuery<StudentQueryResult>({
        queryKey: ['students_group', evalDetails?.group_id || evaluation?.group_id],
        queryFn: async (): Promise<StudentQueryResult> => {
            const gid = evalDetails?.group_id || evaluation?.group_id;
            if (!gid) return { ids: [], full: [] };
            const result = await trackingService.fetchStudentsInGroup(gid);
            return result as StudentQueryResult;
        },
        enabled: !!(evalDetails?.group_id || evaluation?.group_id)
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
    const activeNoteType = noteTypes.find(nt => nt.id === evaluation?.type_note_id);
    const isConversion = activeNoteType?.systeme === 'conversion';
    const hasQuestions = questions.length > 0;


    const isLoading = hookLoading || loadingStudents;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-grey-medium font-bold uppercase tracking-widest text-xs">Chargement des résultats...</p>
            </div>
        );
    }

    const brancheName = (evalDetails as any)?.Branche?.nom || '';
    const groupeName = (evalDetails as any)?.Groupe?.nom || '';

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
                            <p className="text-xs font-medium text-grey-medium uppercase tracking-widest mt-0.5">
                                {brancheName && `${brancheName} • `}{evaluation?.titre || 'Évaluation'}{evaluation?.periode ? ` • ${evaluation.periode}` : ''} • {students.length} élève{students.length > 1 ? 's' : ''}
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
                        <thead className="sticky top-0 z-30 bg-[#1e2e3a]">
                            <tr>
                                <th className="p-5 font-black text-white uppercase tracking-tighter text-xs border-b border-r border-white/10 sticky left-0 bg-surface z-40">
                                    Élève
                                </th>
                                <th className="p-5 font-black text-primary uppercase tracking-tighter text-xs border-b border-white/10 text-center min-w-[120px] bg-primary/10">
                                    Total / {evaluation?.note_max}
                                </th>
                                {hasQuestions && questions.map(q => (
                                    <th key={q.id} className="p-5 font-black text-grey-light uppercase tracking-tighter text-[10px] border-b border-white/10 text-center min-w-[100px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="truncate max-w-[120px] text-primary">{q.titre}</span>
                                            <Badge variant="secondary" className="text-[9px] opacity-80 px-2 py-0">/ {q.note_max}</Badge>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-5 font-black text-white uppercase tracking-tighter text-xs border-b border-white/10 text-center min-w-[120px]">
                                    Statut
                                </th>
                                <th className="p-5 font-black text-white uppercase tracking-tighter text-xs border-b border-white/10 min-w-[250px]">
                                    Commentaire
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
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
                                        const noteMax = Number(evaluation?.note_max) || 20;

                                        const isRowComplete = hasQuestions
                                            ? questions.every(q => questionResults.some(qr => qr.eleve_id === student.id && qr.question_id === q.id && qr.note != null))
                                            : result?.note != null;

                                        const hasAtLeastOneData = hasQuestions
                                            ? questions.some(q => questionResults.some(qr => qr.eleve_id === student.id && qr.question_id === q.id && qr.note != null))
                                            : result?.note != null;

                                        const isDataMissing = !isRowComplete && hasAtLeastOneData && (!result?.statut || result.statut === 'present');

                                        const colorMap: Record<string, string> = {
                                            emerald: 'text-emerald-400',
                                            blue: 'text-blue-400',
                                            amber: 'text-amber-400',
                                            rose: 'text-rose-400',
                                            purple: 'text-purple-400',
                                            grey: 'text-grey-medium'
                                        };

                                        return (
                                            <React.Fragment key={student.id}>
                                                {showLevelHeader && (
                                                    <tr className="bg-[#1a2632]">
                                                        <td colSpan={4 + (hasQuestions ? questions.length : 0)} className="px-5 py-3 border-b border-white/10 border-l-4 border-primary">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] select-none">
                                                                    Section : {student.Niveau?.nom || 'Sans Niveau'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr
                                                    onClick={() => {
                                                        if (!isBulkEdit) {
                                                            setSelectedStudent(student);
                                                            setIsEntryModalOpen(true);
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "group transition-all border-b border-white/5",
                                                        !isBulkEdit && "cursor-pointer hover:bg-white/[0.05]",
                                                        isRowComplete && !isBulkEdit && "bg-emerald-500/[0.02]",
                                                        isDataMissing && "bg-danger/[0.15]"
                                                    )}
                                                >
                                                    <td className="p-4 sticky left-0 bg-surface z-20 border-r border-white/5 transition-colors group-hover:bg-white/10">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-grey-dark/50 p-0.5 border-2 border-white/10 overflow-hidden shrink-0 group-hover:border-primary/50 transition-colors">
                                                                {student.photo_url ? (
                                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-grey-medium">
                                                                        <User size={20} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="font-black text-text-main group-hover:text-primary transition-colors leading-tight">{student.prenom} {student.nom}</p>
                                                        </div>
                                                    </td>

                                                    <td className="p-2 text-center bg-primary/5 border-r border-white/10">
                                                        {isBulkEdit ? (
                                                            !hasQuestions ? (
                                                                <div className="flex justify-center">
                                                                    <Input
                                                                        key={`${student.id}-total-${result?.note ?? 'null'}`}
                                                                        type="number"
                                                                        defaultValue={result?.note ?? ''}
                                                                        onBlur={(e: any) => {
                                                                            if (e.target.value !== (result?.note ?? '').toString()) {
                                                                                handleNoteChange(student.id, e.target.value);
                                                                            }
                                                                        }}
                                                                        onKeyDown={handleKeyDown}
                                                                        className={clsx(
                                                                            "w-20 h-10 text-center text-lg font-black bg-grey-dark border-white/20 text-primary",
                                                                            evaluation?.note_max && (Number(result?.note ?? 0) > evaluation.note_max || Number(result?.note ?? 0) < 0) && "border-danger text-danger"
                                                                        )}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-center">
                                                                    {(() => {
                                                                        const { total, formula } = calculateScore(student.id);
                                                                        const palier = (isConversion && total != null) ? getConversionPalier(Number(total), noteMax, activeNoteType) : null;
                                                                        const palierColor = palier?.color ? colorMap[palier.color] || 'text-white' : 'text-white';
                                                                        
                                                                        return (
                                                                            <div className="flex flex-col items-center" title={formula || undefined}>
                                                                                <span className={clsx(
                                                                                    "text-lg font-black transition-colors", 
                                                                                    total != null ? (isConversion ? palierColor : "text-primary") : "text-white opacity-20"
                                                                                )}>
                                                                                    {total ?? '--'}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                {(() => {
                                                                    const { total, formula } = hasQuestions ? calculateScore(student.id) : { total: result?.note, formula: null };
                                                                    const palier = (isConversion && total != null) ? getConversionPalier(Number(total), noteMax, activeNoteType) : null;
                                                                    const palierColor = palier?.color ? colorMap[palier.color] || 'text-white' : 'text-white';
                                                                    
                                                                    return (
                                                                        <div className="flex flex-col items-center" title={formula || undefined}>
                                                                            <span className={clsx(
                                                                                "text-2xl font-black transition-colors", 
                                                                                total != null ? (isConversion ? palierColor : "text-white") : "text-white/10"
                                                                            )}>
                                                                                {total ?? '—'}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {hasQuestions && questions.map(q => {
                                                        const qResult = questionResults.find(qr => qr.eleve_id === student.id && qr.question_id === q.id);
                                                        const palier = isConversion ? getConversionPalier(qResult?.note ?? null, q.note_max, activeNoteType) : null;
                                                        const palierColor = palier?.color ? colorMap[palier.color] || '' : '';

                                                        return (
                                                            <td key={q.id} className="p-2 text-center border-r border-white/5">
                                                                {isBulkEdit ? (
                                                                    <div className="flex justify-center">
                                                                        <Input
                                                                            key={`${student.id}-${q.id}-${qResult?.note ?? 'null'}`}
                                                                            type="number"
                                                                            defaultValue={qResult?.note ?? ''}
                                                                            onBlur={(e: any) => {
                                                                                if (e.target.value !== (qResult?.note ?? '').toString()) {
                                                                                    handleQuestionNoteChange(student.id, q.id, e.target.value);
                                                                                }
                                                                            }}
                                                                            onKeyDown={handleKeyDown}
                                                                            className={clsx(
                                                                                "w-16 h-10 text-center font-black bg-grey-dark/40 border-white/10 focus:border-primary",
                                                                                (Number(qResult?.note ?? 0) > q.note_max || Number(qResult?.note ?? 0) < 0) && "border-danger text-danger"
                                                                            )}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    qResult?.note != null ? (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-base font-black text-white">{qResult.note}</span>
                                                                            {palier && (
                                                                                <span className={clsx("text-[10px] font-black uppercase tracking-widest mt-0.5", palierColor)}>
                                                                                    {palier.letter}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-white/10">—</span>
                                                                    )
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    <td className="p-2 text-center">
                                                        {isBulkEdit ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                {[
                                                                    { id: 'present', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                                                    { id: 'absent', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10' },
                                                                    { id: 'malade', icon: MinusCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                                                    { id: 'non_remis', icon: Octagon, color: 'text-grey-medium', bg: 'bg-grey-medium/10' }
                                                                ].map((s) => (
                                                                    <button
                                                                        key={s.id}
                                                                        onClick={() => handleStatutChange(student.id, s.id)}
                                                                        tabIndex={-1}
                                                                        className={clsx(
                                                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                                                                            pendingAbsences[student.id] && s.id === 'absent' ? "animate-pulse border-danger bg-danger/20 text-danger" : (
                                                                                result?.statut === s.id || (s.id === 'present' && !result?.statut)
                                                                                    ? `border-${s.color.split('-')[1]}-500/50 ${s.bg} ${s.color}`
                                                                                    : "border-transparent text-white/20 hover:text-white/40"
                                                                            )
                                                                        )}
                                                                        title={pendingAbsences[student.id] && s.id === 'absent' ? "Annuler l'absence..." : formatStatut(s.id)}
                                                                    >
                                                                        {pendingAbsences[student.id] && s.id === 'absent' ? (
                                                                            <Loader2 size={16} className="animate-spin" />
                                                                        ) : (
                                                                            <s.icon size={16} />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            result?.statut && result.statut !== 'present' ? (
                                                                <Badge 
                                                                    variant={result.statut === 'absent' ? 'danger' : 'secondary'}
                                                                    className="font-black uppercase tracking-widest text-[9px]"
                                                                >
                                                                    {formatStatut(result.statut)}
                                                                </Badge>
                                                            ) : result?.note != null ? (
                                                                <div className="flex justify-center">
                                                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                                                        <span className="text-emerald-500 text-xs">✓</span>
                                                                    </div>
                                                                </div>
                                                            ) : null
                                                        )}
                                                    </td>

                                                    <td className="p-2">
                                                        {isBulkEdit ? (
                                                            <div className="flex items-center gap-2">
                                                                <MessageSquare size={14} className="text-primary opacity-50 shrink-0" />
                                                                <Input
                                                                    defaultValue={result?.commentaire ?? ''}
                                                                    onBlur={(e: any) => {
                                                                        if (e.target.value !== (result?.commentaire ?? '')) {
                                                                            handleCommentChange(student.id, e.target.value);
                                                                        }
                                                                    }}
                                                                    placeholder="Note libre..."
                                                                    className="flex-1 h-10 border-white/10 bg-grey-dark/40 focus:border-primary text-sm"
                                                                    tabIndex={-1}
                                                                />
                                                            </div>
                                                        ) : (
                                                            result?.commentaire ? (
                                                                <p className="text-xs text-grey-medium italic line-clamp-2 leading-relaxed">{result.commentaire}</p>
                                                            ) : (
                                                                <span className="text-white/5 italic text-xs">Aucun</span>
                                                            )
                                                        )}
                                                    </td>
                                                </tr>
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
                        deleteEvaluation(evalToDelete);
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
