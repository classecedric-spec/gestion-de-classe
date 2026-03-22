import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trackingService } from '../../tracking/services/trackingService';
import { useGrades } from '../hooks/useGrades';
import { Tables } from '../../../types/supabase';
import { Card, Badge } from '../../../core';
import { 
    MessageSquare, 
    User, 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp,
    TrendingUp,
    Activity,
    Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';

interface GradeEntryGridProps {
    evaluationId: string;
    evaluation?: Tables<'Evaluation'>;
}

interface StudentQueryResult {
    ids: string[];
    full: any[];
}

const GradeEntryGrid: React.FC<GradeEntryGridProps> = ({
    evaluationId,
    evaluation
}) => {
    const { session } = useAuth();
    const userId = session?.user?.id;

    const { 
        questions,
        currentResults,
        questionResults,
        saveResult, 
        saveQuestionResults,
        stats, 
        getGradeColor, 
        formatStatut,
        setSelectedEvaluationId,
        noteTypes,
        getConversionPalier
    } = useGrades(evaluation?.branche_id || undefined, evaluation?.periode || undefined);

    const activeNoteType = noteTypes.find(nt => nt.id === evaluation?.type_note_id);
    const isConversion = activeNoteType?.systeme === 'conversion';

    // Set evaluation ID in hook context to fetch results
    React.useEffect(() => {
        setSelectedEvaluationId(evaluationId);
    }, [evaluationId, setSelectedEvaluationId]);

    // Fetch students in this group
    const { data: studentData, isLoading: loadingStudents } = useQuery<StudentQueryResult>({
        queryKey: ['students_group', evaluation?.group_id],
        queryFn: async (): Promise<StudentQueryResult> => {
            if (!evaluation?.group_id) return { ids: [], full: [] };
            const result = await trackingService.fetchStudentsInGroup(evaluation.group_id);
            return result as StudentQueryResult;
        },
        enabled: !!evaluation?.group_id
    });

    const students = [...(studentData?.full || [])].sort((a, b) => {
        const prenomA = a.prenom || '';
        const prenomB = b.prenom || '';
        const prenomCmp = prenomA.localeCompare(prenomB);
        if (prenomCmp !== 0) return prenomCmp;
        return (a.nom || '').localeCompare(b.nom || '');
    });

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [focusedCol, setFocusedCol] = useState<string | 'total' | null>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const hasQuestions = questions.length > 0;

    // Handle navigation
    const handleKeyDown = (e: React.KeyboardEvent, studentIndex: number, colId: string | 'total') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextStudentIndex = (studentIndex + 1) % students.length;
            const nextRefId = `${nextStudentIndex}-${colId}`;
            inputRefs.current[nextRefId]?.focus();
        }
    };

    // Handle individual question score entry
    const handleQuestionBlur = (studentId: string, questionId: string, val: string) => {
        if (val === '' || !userId) return;
        const note = parseFloat(val);
        if (!isNaN(note)) {
            // 1. Save question result
            saveQuestionResults([{
                eleve_id: studentId,
                question_id: questionId,
                note
            }]);

            // 2. Trigger total update (lazy summation)
            const otherResults = questionResults.filter(qr => qr.eleve_id === studentId && qr.question_id !== questionId);
            const total = note + otherResults.reduce((acc, qr) => acc + (qr.note || 0), 0);
            
            saveResult({
                evaluation_id: evaluationId,
                eleve_id: studentId,
                user_id: userId,
                note: total,
                statut: 'present'
            });
        }
    };

    const handleTotalBlur = (studentId: string, val: string) => {
        if (val === '' || !userId) return;
        const note = parseFloat(val);
        if (!isNaN(note)) {
            saveResult({ 
                evaluation_id: evaluationId,
                eleve_id: studentId, 
                user_id: userId,
                statut: 'present', 
                note 
            });
        }
    };

    const handleShortcut = (e: React.KeyboardEvent, studentId: string) => {
        const val = (e.target as HTMLInputElement).value.toUpperCase();
        if (val === 'A' && userId) {
            e.preventDefault();
            saveResult({ evaluation_id: evaluationId, eleve_id: studentId, user_id: userId, statut: 'absent', note: null });
            toast.info("Marqué comme absent");
            (e.target as HTMLInputElement).value = '';
        } else if (val === 'M' && userId) {
            e.preventDefault();
            saveResult({ evaluation_id: evaluationId, eleve_id: studentId, user_id: userId, statut: 'malade', note: null });
            toast.info("Marqué comme malade");
            (e.target as HTMLInputElement).value = '';
        }
    };

    const [editingTotals, setEditingTotals] = useState<Record<string, boolean>>({});
    const [editingComments, setEditingComments] = useState<Record<string, boolean>>({});
    const [localTotals, setLocalTotals] = useState<Record<string, string>>({});

    if (loadingStudents) return <div className="p-12 text-center text-grey-medium">Chargement des élèves...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Class Stats Bar */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 flex flex-col items-center justify-center bg-primary/5 border-primary/10">
                        <TrendingUp className="text-primary mb-1" size={20} />
                        <span className="text-2xl font-black text-primary">{stats.average.toFixed(1)}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-grey-medium">Moyenne Classe</span>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center">
                        <ChevronUp className="text-success mb-1" size={20} />
                        <span className="text-2xl font-black text-grey-dark">{stats.highest.toFixed(1)}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-grey-medium">Note Max</span>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center">
                        <ChevronDown className="text-danger mb-1" size={20} />
                        <span className="text-2xl font-black text-grey-dark">{stats.lowest.toFixed(1)}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-grey-medium">Note Min</span>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center">
                        <Activity className="text-grey-dark mb-1" size={20} />
                        <span className="text-2xl font-black text-grey-dark">{stats.count} / {students.length}</span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-grey-medium">Encodées</span>
                    </Card>
                </div>
            )}

            {/* Entry Grid */}
            <div className="bg-surface rounded-3xl border border-border/10 shadow-xl overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-grey-dark text-white uppercase text-[10px] tracking-widest font-black whitespace-nowrap">
                            <th className="py-4 px-6 text-left min-w-[200px]">Élève</th>
                            {questions.map(q => (
                                <th key={q.id} className="py-4 px-2 text-center min-w-[80px]">
                                    <div className="flex flex-col items-center">
                                        <span className="truncate max-w-[100px]">{q.titre}</span>
                                        <span className="text-[8px] opacity-60">/ {q.note_max}</span>
                                    </div>
                                </th>
                            ))}
                            <th className="py-4 px-2 text-center w-24 bg-primary/10 text-primary">Total</th>
                            <th className="py-4 px-2 text-center">Status</th>
                            <th className="py-4 px-6 text-left min-w-[200px]">Commentaire</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5">
                        {students.map((student: any, studentIndex: number) => {
                            const result = currentResults.find(r => r.eleve_id === student.id);
                            const gradeColor = result?.note !== null ? getGradeColor(result?.note || 0, evaluation?.note_max || 10) : '';
                            
                            // Check if all grades are filled
                            const isRowComplete = hasQuestions 
                                ? questions.every(q => questionResults.some(qr => qr.eleve_id === student.id && qr.question_id === q.id && qr.note !== null))
                                : result?.note !== null && result?.note !== undefined;

                            return (
                                <tr 
                                    key={student.id} 
                                    className={`group transition-colors ${isRowComplete ? 'bg-amber-500/20 hover:bg-amber-500/30' : 'hover:bg-primary/5'} ${focusedIndex === studentIndex && !isRowComplete ? 'bg-primary/5' : ''}`}
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-grey-light/20 flex items-center justify-center text-grey-medium overflow-hidden shrink-0">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={16} />
                                                )}
                                            </div>
                                            <div className="truncate">
                                                <p className="font-bold text-grey-dark truncate">{student.prenom} {student.nom}</p>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    {/* Question Inputs */}
                                    {questions.map(q => {
                                        const qResult = questionResults.find(qr => qr.eleve_id === student.id && qr.question_id === q.id);
                                        const refId = `${studentIndex}-${q.id}`;
                                        const palier = isConversion ? getConversionPalier(qResult?.note || null, q.note_max, activeNoteType) : null;
                                        const colorMap: Record<string, string> = {
                                            emerald: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
                                            blue: 'text-blue-500 border-blue-500/20 bg-blue-500/5',
                                            amber: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
                                            rose: 'text-rose-500 border-rose-500/20 bg-rose-500/5',
                                            purple: 'text-purple-500 border-purple-500/20 bg-purple-500/5',
                                            grey: 'text-grey-medium border-grey-medium/20 bg-grey-medium/5'
                                        };
                                        const colorClasses = palier?.color ? colorMap[palier.color] || '' : '';
                                        
                                        return (
                                            <td key={q.id} className="py-4 px-1">
                                                <div className="flex flex-col items-center gap-1">
                                                    <input
                                                        ref={el => { inputRefs.current[refId] = el; }}
                                                        type="text"
                                                        placeholder="--"
                                                        defaultValue={qResult?.note ?? ''}
                                                        onKeyDown={(e) => {
                                                            handleKeyDown(e, studentIndex, q.id);
                                                            handleShortcut(e, student.id);
                                                        }}
                                                        onBlur={(e) => handleQuestionBlur(student.id, q.id, e.target.value)}
                                                        onFocus={() => {
                                                            setFocusedIndex(studentIndex);
                                                            setFocusedCol(q.id);
                                                        }}
                                                        className={`w-14 h-10 text-center text-sm font-bold rounded-lg border-2 transition-all outline-none
                                                            ${focusedCol === q.id && focusedIndex === studentIndex ? 'border-primary bg-input' : (colorClasses || 'border-border/5 bg-input')}
                                                        `}
                                                    />
                                                    {palier && (
                                                        <span className={`text-[10px] font-black animate-in fade-in zoom-in-95 duration-300 ${colorClasses.split(' ')[0]}`}>
                                                            {palier.letter}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}

                                    {/* Total Input */}
                                    <td className={`py-4 px-2 ${isRowComplete ? 'bg-amber-500/5' : 'bg-primary/5'} transition-colors ${focusedCol === 'total' && focusedIndex === studentIndex ? 'bg-primary/10' : ''}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <input
                                                ref={el => { inputRefs.current[`${studentIndex}-total`] = el; }}
                                                type="text"
                                                placeholder="--"
                                                value={localTotals[student.id] !== undefined ? localTotals[student.id] : (result?.note?.toString() ?? '')}
                                                onChange={(e) => {
                                                    if (!hasQuestions || editingTotals[student.id]) {
                                                        setLocalTotals(prev => ({ ...prev, [student.id]: e.target.value }));
                                                    }
                                                }}
                                                readOnly={hasQuestions && !editingTotals[student.id]}
                                                tabIndex={hasQuestions && !editingTotals[student.id] ? -1 : 0}
                                                onKeyDown={(e) => {
                                                    handleKeyDown(e, studentIndex, 'total');
                                                    handleShortcut(e, student.id);
                                                }}
                                                onDoubleClick={() => {
                                                    if (hasQuestions) setEditingTotals(prev => ({ ...prev, [student.id]: true }));
                                                }}
                                                onBlur={(e) => {
                                                    handleTotalBlur(student.id, e.target.value);
                                                    if (hasQuestions) {
                                                        setEditingTotals(prev => ({ ...prev, [student.id]: false }));
                                                        setLocalTotals(prev => {
                                                            const n = { ...prev };
                                                            delete n[student.id];
                                                            return n;
                                                        });
                                                    }
                                                }}
                                                onFocus={() => {
                                                    setFocusedIndex(studentIndex);
                                                    setFocusedCol('total');
                                                }}
                                                className={`w-16 h-12 text-center text-xl font-black rounded-xl border-2 transition-all outline-none
                                                    ${gradeColor ? `border-${gradeColor} text-${gradeColor} bg-${gradeColor}/5` : 'border-border/10 bg-input focus:border-primary'}
                                                    ${hasQuestions && !editingTotals[student.id] ? 'cursor-default opacity-80' : 'cursor-text'}
                                                `}
                                            />
                                            {isConversion && (localTotals[student.id] || result?.note !== null) && (() => {
                                                const totalNote = parseFloat(localTotals[student.id] || result?.note?.toString() || '0');
                                                const palier = getConversionPalier(totalNote, evaluation?.note_max || 20, activeNoteType);
                                                const colorMap: Record<string, string> = {
                                                    emerald: 'text-emerald-500',
                                                    blue: 'text-blue-500',
                                                    amber: 'text-amber-500',
                                                    rose: 'text-rose-500',
                                                    purple: 'text-purple-500',
                                                    grey: 'text-grey-medium'
                                                };
                                                const colorClass = palier?.color ? colorMap[palier.color] || 'text-amber-500' : 'text-amber-500';
                                                
                                                return palier && (
                                                    <span className={`text-sm font-black animate-in fade-in slide-in-from-top-1 duration-300 ${colorClass}`}>
                                                        {palier.letter}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>

                                    <td className="py-4 px-2 text-center">
                                        {result?.statut && result.statut !== 'present' && (
                                            <Badge variant={result.statut === 'absent' ? 'danger' : 'secondary'}>
                                                {formatStatut(result.statut)}
                                            </Badge>
                                        )}
                                        {result?.statut === 'present' && result.note !== null && (
                                            <CheckCircle2 size={20} className="text-success mx-auto opacity-50" />
                                        )}
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="relative group/comment">
                                            <input 
                                                type="text"
                                                placeholder="Ajouter un commentaire..."
                                                defaultValue={result?.commentaire || ''}
                                                readOnly={!editingComments[student.id]}
                                                tabIndex={!editingComments[student.id] ? -1 : 0}
                                                onDoubleClick={() => setEditingComments(prev => ({ ...prev, [student.id]: true }))}
                                                onBlur={(e) => {
                                                    setEditingComments(prev => ({ ...prev, [student.id]: false }));
                                                    if (userId) {
                                                        saveResult({ 
                                                            evaluation_id: evaluationId,
                                                            eleve_id: student.id, 
                                                            user_id: userId,
                                                            commentaire: e.target.value 
                                                        });
                                                    }
                                                }}
                                                className={`w-full bg-transparent border-b border-transparent focus:border-primary/30 py-1 text-sm text-grey-medium italic focus:not-italic focus:text-grey-dark outline-none transition-all ${!editingComments[student.id] ? 'cursor-default' : 'cursor-text'}`}
                                            />
                                            <MessageSquare className={`absolute right-0 top-1/2 -translate-y-1/2 text-grey-light opacity-0 ${!editingComments[student.id] ? 'group-hover/comment:opacity-50' : ''}`} size={12} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Help / Shortcuts Tooltip */}
            <div className="flex flex-col md:flex-row justify-between gap-6 p-6 bg-grey-dark/5 rounded-3xl border border-dashed border-border">
                <div className="flex flex-wrap gap-4 text-[10px] text-grey-medium uppercase tracking-widest font-bold">
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-surface border border-border rounded shadow-sm text-grey-dark">Entrée</kbd>
                        <span>Suivant</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-surface border border-border rounded shadow-sm text-grey-dark">A</kbd>
                        <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-surface border border-border rounded shadow-sm text-grey-dark">M</kbd>
                        <span>Malade</span>
                    </div>
                </div>
                
                {hasQuestions && (
                    <div className="flex items-center gap-2 text-xs text-primary font-bold">
                        <Info size={16} />
                        <span>Le total est calculé automatiquement à partir des notes par question.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradeEntryGrid;
