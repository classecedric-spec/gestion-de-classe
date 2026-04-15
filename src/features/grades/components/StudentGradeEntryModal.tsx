/**
 * Nom du module/fichier : StudentGradeEntryModal.tsx
 * 
 * Données en entrée : Le nom et la photo d'un élève spécifique, l'évaluation concernée et les notes qu'il a déjà obtenues si on les a déjà tapées avant.
 * 
 * Données en sortie : L'enregistrement sécurisé et définitif d'une cote (soit une note globale, soit la somme calculée de plusieurs petites questions), ainsi qu'une remarque éventuelle.
 * 
 * Objectif principal : Offrir une grande fenêtre pop-up de type "Focus" ou "Cartouche d'examen" pour corriger le devoir d'un élève spécifique confortablement.
 * 
 * Ce que ça affiche : Une fenêtre superposée contenant à gauche la calculette des notes (questions par questions si besoin), et à droite l'état de l'élève (Présent, Absent, etc.) et une large case de commentaires.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, Badge } from '../../../core';
import { 
    User, 
    Save, 
    X, 
    AlertCircle, 
    CheckCircle2,
    MessageSquare,
    Info
    // Mic,
    // MicOff
} from 'lucide-react';
// import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { useAuth } from '../../../hooks/useAuth';
import { useGradeMutations } from '../hooks/useGrades';
import { Tables } from '../../../types/supabase';
import { toast } from 'sonner';
import clsx from 'clsx';

interface StudentGradeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    evaluation: Tables<'Evaluation'>;
    questions: Tables<'EvaluationQuestion'>[];
    currentResult?: Tables<'Resultat'>;
    questionResults: Tables<'ResultatQuestion'>[];
    noteTypes: any[];
    getConversionPalier: (note: number | null, max: number, typeNote: any) => any;
}

const StudentGradeEntryModal: React.FC<StudentGradeEntryModalProps> = ({
    isOpen,
    onClose,
    student,
    evaluation,
    questions,
    currentResult,
    questionResults,
    noteTypes,
    getConversionPalier
}) => {
    const { session } = useAuth();
    const userId = session?.user?.id;
    const { saveResult, saveQuestionResults } = useGradeMutations(evaluation.id);

    const [localTotal, setLocalTotal] = useState<string>('');
    const [localQuestions, setLocalQuestions] = useState<Record<string, string>>({});
    const [statut, setStatut] = useState<string>('present');
    const [commentaire, setCommentaire] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    /*
    const [dictatingField, setDictatingField] = useState<'total' | string | null>(null);
    
    // Voice recognition for comments and notes
    const { isListening, isSupported, toggleListening, stopListening } = useSpeechRecognition({
        onResult: (text, isFinal) => {
            if (dictatingField === 'commentaire') {
                if (isFinal) {
                    setCommentaire(prev => (prev + ' ' + text).trim());
                    setDictatingField(null);
                }
            } else if (dictatingField) {
                // Pour les notes (total ou question spécifique)
                const numText = text.toLowerCase().replace(/,/g, '.').replace(/[^0-9.]/g, '');
                const num = parseFloat(numText);
                
                if (!isNaN(num) && isFinal) {
                    if (dictatingField === 'total') {
                        setLocalTotal(num.toString());
                    } else {
                        setLocalQuestions(prev => ({
                            ...prev,
                            [dictatingField]: num.toString()
                        }));
                    }
                    setDictatingField(null);
                }
            }
        },
        onError: (err) => {
            console.error('Speech recognition error:', err);
            toast.error("Erreur de reconnaissance vocale");
            setDictatingField(null);
        }
    });

    const handleCommentMicClick = () => {
        if (dictatingField === 'commentaire' && isListening) {
            stopListening();
            setDictatingField(null);
        } else {
            setDictatingField('commentaire');
            toggleListening();
        }
    };
    */

    const firstInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on first input when modal opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (firstInputRef.current) {
                    firstInputRef.current.focus();
                    firstInputRef.current.select();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const activeNoteType = noteTypes.find(nt => nt.id === evaluation.type_note_id);
    const isConversion = activeNoteType?.systeme === 'conversion';
    const hasQuestions = questions.length > 0;
    const hasPaliers = questions.some(q => q.paliers && Array.isArray(q.paliers) && q.paliers.length > 0);


    // Initialize local state
    useEffect(() => {
        if (isOpen && student) {
            setLocalTotal(currentResult?.note?.toString() || '');
            setStatut(currentResult?.statut || 'present');
            setCommentaire(currentResult?.commentaire || '');
            
            const qMap: Record<string, string> = {};
            questions.forEach(q => {
                const qr = questionResults.find(r => r.eleve_id === student.id && r.question_id === q.id);
                qMap[q.id] = qr?.note?.toString() || '';
            });
            setLocalQuestions(qMap);
        }
    }, [isOpen, student, currentResult, questions, questionResults]);

    // Capture le clic sur le bouton "Valider" : compresse les notes de toutes les petites questions (si elles existent) plus la note finale, et envoie le tout au coffre-fort web.
    const handleSave = () => {
        if (!userId || !student) return;
        
        // 1. Save question results if any
        if (hasQuestions) {
            const qResults = Object.entries(localQuestions)
                .filter(([_, val]) => val !== '')
                .map(([qid, val]) => ({
                    eleve_id: student.id,
                    question_id: qid,
                    note: parseFloat(val)
                }));
            
            if (qResults.length > 0) {
                saveQuestionResults({ results: qResults });
            }
        }

        // 2. Save main result
        const totalNote = localTotal !== '' ? parseFloat(localTotal) : null;
        saveResult({
            result: {
                evaluation_id: evaluation.id,
                eleve_id: student.id,
                user_id: userId,
                note: totalNote,
                statut: statut as any,
                commentaire: commentaire
            }
        });

        onClose();
    };

    const handleQuestionChange = (qid: string, val: string) => {
        const newQuestions = { ...localQuestions, [qid]: val };
        setLocalQuestions(newQuestions);

        // Validation & Auto-calculate total
        let hasError = false;
        let weightedTotal = 0;
        let maxWeightedTotal = 0;
        let hasAnyAnswer = false;

        for (const q of questions) {
            const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
            const qMax = parseFloat(q.note_max.toString());
            maxWeightedTotal += qMax * ratio;

            const qVal = newQuestions[q.id];
            if (qVal && qVal !== '') {
                const numVal = parseFloat(qVal);
                if (isNaN(numVal) || numVal < 0 || numVal > qMax) {
                    hasError = true;
                } else {
                    weightedTotal += numVal * ratio;
                    hasAnyAnswer = true;
                }
            }
        }

        // Only update total if no errors in questions and maxWeightedTotal > 0
        if (!hasError) {
            if (hasAnyAnswer && maxWeightedTotal > 0) {
                const evalMax = parseFloat(evaluation.note_max?.toString() || '20');
                const finalNote = (weightedTotal / maxWeightedTotal) * evalMax;
                setLocalTotal(parseFloat(finalNote.toFixed(2)).toString());
            } else {
                setLocalTotal('');
            }
        }
    };

    const isQuestionInvalid = (qid: string) => {
        const val = localQuestions[qid];
        if (!val || val === '') return false;
        const numVal = parseFloat(val);
        const q = questions.find(q => q.id === qid);
        return isNaN(numVal) || numVal < 0 || (q ? numVal > q.note_max : false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Search within the nearest modal container
            const container = e.currentTarget.closest('.space-y-8');
            if (!container) return;

            const inputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
            const index = inputs.indexOf(e.currentTarget);

            const next = inputs[index + 1];
            if (next) {
                next.focus();
                next.select();
            }
        }
    };

    const isTotalInvalid = () => {
        if (localTotal === '') return false;
        const numVal = parseFloat(localTotal);
        return isNaN(numVal) || numVal < 0 || numVal > evaluation.note_max;
    };

    const hasAnyError = isTotalInvalid() || Object.keys(localQuestions).some(qid => isQuestionInvalid(qid));

    if (!student) return null;

    const noteTotal = parseFloat(localTotal) || 0;
    const noteMax = evaluation.note_max || 20;
    const palierTotal = isConversion ? getConversionPalier(localTotal !== '' ? noteTotal : null, noteMax, activeNoteType) : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Encodage : ${student.prenom} ${student.nom}`}
            className="!max-w-4xl"
        >
            <div className="space-y-8">
                {/* Student Header - FLAT Card */}
                <div className="flex items-center gap-6 p-6 bg-grey-dark/40 rounded-3xl border border-white/10">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-grey-dark/50 p-1 border-2 border-primary/30 overflow-hidden shrink-0">
                            {student.photo_url ? (
                                <img src={student.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-grey-medium">
                                    <User size={32} />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-grey-dark flex items-center justify-center">
                             <CheckCircle2 size={12} className="text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{student.prenom} {student.nom}</h3>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-3 py-1 font-black text-[10px] uppercase tracking-widest bg-primary/20 text-primary border-primary/20">
                                {evaluation.titre}
                            </Badge>
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-widest opacity-60">
                                {evaluation.periode}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    {/* Left Col: Scores (3/5) */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CheckCircle2 size={20} />
                                </div>
                                <h4 className="font-black text-white uppercase text-sm tracking-widest">Résultats détaillés</h4>
                            </div>
                            {hasQuestions && <Badge variant="secondary" className="font-bold opacity-60">{questions.length} Question{questions.length > 1 ? 's' : ''}</Badge>}
                        </div>

                        {hasQuestions ? (
                            <div className={clsx(
                                "pr-4 custom-scrollbar",
                                hasPaliers ? "space-y-12 max-h-[60vh] overflow-y-auto" : "space-y-4 max-h-[400px] overflow-y-auto"
                            )}>
                                {questions.map((q, idx) => {
                                    const val = localQuestions[q.id] || '';
                                    const qPalier = isConversion ? getConversionPalier(val !== '' ? parseFloat(val) : null, q.note_max, activeNoteType) : null;
                                    const isInvalid = isQuestionInvalid(q.id);
                                    const currentPaliers = q.paliers && Array.isArray(q.paliers) ? q.paliers : [];
                                    const questionHasPaliers = currentPaliers.length > 0;
                                    
                                    if (hasPaliers && questionHasPaliers) {
                                        // NEW QUESTIONNAIRE MODE (VERTICAL BLOCKS)
                                        return (
                                            <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                                                        <span className="text-primary font-black text-sm">{idx + 1}</span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-white leading-tight tracking-tight">{q.titre}</h3>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 ml-14">
                                                    {currentPaliers.map((palier: any, pIdx: number) => {
                                                        const isSelected = Number(val) === Number(palier.points);
                                                        return (
                                                            <button
                                                                key={pIdx}
                                                                onClick={() => handleQuestionChange(q.id, String(palier.points))}
                                                                className={clsx(
                                                                    "group relative flex items-center p-5 rounded-2xl border-2 transition-all duration-200 text-left",
                                                                    isSelected
                                                                        ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                                                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/20"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-4 w-full">
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                                        isSelected 
                                                                            ? "bg-white text-primary border-white" 
                                                                            : "border-white/10 text-grey-medium group-hover:border-primary group-hover:text-primary"
                                                                    )}>
                                                                        {isSelected ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{pIdx + 1}</span>}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className={clsx(
                                                                            "text-sm font-black uppercase tracking-widest",
                                                                            isSelected ? "text-grey-dark" : "text-grey-medium"
                                                                        )}>
                                                                            {palier.label}
                                                                        </div>
                                                                        {palier.description && (
                                                                            <div className={clsx(
                                                                                "text-xs mt-1",
                                                                                isSelected ? "text-grey-dark/60" : "text-grey-light/40"
                                                                            )}>
                                                                                {palier.description}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className={clsx(
                                                                        "font-black text-xs",
                                                                        isSelected ? "text-grey-dark" : "text-primary opacity-40"
                                                                    )}>
                                                                        {palier.points} pts
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // CLASSIC LIST MODE
                                    return (
                                        <div 
                                            key={q.id} 
                                            className={clsx(
                                                "group flex items-center justify-between p-4 rounded-2xl transition-all border",
                                                isInvalid 
                                                    ? "bg-danger/10 border-2 border-danger" 
                                                    : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                                            )}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className={clsx("text-base font-black transition-colors", isInvalid ? "text-danger" : "text-white group-hover:text-primary")}>{q.titre}</span>
                                                <Badge variant="secondary" className="w-fit text-[9px] px-2 py-0 opacity-40 uppercase">Max: {q.note_max}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {qPalier && (
                                                    <Badge className={clsx("font-black text-xs h-8 px-3 text-white border border-white/10", isInvalid ? "bg-danger" : "bg-grey-dark")}>
                                                        {qPalier.letter}
                                                    </Badge>
                                                )}
                                                <div className="relative flex items-center gap-2">
                                                        <div className="w-24">
                                                            <Input
                                                                ref={idx === 0 ? firstInputRef : null}
                                                                type="number"
                                                                value={val}
                                                                onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                                                                onKeyDown={handleKeyDown}
                                                                placeholder="--"
                                                                className={clsx(
                                                                    "text-center font-black text-lg h-12 bg-grey-dark/50 border-white/10 focus:border-primary focus:ring-0",
                                                                    isInvalid && "text-danger focus:border-danger"
                                                                )}
                                                            />
                                                        </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="p-10 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-20 italic">
                                 Saisie directe de la note totale
                             </div>
                        )}

                        <div className={clsx(
                            "mt-8 p-6 rounded-3xl border-2 relative overflow-hidden transition-all",
                            isTotalInvalid() 
                                ? "bg-danger/10 border-danger" 
                                : "bg-primary/10 border-primary/20",
                            hasPaliers && "mt-12 shadow-2xl shadow-primary/5"
                        )}>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className={clsx("font-black uppercase text-sm tracking-tighter block", isTotalInvalid() ? "text-danger" : "text-primary")}>Note Totale finale</span>
                                    <span className="text-[10px] text-grey-medium font-bold uppercase tracking-widest">Sur un maximum de {evaluation.note_max}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {palierTotal && (
                                        <div className="h-14 px-5 rounded-2xl bg-primary text-grey-dark flex items-center justify-center text-2xl font-black">
                                            {palierTotal.letter}
                                        </div>
                                    )}
                                    <div className="relative flex items-center gap-2">
                                            <div className="w-32">
                                                <Input
                                                    ref={!hasQuestions ? firstInputRef : null}
                                                    type="number"
                                                    value={localTotal}
                                                    onChange={(e) => setLocalTotal(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    readOnly={hasQuestions}
                                                    placeholder="--"
                                                    className={clsx(
                                                        "text-center text-3xl font-black h-14 bg-grey-dark/80 border-white/20 text-primary",
                                                        hasQuestions && "opacity-50 cursor-not-allowed grayscale",
                                                        isTotalInvalid() && "text-danger"
                                                    )}
                                                />
                                            </div>
                                    </div>
                                </div>
                            </div>
                            {hasQuestions && (
                                <p className="text-[10px] text-primary font-black mt-4 flex items-center gap-1.5 uppercase tracking-widest opacity-80">
                                    <Info size={14} />
                                    Calcul automatique activé
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Col: Status & Comments (2/5) */}
                    <div className="lg:col-span-2 space-y-8 h-full flex flex-col">
                        {/* Status Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <AlertCircle size={20} />
                                </div>
                                <h4 className="font-black text-white uppercase text-sm tracking-widest">Statut</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'present', label: 'Présent', color: 'primary' },
                                    { id: 'absent', label: 'Absent', color: 'danger' },
                                    { id: 'malade', label: 'Non évaluable', color: 'amber' },
                                    { id: 'non_remis', label: 'Non remis', color: 'rose' }
                                ].map((s) => {
                                    const handleStatutClick = (newStatut: string) => {
                                        setStatut(newStatut);
                                        if (newStatut === 'absent') {
                                            setLocalTotal('');
                                            const clearedQs: Record<string, string> = {};
                                            questions.forEach(q => { clearedQs[q.id] = ''; });
                                            setLocalQuestions(clearedQs);
                                        }
                                    };

                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => handleStatutClick(s.id)}
                                            className={clsx(
                                                "h-14 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center text-center",
                                                statut === s.id 
                                                    ? "bg-primary border-primary text-grey-dark" 
                                                    : "bg-white/[0.03] border-white/5 text-grey-light hover:border-white/20 hover:bg-white/[0.08]"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="space-y-4 flex-1 flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <MessageSquare size={20} />
                                    </div>
                                    <h4 className="font-black text-white uppercase text-sm tracking-widest">Commentaires</h4>
                                </div>
                                { /* Commented out voice dictation
                                isSupported && (
                                    <button
                                        onClick={handleCommentMicClick}
                                        className={clsx(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest",
                                            dictatingField === 'commentaire' && isListening 
                                                ? "bg-danger text-white border-danger animate-pulse" 
                                                : "bg-white/5 text-grey-medium border-white/5 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        {dictatingField === 'commentaire' && isListening ? (
                                            <>
                                                <MicOff size={14} />
                                                En écoute...
                                            </>
                                        ) : (
                                            <>
                                                <Mic size={14} />
                                                Dictée vocale
                                            </>
                                        )}
                                    </button>
                                )
                                */ }
                            </div>
                            <textarea
                                value={commentaire}
                                onChange={(e) => setCommentaire(e.target.value)}
                                placeholder="Observations particulières..."
                                className={clsx(
                                    "w-full flex-1 min-h-[150px] p-6 rounded-3xl bg-grey-dark/40 border transition-all text-sm italic resize-none text-grey-light placeholder:opacity-30 outline-none border-white/10 focus:border-primary/50"
                                    // dictatingField === 'commentaire' && isListening ? "border-danger ring-1 ring-danger/20" : "border-white/10 focus:border-primary/50"
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions - FLAT Look */}
                <div className="flex items-center justify-between gap-4 pt-8 border-t border-white/5">
                    <p className="text-[10px] text-grey-medium font-bold uppercase tracking-widest opacity-40">
                        ID de l'enregistrement : <span className="font-mono">{student.id.slice(0,8)}...</span>
                    </p>
                    <div className="flex gap-4">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 h-12 rounded-xl text-grey-medium hover:text-white"
                        >
                            <X size={20} className="mr-2" />
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSave}
                            loading={isSaving}
                            disabled={hasAnyError}
                            className={clsx(
                                "px-12 h-12 rounded-xl font-black uppercase tracking-widest bg-primary text-grey-dark transition-all",
                                hasAnyError && "opacity-50 grayscale cursor-not-allowed"
                            )}
                        >
                            <Save size={20} className="mr-2" />
                            Valider
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

/**
 * 1. M. le professeur clique sur la ligne d'un élève, la grande "Modal" recouvre l'écran. L'ordinateur affiche instantanément son visage et son nom en gros pour éviter les erreurs.
 * 2. Si le professeur a paramétré des questions intermédiaires : la case finale est verrouillée (grisée). Le programme invite l'enseignant à remplir ligne par ligne les résultats de chaque exercice. La calculatrice interne additionne le tout en direct.
 * 3. S'il n'y a pas de sous-questions, le curseur se place tout seul dans la case "Note finale totale" pour taper directement le résultat.
 * 4. Pendant la frappe, des sécurités de couleur préviennent l'enseignant s'il dépasse le seuil autorisé (la note s'encadre en rouge).
 * 5. À tout moment, s'il clique sur "Absent" dans la colonne de droite, le statut prend le pas.
 * 6. Au clic sur "Valider", les données traversent la fibre optique jusqu'aux serveurs ; un signal visuel vert s'affiche "Notes de Jean enregistrées" et la fenêtre se dissout.
 */
export default StudentGradeEntryModal;
