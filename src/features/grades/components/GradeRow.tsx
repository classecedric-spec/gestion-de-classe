import React from 'react';
import { 
    User, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    MinusCircle, 
    Octagon, 
    MessageSquare, 
    // Mic
} from 'lucide-react';
import { Badge, Input } from '../../../core';
import clsx from 'clsx';

interface GradeRowProps {
    student: any;
    result: any;
    questionResults: any[];
    questions: any[];
    evaluation: any;
    isBulkEdit: boolean;
    /* 
    isSupported: boolean;
    isListening: boolean;
    dictatingField: { studentId: string, type: string } | null;
    */
    isGlobalVoiceActive: boolean;
    focusedField: { studentId: string, type: string } | null;
    pendingAbsences: Record<string, any>;
    hasQuestions: boolean;
    isConversion: boolean;
    noteMax: number;
    activeNoteType: any;
    colorMap: Record<string, string>;
    onRowClick: (student: any) => void;
    onNoteChange: (studentId: string, note: string) => void;
    onQuestionNoteChange: (studentId: string, qId: string, note: string) => void;
    onStatutChange: (studentId: string, statut: string) => void;
    onCommentChange: (studentId: string, comment: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    calculateScore: (studentId: string) => { total: number | null, formula: string | null };
    getConversionPalier: (total: number | null, max: number, type: any) => any;
    formatStatut: (s: string) => string;
    /* 
    setDictatingField: (field: { studentId: string, type: string } | null) => void;
    */
    setFocusedField: (field: { studentId: string, type: string } | null) => void;
    /* 
    toggleListening: () => void;
    */
    /* 
    stopListening: () => void;
    */
}

const GradeRow: React.FC<GradeRowProps> = React.memo(({
    student,
    result,
    questionResults,
    questions,
    evaluation,
    isBulkEdit,
    /* 
    isSupported,
    isListening,
    dictatingField,
    */
    isGlobalVoiceActive,
    focusedField,
    pendingAbsences,
    hasQuestions,
    isConversion,
    noteMax,
    activeNoteType,
    colorMap,
    onRowClick,
    onNoteChange,
    onQuestionNoteChange,
    onStatutChange,
    onCommentChange,
    onKeyDown,
    calculateScore,
    getConversionPalier,
    formatStatut,
    /* 
    setDictatingField,
    */
    setFocusedField,
    /* 
    toggleListening,
    */
    /* 
    stopListening
    */
}) => {
    const isRowComplete = hasQuestions
        ? questions.every(q => questionResults.some(qr => qr.eleve_id === student.id && qr.question_id === q.id && qr.note != null))
        : result?.note != null;

    const hasAtLeastOneData = hasQuestions
        ? questions.some(q => questionResults.some(qr => qr.eleve_id === student.id && qr.question_id === q.id && qr.note != null))
        : result?.note != null;

    const isDataMissing = !isRowComplete && hasAtLeastOneData && (!result?.statut || result.statut === 'present');

    return (
        <tr
            onClick={() => {
                if (!isBulkEdit) {
                    onRowClick(student);
                }
            }}
            className={clsx(
                "group transition-all border-b border-white/10",
                !isBulkEdit && "cursor-pointer hover:bg-white/[0.05]",
                isRowComplete && !isBulkEdit && "bg-emerald-500/[0.02]",
                isDataMissing && "bg-danger/[0.15]"
            )}
        >
            <td className="p-4 sticky left-0 bg-surface z-20 border-r border-white/10 transition-all group-hover:shadow-[inset_0_0_0_2000px_rgba(255,255,255,0.05)]">
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

            <td className="p-2 text-center bg-primary/5 border-l border-r border-primary/40">
                {isBulkEdit ? (
                    !hasQuestions ? (
                            <div className="flex justify-center items-center gap-2">
                                <Input
                                    key={`${student.id}-total-${result?.note ?? 'null'}`}
                                    type="number"
                                    defaultValue={result?.note ?? ''}
                                    data-student-id={student.id}
                                    data-type="note"
                                    onKeyDown={onKeyDown}
                                    onFocus={() => setFocusedField({ studentId: student.id, type: 'note' })}
                                    onBlur={(e: any) => {
                                        setFocusedField(null);
                                        if (e.target.value !== (result?.note ?? '').toString()) {
                                            onNoteChange(student.id, e.target.value);
                                        }
                                    }}
                                    className={clsx(
                                        "w-20 h-10 text-center text-lg font-black bg-grey-dark border-white/20 text-primary transition-all",
                                        evaluation?.note_max && (Number(result?.note ?? 0) > evaluation.note_max || Number(result?.note ?? 0) < 0) && "border-danger text-danger",
                                        /* 
                                        ((dictatingField?.studentId === student.id && dictatingField?.type === 'note' && isListening) || 
                                         (isGlobalVoiceActive && isListening && focusedField?.studentId === student.id && focusedField?.type === 'note')) && 
                                        "border-primary ring-4 ring-primary/20 bg-primary/10 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)] animate-pulse"
                                        */
                                    )}
                                />
                                {/* 
                                {isSupported && (
                                    <button
                                        onClick={() => {
                                            if (dictatingField?.studentId === student.id && dictatingField?.type === 'note' && isListening) {
                                                stopListening();
                                                setDictatingField(null);
                                            } else {
                                                setDictatingField({ studentId: student.id, type: 'note' });
                                                toggleListening();
                                            }
                                        }}
                                        className={clsx(
                                            "p-2 rounded-lg transition-all",
                                            dictatingField?.studentId === student.id && dictatingField?.type === 'note' && isListening
                                                ? "bg-primary text-grey-dark"
                                                : "text-grey-medium hover:text-primary hover:bg-primary/10"
                                        )}
                                    >
                                        <Mic size={14} />
                                    </button>
                                )}
                                */}
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
                                            <span>
                                                {total ?? '--'}
                                                {total !== null && (
                                                    <span className="ml-1.5 text-[10px] text-primary/50 font-black uppercase tracking-widest">
                                                        ({Math.round((Number(total) / noteMax) * 100)})
                                                    </span>
                                                )}
                                            </span>
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
                                        total != null ? (isConversion ? palierColor : "text-primary") : "text-white/10"
                                    )}>
                                        <span>
                                            {total ?? '—'}
                                            {total !== null && (
                                                <span className="ml-2 text-xs text-white/40 font-black">
                                                    ({Math.round((Number(total) / noteMax) * 100)})
                                                </span>
                                            )}
                                        </span>
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
                    <td key={q.id} className="p-2 text-center border-r border-white/10">
                        {isBulkEdit ? (
                            <div className="flex justify-center items-center gap-2">
                                <Input
                                    key={`${student.id}-${q.id}-${qResult?.note ?? 'null'}`}
                                    type="number"
                                    defaultValue={qResult?.note ?? ''}
                                    data-student-id={student.id}
                                    data-type={`question-${q.id}`}
                                    onKeyDown={onKeyDown}
                                    onFocus={() => setFocusedField({ studentId: student.id, type: `question-${q.id}` })}
                                    onBlur={(e: any) => {
                                        setFocusedField(null);
                                        if (e.target.value !== (qResult?.note ?? '').toString()) {
                                            onQuestionNoteChange(student.id, q.id, e.target.value);
                                        }
                                    }}
                                    className={clsx(
                                        "w-16 h-10 text-center font-black bg-grey-dark/40 border-white/10 focus:border-primary transition-all",
                                        (Number(qResult?.note ?? 0) > q.note_max || Number(qResult?.note ?? 0) < 0) && "border-danger text-danger",
                                        /* 
                                        ((dictatingField?.studentId === student.id && dictatingField?.type === `question-${q.id}` && isListening) ||
                                         (isGlobalVoiceActive && isListening && focusedField?.studentId === student.id && focusedField?.type === `question-${q.id}`)) &&
                                        "border-primary ring-4 ring-primary/20 bg-primary/10 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)] animate-pulse"
                                        */
                                    )}
                                />
                                {/* 
                                {isSupported && (
                                    <button
                                        onClick={() => {
                                            if (dictatingField?.studentId === student.id && dictatingField?.type === `question-${q.id}` && isListening) {
                                                stopListening();
                                                setDictatingField(null);
                                            } else {
                                                setDictatingField({ studentId: student.id, type: `question-${q.id}` });
                                                toggleListening();
                                            }
                                        }}
                                        className={clsx(
                                            "p-2 rounded-lg transition-all",
                                            dictatingField?.studentId === student.id && dictatingField?.type === `question-${q.id}` && isListening
                                                ? "bg-primary text-grey-dark"
                                                : "text-grey-medium hover:text-primary hover:bg-primary/10"
                                        )}
                                    >
                                        <Mic size={14} />
                                    </button>
                                )}
                                */}
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

            <td className="p-2 text-center border-r border-white/10">
                {isBulkEdit ? (
                    <div className="flex items-center justify-center gap-1">
                        {[
                            { id: 'present', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { id: 'absent', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10' },
                            { id: 'malade', icon: MinusCircle, color: 'text-primary', bg: 'bg-primary/10' },
                            { id: 'non_remis', icon: Octagon, color: 'text-grey-medium', bg: 'bg-grey-medium/10' }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => onStatutChange(student.id, s.id)}
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
                            data-student-id={student.id}
                            data-type="commentaire"
                            onFocus={() => setFocusedField({ studentId: student.id, type: 'commentaire' })}
                            onBlur={(e: any) => {
                                setFocusedField(null);
                                if (e.target.value !== (result?.commentaire ?? '')) {
                                    onCommentChange(student.id, e.target.value);
                                }
                            }}
                            placeholder="Note libre..."
                            className={clsx(
                                "flex-1 h-10 border-white/10 bg-grey-dark/40 focus:border-primary text-sm transition-all",
                                /* 
                                ((dictatingField?.studentId === student.id && dictatingField?.type === 'commentaire' && isListening) ||
                                 (isGlobalVoiceActive && isListening && focusedField?.studentId === student.id && focusedField?.type === 'commentaire')) &&
                                "border-primary ring-4 ring-primary/20 bg-primary/10 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)] animate-pulse"
                                */
                            )}
                            tabIndex={-1}
                        />
                        {/* 
                        {isSupported && (
                            <button
                                onClick={() => {
                                    if (dictatingField?.studentId === student.id && dictatingField?.type === 'commentaire' && isListening) {
                                        stopListening();
                                        setDictatingField(null);
                                    } else {
                                        setDictatingField({ studentId: student.id, type: 'commentaire' });
                                        toggleListening();
                                    }
                                }}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    dictatingField?.studentId === student.id && dictatingField?.type === 'commentaire' && isListening
                                        ? "bg-primary text-grey-dark"
                                        : "text-grey-medium hover:text-primary hover:bg-primary/10"
                                )}
                            >
                                <Mic size={14} />
                            </button>
                        )}
                        */}
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
    );
}, (prev, next) => {
    // Basic props
    if (prev.isBulkEdit !== next.isBulkEdit ||
        /* 
        prev.isListening !== next.isListening ||
        */
        prev.isGlobalVoiceActive !== next.isGlobalVoiceActive ||
        /* 
        prev.isSupported !== next.isSupported ||
        */
        prev.noteMax !== next.noteMax ||
        prev.hasQuestions !== next.hasQuestions) {
        return false;
    }

    // Object identities/references that change often or are unstable
    if (/* prev.dictatingField !== next.dictatingField || */
        prev.focusedField !== next.focusedField ||
        prev.pendingAbsences !== next.pendingAbsences) {
        return false;
    }

    // Results data - The most important part
    if (prev.result?.note !== next.result?.note ||
        prev.result?.statut !== next.result?.statut ||
        prev.result?.commentaire !== next.result?.commentaire) {
        return false;
    }

    // Questions results - Check if any note changed
    if (prev.questionResults.length !== next.questionResults.length) return false;
    for (let i = 0; i < prev.questionResults.length; i++) {
        if (prev.questionResults[i].note !== next.questionResults[i].note ||
            prev.questionResults[i].question_id !== next.questionResults[i].question_id) {
            return false;
        }
    }

    // Student identity
    if (prev.student.id !== next.student.id) return false;

    return true;
});

GradeRow.displayName = 'GradeRow';

export default GradeRow;
