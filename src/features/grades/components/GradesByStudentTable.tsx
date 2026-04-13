import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradeService } from '../services';
import { trackingService } from '../../tracking/services/trackingService';
import { Loader2, Users, X, Info, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import { Avatar, CardInfo, BaseModal, MultiFilterSelect, Tabs } from '../../../core';
import { useAllEvaluations } from '../hooks/useAllEvaluations';
import { useGroupsData } from '../../groups/hooks/useGroupsData';
import { useNoteTypes } from '../hooks/useGrades';
import { supabase, getCurrentUser } from '../../../lib/database';
import clsx from 'clsx';
import StudentGradeEntryModal from './StudentGradeEntryModal';

interface GradesByStudentTableProps {
    selectedBranches: string[];
    setSelectedBranches: (v: string[]) => void;
    selectedGroups: string[];
    setSelectedGroups: (v: string[]) => void;
    selectedPeriodes: string[];
    setSelectedPeriodes: (v: string[]) => void;
    onResetFilters: () => void;
}

const GradeCell = React.memo(({ 
    studentId, 
    evaluation, 
    col,
    resultsDataIndexed,
    getScoreStyle,
    onDoubleClick
}: { 
    studentId: string, 
    evaluation: any, 
    col: any,
    resultsDataIndexed: any,
    getScoreStyle: (score: number | null, max: number, typeNoteId?: string | null) => { colorClass: string, letter: string | null },
    onDoubleClick?: (ev: any) => void
}) => {
    const score = useMemo(() => {
        if (!resultsDataIndexed) return null;
        
        if (col.questions.length === 1 && !col.id.includes('regroupement')) {
            const qr = resultsDataIndexed.questionResultsMap.get(`${studentId}_${col.questions[0].id}`);
            return qr?.note != null ? parseFloat(qr.note.toString()) : null;
        }

        // Regroupement
        let sum = 0;
        let found = false;
        col.questions.forEach((q: any) => {
            const qr = resultsDataIndexed.questionResultsMap.get(`${studentId}_${q.id}`);
            if (qr?.note != null) {
                sum += parseFloat(qr.note.toString()) * (q.ratio || 1);
                found = true;
            }
        });
        return found ? sum : null;
    }, [studentId, col, resultsDataIndexed]);

    const { colorClass, letter } = getScoreStyle(score, col.maxPoints, evaluation.type_note_id);

    return (
        <td 
            className="p-0 min-w-[65px] h-10 text-center border-b border-white/10 border-r border-white/10 relative bg-surface/30 cursor-pointer hover:bg-white/5 transition-colors"
            onDoubleClick={() => onDoubleClick?.(evaluation)}
        >
            <div className="flex flex-col items-center justify-center">
                <span className={clsx("text-sm font-black tabular-nums", colorClass)}>
                    {score !== null ? (Number.isInteger(score) ? score : score.toFixed(1)) : '—'}
                </span>
                {letter && <span className={clsx("text-[9px] font-black uppercase tracking-tighter opacity-70", colorClass)}>{letter}</span>}
            </div>
        </td>
    );
});

const StudentGradeRow = React.memo(({ 
    student, 
    evaluations, 
    evaluationColumnsMap, 
    scoreMap, 
    resultsDataIndexed, 
    isDetailedView, 
    isLast,
    getScoreStyle,
    onGradeDoubleClick,
    onStudentClick
}: {
    student: any,
    evaluations: any[],
    evaluationColumnsMap: Map<string, any[]>,
    scoreMap: Record<string, Record<string, number | null>>,
    resultsDataIndexed: any,
    isDetailedView: boolean,
    isLast: boolean,
    getScoreStyle: any,
    onGradeDoubleClick: (student: any, evaluation: any) => void,
    onStudentClick: (student: any) => void
}) => {
    return (
        <tr className={clsx("hover:bg-white/[0.02] transition-colors group", isLast ? "" : "border-b border-white/10")}>
            <td className="sticky left-0 z-20 bg-background p-4 min-w-[240px] border-r border-white/10 group-hover:bg-white/[0.05] transition-colors">
                <div 
                    className="flex items-center gap-3 cursor-pointer group/student pr-6"
                    onClick={() => onStudentClick(student)}
                >
                    <Avatar 
                        src={student.photo_url} 
                        alt={`${student.prenom} ${student.nom}`}
                        className="w-8 h-8 rounded-full border border-white/10 ring-2 ring-transparent group-hover/student:ring-primary/50 transition-all shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-white truncate leading-tight group-hover/student:text-primary transition-colors">
                            {student.prenom} {student.nom}
                        </span>
                        {student.Niveau && (
                            <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest mt-0.5">
                                {student.Niveau.nom}
                            </span>
                        )}
                    </div>
                </div>
            </td>

            {evaluations.map(ev => {
                const total = scoreMap[student.id]?.[ev.id] ?? null;
                const { colorClass, letter } = getScoreStyle(total, ev.note_max, ev.type_note_id);
                
                if (!isDetailedView) {
                    return (
                        <td 
                            key={ev.id} 
                            className="p-0 min-w-[120px] h-10 text-center border-b border-white/10 border-r border-primary/50 border-l border-primary/50 bg-primary/5 relative cursor-pointer hover:bg-primary/10 transition-colors"
                            onDoubleClick={() => onGradeDoubleClick(student, ev)}
                        >
                            <div className="flex flex-col items-center justify-center">
                                <span className={clsx("text-base font-black tabular-nums transition-transform group-hover:scale-110", colorClass)}>
                                    {total !== null ? total : '—'}
                                </span>
                                {letter && <span className={clsx("text-[10px] font-black uppercase", colorClass)}>{letter}</span>}
                            </div>
                        </td>
                    );
                }
TRUNCATED
TRUNCATED
TRUNCATED
TRUNCATED
TRUNCATED
TRUNCATED
                const evColumns = evaluationColumnsMap.get(ev.id) || [];
                return (
                    <React.Fragment key={ev.id}>
                        {evColumns.map(col => (
                            <GradeCell 
                                key={col.id}
                                studentId={student.id}
                                evaluation={ev}
                                col={col}
                                resultsDataIndexed={resultsDataIndexed}
                                getScoreStyle={getScoreStyle}
                                onDoubleClick={() => onGradeDoubleClick(student, ev)}
                            />
                        ))}
                        <td 
                            className="p-0 min-w-[85px] h-10 text-center border-b border-white/10 border-r border-primary/50 border-l border-primary/50 bg-primary/10 relative cursor-pointer hover:bg-primary/20 transition-colors"
                            onDoubleClick={() => onGradeDoubleClick(student, ev)}
                        >
                            <div className="flex flex-col items-center justify-center">
                                <span className={clsx("text-base font-black tabular-nums", colorClass)}>
                                    {total !== null ? total : '—'}
                                </span>
                                {letter && <span className={clsx("text-[10px] font-black uppercase", colorClass)}>{letter}</span>}
                            </div>
                        </td>
                    </React.Fragment>
                );
            })}

            {/* Summary Columns */}
            <td className="sticky right-[198px] z-20 bg-background w-[80px] text-center border-l border-white/10 align-middle">
                <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[11px] font-black",
                    student._stats.missingCount > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                    {student._stats.missingCount}
                </span>
            </td>
            <td className="sticky right-[99px] z-20 bg-background w-[100px] text-center align-middle">
                <span className={clsx(
                    "text-sm font-black tabular-nums",
                    student._stats.completedCount === evaluations.length ? "text-emerald-500" : "text-primary"
                )}>
                    {student._stats.completedCount}
                </span>
            </td>
            <td className="sticky right-0 z-20 bg-background w-[100px] text-center border-r border-white/10 align-middle shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                <span className={clsx(
                    "text-sm font-black tabular-nums",
                    student._stats.simplePercentage >= 80 ? "text-emerald-500" :
                    student._stats.simplePercentage >= 50 ? "text-primary" : "text-rose-500"
                )}>
                    {student._stats.hasData ? `${Math.round(student._stats.simplePercentage)}%` : '—'}
                </span>
            </td>
        </tr>
    );
});

const StudentProgressHistogram = ({ 
    student, 
    evaluations, 
    scoreMap, 
    getScoreStyle 
}: { 
    student: any, 
    evaluations: any[], 
    scoreMap: Record<string, Record<string, number | null>>,
    getScoreStyle: any
}) => {
    const chartData = useMemo(() => {
        if (!student || !scoreMap[student.id]) return [];
        
        return evaluations
            .map(ev => {
                const score = scoreMap[student.id][ev.id];
                if (score === null || score === undefined) return null;
                
                const percentage = (score / (ev.note_max || 20)) * 100;
                const { colorClass } = getScoreStyle(score, ev.note_max, ev.type_note_id);
                
                // Convert text color class to background color class
                const bgClass = colorClass.replace('text-', 'bg-');
                
                return {
                    id: ev.id,
                    title: ev.titre,
                    date: ev.date_evaluation,
                    score,
                    max: ev.note_max,
                    percentage,
                    bgClass
                };
            })
            .filter(Boolean);
    }, [student, evaluations, scoreMap, getScoreStyle]);

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <BarChart3 size={48} className="text-grey-dark mb-4 opacity-20" />
                <p className="text-grey-medium font-medium">Aucune donnée d'évaluation pour cet élève.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 py-4">
            {/* Legend / Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-grey-medium block mb-1">Évaluations</span>
                    <span className="text-xl font-black text-white">{chartData.length}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-grey-medium block mb-1">Moyenne</span>
                    <span className="text-xl font-black text-primary">
                        {Math.round(chartData.reduce((acc, curr: any) => acc + curr.percentage, 0) / chartData.length)}%
                    </span>
                </div>
                {/* Add more stats if needed */}
            </div>

            {/* The Chart */}
            <div className="relative bg-white/[0.02] rounded-2xl border border-white/5 p-6 sm:p-8">
                <div className="flex items-end gap-2 sm:gap-4 h-[250px] min-w-full overflow-x-auto pb-12 custom-scrollbar scroll-smooth">
                    {chartData.map((item: any, idx) => (
                        <div 
                            key={item.id} 
                            className="flex-1 flex flex-col items-center group/bar min-w-[40px] max-w-[80px] h-full"
                        >
                            {/* Bar Container */}
                            <div className="relative w-full h-full flex flex-col justify-end items-center">
                                {/* Value on top */}
                                <div className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-all transform group-hover/bar:-translate-y-1 bg-surface-dark px-2 py-1 rounded-md border border-white/10 z-10 whitespace-nowrap shadow-xl">
                                    <span className={clsx("text-[10px] font-black", item.bgClass.replace('bg-', 'text-'))}>
                                        {item.score}/{item.max} ({Math.round(item.percentage)}%)
                                    </span>
                                </div>
                                
                                {/* The Bar */}
                                <div 
                                    className={clsx(
                                        "w-full rounded-t-lg transition-all duration-700 ease-out shadow-lg relative cursor-help",
                                        item.bgClass,
                                        "hover:brightness-125 hover:scale-x-105"
                                    )}
                                    style={{ 
                                        height: `${Math.max(item.percentage, 5)}%`,
                                        animationDelay: `${idx * 50}ms`,
                                        boxShadow: `0 0 20px -5px ${item.bgClass === 'bg-emerald-500' ? 'rgba(16,185,129,0.3)' : item.bgClass === 'bg-rose-500' ? 'rgba(239,68,68,0.3)' : 'rgba(217,185,129,0.3)'}`
                                    }}
                                >
                                    {/* Glass reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-lg opacity-50" />
                                </div>
                            </div>
                            
                            {/* Label */}
                            <div className="mt-4 text-center max-w-full">
                                <p className="text-[10px] font-black text-white truncate w-full" title={item.title}>
                                    {item.title}
                                </p>
                                <p className="text-[9px] font-bold text-grey-medium mt-0.5">
                                    {item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Y-Axis Guideline (80% and 50%) */}
                <div className="absolute left-0 right-0 top-[20%] border-t border-emerald-500/10 pointer-events-none" />
                <div className="absolute left-0 right-0 top-[50%] border-t border-primary/10 pointer-events-none" />
                <div className="absolute left-8 -right-2 top-[20%] pr-4 text-[8px] font-black text-emerald-500/30 uppercase tracking-widest hidden sm:block">Obj. 80%</div>
                <div className="absolute left-8 -right-2 top-[50%] pr-4 text-[8px] font-black text-primary/30 uppercase tracking-widest hidden sm:block">Obj. 50%</div>
            </div>

            <div className="flex items-center gap-4 bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Info size={20} />
                </div>
                <p className="text-xs text-grey-light font-medium leading-relaxed">
                    Ce graphique présente l'évolution des performances de <strong>{student.prenom}</strong> à travers ses différentes évaluations chronologiques. Passez la souris sur une barre pour voir le détail des points.
                </p>
            </div>
        </div>
    );
};

const GradesByStudentTable: React.FC<GradesByStudentTableProps> = ({
    selectedBranches,
    setSelectedBranches,
    selectedGroups,
    setSelectedGroups,
    selectedPeriodes,
    setSelectedPeriodes,
    onResetFilters
}) => {
    const [isDetailedView, setIsDetailedView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'missing' | 'weighted' | 'simple'; direction: 'asc' | 'desc' } | null>(null);

    // Modal state for quick encoding
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [editingEvaluation, setEditingEvaluation] = useState<any>(null);

    // Modal state for chart
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [selectedStudentForChart, setSelectedStudentForChart] = useState<any>(null);

    const handleGradeDoubleClick = useCallback((student: any, evaluation: any) => {
        setEditingStudent(student);
        setEditingEvaluation(evaluation);
        setIsEntryModalOpen(true);
    }, []);

    const handleStudentClick = useCallback((student: any) => {
        setSelectedStudentForChart(student);
        setIsChartModalOpen(true);
    }, []);

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Fetch all evaluations
    const { evaluations, loading: loadingEvals } = useAllEvaluations();

    // 2. Fetch all groups
    const { groups: availableGroups, loading: loadingGroups } = useGroupsData();

    // 2.5 Fetch note types (for color conversion)
    const { data: noteTypes = [] } = useNoteTypes(user?.id);

    // 3. Fetch students of selected groups
    const { data: studentData, isLoading: loadingStudents } = useQuery({
        queryKey: ['groups_students', selectedGroups, user?.id],
        queryFn: async () => {
            if (selectedGroups.length === 0 || !user?.id) return { ids: [], full: [] };
            const results = await trackingService.fetchStudentsInGroups(selectedGroups, user.id);
            // Tri par Niveau (nom) puis par Prénom
            results.full.sort((a, b) => {
                const levelA = a.Niveau?.nom || '';
                const levelB = b.Niveau?.nom || '';
                return levelA.localeCompare(levelB) || 
                       (a.prenom || '').localeCompare(b.prenom || '') || 
                       (a.nom || '').localeCompare(b.nom || '');
            });
            return results;
        },
        enabled: selectedGroups.length > 0 && !!user?.id
    });

    const students = studentData?.full || [];
    const studentIds = useMemo(() => students.map(s => s.id), [students]);

    // 4. Fetch all unique group IDs these students belong to
    const { data: relevantGroupIds = [] } = useQuery({
        queryKey: ['relevant_groups_for_students', studentIds],
        queryFn: async () => {
            if (studentIds.length === 0 || !user) return [];
            const { data } = await supabase
                .from('EleveGroupe')
                .select('groupe_id')
                .eq('user_id', user.id)
                .in('eleve_id', studentIds);
            return Array.from(new Set(data?.map(d => d.groupe_id).filter(Boolean) as string[] || []));
        },
        enabled: studentIds.length > 0 && !!user
    });

    const availableBranches = useMemo(() => {
        const branches = new Set<string>();
        evaluations.filter(ev => {
            if (selectedGroups.length === 0) return true;
            return relevantGroupIds.includes(ev.group_id as string);
        }).forEach(ev => {
            if (ev._brancheName && ev._brancheName !== '-') branches.add(ev._brancheName);
        });
        return Array.from(branches).sort();
    }, [evaluations, selectedGroups, relevantGroupIds]);

    const availablePeriodes = useMemo(() => {
        const periodes = new Set<string>();
        evaluations.filter(ev => {
            if (selectedGroups.length === 0) return true;
            return relevantGroupIds.includes(ev.group_id as string);
        }).forEach(ev => {
            periodes.add(ev.periode || "Sans période");
        });
        return Array.from(periodes).sort((a, b) => {
            if (a === "Sans période") return 1;
            if (b === "Sans période") return -1;
            return a.localeCompare(b);
        });
    }, [evaluations, selectedGroups, relevantGroupIds]);

    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(ev => {
            if (selectedGroups.length > 0 && !relevantGroupIds.includes(ev.group_id as string)) return false;
            if (selectedBranches.length > 0 && !selectedBranches.includes(ev._brancheName)) return false;
            if (selectedPeriodes.length > 0 && !selectedPeriodes.includes(ev.periode || "Sans période")) return false;
            return true;
        }).sort((a, b) => {
            // New sorting: Chronological, oldest to newest (left to right)
            const dateA = a.date_evaluation ? new Date(a.date_evaluation).getTime() : 0;
            const dateB = b.date_evaluation ? new Date(b.date_evaluation).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;
            return (a.titre || '').localeCompare(b.titre || '');
        });
    }, [evaluations, selectedGroups, relevantGroupIds, selectedBranches, selectedPeriodes]);


    const evalIds = useMemo(() => filteredEvaluations.map(e => e.id), [filteredEvaluations]);

    const { data: resultsData, isLoading: loadingResults } = useQuery({
        queryKey: ['cross_table_results', evalIds, selectedGroups, user?.id],
        queryFn: async () => {
            if (!user?.id || evalIds.length === 0) return { results: [], questionResults: [], questions: [], regroupements: [] };
            
            const [results, questionResults, questions, regroupements] = await Promise.all([
                gradeService.getResultsForEvaluations(evalIds, user.id),
                gradeService.getQuestionResultsForEvaluations(evalIds, user.id),
                gradeService.getQuestionsForEvaluations(evalIds, user.id),
                gradeService.getRegroupementsForEvaluations(evalIds, user.id)
            ]);

            return {
                results,
                questionResults,
                questions,
                regroupements
            };
        },
        enabled: selectedGroups.length > 0 && evalIds.length > 0 && !!user?.id
    });

    // --- OPTIMIZATION: Indexing results for O(1) lookup ---
    const resultsDataIndexed = useMemo(() => {
        if (!resultsData) return null;
        
        const resultsMap = new Map<string, any>();
        resultsData.results.forEach(r => {
            resultsMap.set(`${r.eleve_id}_${r.evaluation_id}`, r);
        });

        const questionResultsMap = new Map<string, any>();
        resultsData.questionResults.forEach(qr => {
            questionResultsMap.set(`${qr.eleve_id}_${qr.question_id}`, qr);
        });

        const questionsByEval = new Map<string, any[]>();
        resultsData.questions.forEach(q => {
            if (!questionsByEval.has(q.evaluation_id)) questionsByEval.set(q.evaluation_id, []);
            questionsByEval.get(q.evaluation_id)!.push(q);
        });

        return {
            ...resultsData,
            resultsMap,
            questionResultsMap,
            questionsByEval
        };
    }, [resultsData]);

    const searchedStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(s =>
            `${s.prenom} ${s.nom}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [students, searchQuery]);

    const evaluationColumnsMap = useMemo(() => {
        if (!resultsData) return new Map<string, any[]>();
        
        const map = new Map<string, any[]>();
        filteredEvaluations.forEach(ev => {
            const evQuestions = resultsData.questions
                .filter(q => q.evaluation_id === ev.id)
                .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
                
            const evRegroupements = resultsData.regroupements
                ? resultsData.regroupements
                    .filter(r => r.evaluation_id === ev.id)
                    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
                : [];

            let cols: any[] = [];
            if (evRegroupements.length === 0) {
                cols = evQuestions.map(q => ({
                    id: q.id,
                    titre: q.titre,
                    questions: [q],
                    maxPoints: (q.note_max || 0) * (q.ratio || 1)
                }));
            } else {
                const questionsByNumber = new Map<number, any>();
                evQuestions.forEach((q, idx) => questionsByNumber.set(idx + 1, q));

                const assignedQuestionIds = new Set<string>();
                
                evRegroupements.forEach(r => {
                    const groupingQuestions = (r.elements || [])
                        .map((num: number) => questionsByNumber.get(num))
                        .filter(Boolean);
                        
                    groupingQuestions.forEach((q: any) => assignedQuestionIds.add(q.id));
                    
                    cols.push({
                        id: r.id,
                        titre: r.titre,
                        questions: groupingQuestions,
                        maxPoints: groupingQuestions.reduce((acc: number, q: any) => acc + (q.note_max || 0) * (q.ratio || 1), 0)
                    });
                });

                evQuestions.forEach(q => {
                    if (!assignedQuestionIds.has(q.id)) {
                        cols.push({
                            id: q.id,
                            titre: q.titre,
                            questions: [q],
                            maxPoints: (q.note_max || 0) * (q.ratio || 1)
                        });
                    }
                });
            }
            map.set(ev.id, cols);
        });
        return map;
    }, [resultsData, filteredEvaluations]);

    const getEvaluationColumns = useCallback((evId: string) => {
        return evaluationColumnsMap.get(evId) || [];
    }, [evaluationColumnsMap]);

    const calculateTotalOptimized = useCallback((studentId: string, evaluation: any, evalQuestions: any[], resultsMap: Map<string, any>, qResultsMap: Map<string, any>) => {
        const studentResult = resultsMap.get(`${studentId}_${evaluation.id}`);
        
        if (evalQuestions.length > 0) {
            const isExplicitlyAbsent = studentResult && studentResult.statut !== 'present';
            if (isExplicitlyAbsent) return null;

            let weightedSum = 0;
            let maxWeightedSum = 0;
            let noteFound = false;

            for (const q of evalQuestions) {
                const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
                const qMax = parseFloat(q.note_max.toString());
                maxWeightedSum += qMax * ratio;

                const qr = qResultsMap.get(`${studentId}_${q.id}`);
                if (qr && qr.note !== null) {
                    weightedSum += parseFloat(qr.note.toString()) * ratio;
                    noteFound = true;
                }
            }

            if (!noteFound || maxWeightedSum === 0) {
                // Check if explicitly present even without notes
                if (studentResult?.statut === 'present') return 0;
                return null;
            }
            
            const evalMax = parseFloat(evaluation.note_max?.toString() || '20');
            return parseFloat(((weightedSum / maxWeightedSum) * evalMax).toFixed(2));
        }

        if (!studentResult || studentResult.statut !== 'present') return null;
        return studentResult.note !== null ? parseFloat(studentResult.note.toString()) : null;
    }, []);

    const processedData = useMemo(() => {
        if (!resultsDataIndexed) return { students: [], scoreMap: {} };

        const scoreMap: Record<string, Record<string, number | null>> = {};
        
        const studentsProcessed = searchedStudents.map(student => {
            scoreMap[student.id] = {};
            
            const scores = filteredEvaluations.map(ev => {
                const evQs = resultsDataIndexed.questionsByEval.get(ev.id) || [];
                const total = calculateTotalOptimized(student.id, ev, evQs, resultsDataIndexed.resultsMap, resultsDataIndexed.questionResultsMap);
                
                scoreMap[student.id][ev.id] = total;
                const max = ev.note_max || 20;
                const pct = (total !== null && total !== undefined) ? (total / max) * 100 : null;
                return { obtained: total, max, pct };
            });

            const completed = scores.filter(s => s.obtained !== null && s.obtained !== undefined);
            const missingCount = scores.length - completed.length;

            let weightedPercentage = 0;
            if (completed.length > 0) {
                const totalObtained = completed.reduce((sum, s) => sum + (s.obtained as number), 0);
                const totalMax = completed.reduce((sum, s) => sum + s.max, 0);
                weightedPercentage = (totalObtained / totalMax) * 100;
            }

            let simplePercentage = 0;
            if (completed.length > 0) {
                const sumPcts = completed.reduce((sum, s) => sum + (s.pct as number), 0);
                simplePercentage = sumPcts / completed.length;
            }

            return {
                ...student,
                _stats: {
                    missingCount,
                    completedCount: completed.length,
                    weightedPercentage,
                    simplePercentage,
                    hasData: completed.length > 0
                }
            };
        });

        return { students: studentsProcessed, scoreMap };
    }, [searchedStudents, filteredEvaluations, resultsDataIndexed, calculateTotalOptimized]);

    const { sortedStudents, scoreMap } = useMemo(() => {
        const { students: pStudents, scoreMap: pScoreMap } = processedData;
        if (!sortConfig) return { sortedStudents: pStudents, scoreMap: pScoreMap };

        const { key, direction } = sortConfig;
        const dir = direction === 'asc' ? 1 : -1;

        const sorted = [...pStudents].sort((a, b) => {
            let valA: any;
            let valB: any;

            switch (key) {
                case 'name':
                    valA = `${a.Niveau?.nom || ''} ${a.prenom} ${a.nom}`.toLowerCase();
                    valB = `${b.Niveau?.nom || ''} ${b.prenom} ${b.nom}`.toLowerCase();
                    return valA.localeCompare(valB) * dir;
                case 'missing':
                    valA = a._stats.missingCount;
                    valB = b._stats.missingCount;
                    break;
                case 'weighted':
                    valA = a._stats.completedCount;
                    valB = b._stats.completedCount;
                    break;
                case 'simple':
                    valA = a._stats.hasData ? a._stats.simplePercentage : -1;
                    valB = b._stats.hasData ? b._stats.simplePercentage : -1;
                    break;
                default:
                    return 0;
            }

            if (valA === valB) return 0;
            return (valA > valB ? 1 : -1) * dir;
        });

        return { sortedStudents: sorted, scoreMap: pScoreMap };
    }, [processedData, sortConfig]);

    const handleSort = (key: 'name' | 'missing' | 'weighted' | 'simple') => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            // Defaults based on user request
            if (key === 'missing') return { key, direction: 'desc' };
            if (key === 'name') return { key, direction: 'asc' };
            return { key, direction: 'asc' };
        });
    };

    const SortIndicator = ({ column }: { column: 'name' | 'missing' | 'weighted' | 'simple' }) => {
        if (sortConfig?.key !== column) return null;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={12} className="ml-1 text-primary" /> 
            : <ArrowDown size={12} className="ml-1 text-primary" />;
    };

    const getScoreStyle = useCallback((score: number | null, max: number, typeNoteId?: string | null) => {
        if (score === null) return { colorClass: 'text-grey-dark', letter: null };

        const noteType = noteTypes.find(nt => nt.id === typeNoteId);
        const palier = gradeService.getConversionPalier(score, max || 20, noteType);

        const colorMap: Record<string, string> = {
            emerald: 'text-emerald-500',
            blue: 'text-blue-500',
            amber: 'text-primary',
            rose: 'text-rose-500',
            purple: 'text-purple-500',
            grey: 'text-grey-medium'
        };

        if (palier && palier.color) {
            return {
                colorClass: colorMap[palier.color] || 'text-primary',
                letter: palier.letter
            };
        }

        // Fallback: percentage-based
        const pct = (score / (max || 20)) * 100;
        if (pct >= 80) return { colorClass: 'text-emerald-500', letter: null };
        if (pct >= 50) return { colorClass: 'text-primary', letter: null };
        return { colorClass: 'text-rose-500', letter: null };
    }, [noteTypes]);

    if (loadingEvals || loadingGroups) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-grey-medium font-bold uppercase tracking-widest text-xs">Analyse des données...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface rounded-2xl border border-white/5 p-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-text-main uppercase">Suivi par Élève</h2>
                        <p className="text-xs font-medium text-grey-medium uppercase tracking-widest mt-0.5">
                            Visualisez la progression globale de votre classe
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* View Toggle */}
                    <Tabs
                        tabs={[
                            { id: 'global', label: 'Global' },
                            { id: 'details', label: 'Détails' }
                        ]}
                        activeTab={isDetailedView ? 'details' : 'global'}
                        onChange={(id) => setIsDetailedView(id === 'details')}
                        variant="capsule"
                        level={3}
                    />

                    {/* Group Selector */}
                    <MultiFilterSelect
                        label="Groupe"
                        options={availableGroups.map(g => g.nom)}
                        selectedValues={availableGroups.filter(g => selectedGroups.includes(g.id)).map(g => g.nom)}
                        onChange={(names) => {
                            const ids = availableGroups.filter(g => names.includes(g.nom)).map(g => g.id);
                            setSelectedGroups(ids);
                        }}
                    />

                    {/* Branch Filter */}
                    <MultiFilterSelect
                        label="Branche"
                        options={availableBranches}
                        selectedValues={selectedBranches}
                        onChange={setSelectedBranches}
                    />

                    {/* Periode Filter */}
                    <MultiFilterSelect
                        label="Période"
                        options={availablePeriodes}
                        selectedValues={selectedPeriodes}
                        onChange={setSelectedPeriodes}
                    />

                    {/* Reset Button */}
                    {(selectedGroups.length > 0 || selectedBranches.length > 0 || selectedPeriodes.length > 0) && (
                        <button
                            onClick={onResetFilters}
                            className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-primary/20 transition-all group"
                        >
                            <X size={14} className="group-hover:rotate-90 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Réinitialiser</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {selectedGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-surface rounded-3xl border border-dashed border-border/20">
                    <div className="p-6 rounded-full bg-grey-light/10 text-grey-light mb-2">
                        <Users size={48} strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Sélectionnez un ou plusieurs groupes</h3>
                    <p className="max-w-xs text-grey-medium text-sm">
                        Utilisez le filtre ci-dessus pour afficher le tableau de suivi des classes sélectionnées.
                    </p>
                </div>
            ) : loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-grey-medium font-bold uppercase tracking-widest text-[10px]">Chargement des élèves...</p>
                </div>
            ) : students.length === 0 ? (
                <div className="p-12 text-center text-grey-medium italic bg-surface rounded-3xl border border-white/5">
                    Aucun élève trouvé dans ce groupe.
                </div>
            ) : (
                <CardInfo className="flex-1 overflow-hidden flex flex-col p-0">
                    {/* Table Container */}
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-max text-left border-collapse text-sm table-auto">
                            <thead className="sticky top-0 z-20 bg-surface shadow-sm">
                                {/* Row 1: Evaluation group titles (detailed view only) */}
                                <tr className="border-b border-white/10">
                                    <th className="sticky left-0 top-0 z-40 bg-background border-t border-l border-r border-white/10 h-16 min-w-[240px]" />
                                    {filteredEvaluations.length > 0 ? filteredEvaluations.map(ev => {
                                        const evColumns = getEvaluationColumns(ev.id);
                                        const colSpan = isDetailedView ? evColumns.length + 1 : 1;
                                        // Dynamic width calculation based on columns below
                                        // Column (Question/Grouping) = 65px (fixed), Total = 85px, Global = 120px
                                        const titleMaxWidth = isDetailedView 
                                            ? (evColumns.length * 65 + 85) 
                                            : 120;
                                            
                                        return (
                                                <th
                                                    key={`header-group-${ev.id}`}
                                                    colSpan={colSpan}
                                                    className="p-2 border-t border-r border-white/10 align-middle"
                                                >
                                                <div
                                                    className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] font-black text-primary uppercase tracking-widest whitespace-normal leading-tight mx-auto text-center break-words flex flex-col items-center justify-center min-h-[40px]"
                                                    style={{ width: `${titleMaxWidth}px`, minWidth: 'min-content' }}
                                                    title={`${ev.titre} (${ev._brancheName || '-'})`}
                                                >
                                                    <span className="block truncate w-full">{ev.titre}</span>
                                                    {!isDetailedView && ev.date_evaluation && (
                                                        <span className="text-[8px] text-grey-medium font-medium mt-0.5">
                                                            {new Date(ev.date_evaluation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    }) : (
                                        <th className="p-2 h-12" />
                                    )}
                                    {/* Spacer for summary columns */}
                                    <th className="sticky right-[198px] top-0 z-30 bg-background border-t border-b border-white/10 w-[80px]" />
                                    <th className="sticky right-[99px] top-0 z-30 bg-background border-t border-b border-white/10 w-[100px]" />
                                    <th className="sticky right-0 top-0 z-30 bg-background border-t border-b border-white/10 w-[100px]" />
                                </tr>

                                {/* Row 2: Column headers */}
                                <tr className="border-b border-white/10">
                                    <th 
                                        className={clsx(
                                            'sticky left-0 z-40 bg-background p-4 text-left min-w-[240px] border-t border-l border-r border-white/10 border-b border-white/10 h-10 cursor-pointer hover:bg-white/5 transition-colors group/sort',
                                            isDetailedView ? 'top-[64px]' : 'top-0'
                                        )}
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center">
                                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Élève</span>
                                            <SortIndicator column="name" />
                                        </div>
                                    </th>

                                    {filteredEvaluations.length > 0 ? filteredEvaluations.map(ev => {
                                        const formattedDate = ev.date_evaluation ? new Date(ev.date_evaluation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';
                                        
                                        if (!isDetailedView) {
                                            return (
                                                <th key={ev.id} className="p-0 text-[10px] font-black text-primary uppercase tracking-widest border-b border-white/10 border-t border-primary/50 border-l border-primary/50 border-r border-primary/50 min-w-[120px] text-center align-middle px-2 h-16 bg-primary/5">
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                        <span className="text-text-main truncate max-w-[110px]" title={ev.titre}>{ev.titre}</span>
                                                        <span className="text-primary/70 font-bold">{formattedDate}</span>
                                                    </div>
                                                </th>
                                            );
                                        }
                                        const evColumns = getEvaluationColumns(ev.id);
                                        return (
                                            <React.Fragment key={`questions-${ev.id}`}>
                                                {evColumns.map(col => {
                                                    const isGold = col.titre.toUpperCase() === 'TOTAL';
                                                    return (
                                                        <th 
                                                            key={col.id} 
                                                            className={clsx(
                                                                "p-0 min-w-[65px] align-bottom pb-2 border-b border-white/10 border-r border-white/10 relative bg-surface group/col",
                                                                isGold && "border-t border-primary/50 border-l border-primary/50 border-r border-primary/50"
                                                            )}
                                                        >
                                                            <div className="flex flex-col items-center justify-end h-[140px] w-full px-1">
                                                                <span
                                                                    className={clsx(
                                                                        "text-[10px] font-medium uppercase tracking-wide leading-tight [writing-mode:vertical-rl] rotate-180 whitespace-normal mb-2 break-words text-left",
                                                                        isGold ? "text-primary" : "text-grey-medium"
                                                                    )}
                                                                    title={col.titre}
                                                                >
                                                                    {col.titre}
                                                                </span>
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                                <th className="p-0 text-[10px] font-black text-primary uppercase tracking-widest border-b border-white/10 min-w-[85px] text-center border-t border-primary/50 border-l border-primary/50 border-r border-primary/50 align-middle px-2 bg-primary/5 h-16">
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                        <span className="text-primary truncate max-w-[75px]" title={ev.titre}>TOTAL</span>
                                                        <span className="text-primary/70 font-bold">{formattedDate}</span>
                                                    </div>
                                                </th>

                                            </React.Fragment>
                                        );
                                    }) : (
                                        <th className="p-4 font-bold text-grey-medium italic border-b border-white/10">
                                            Aucune évaluation trouvée
                                        </th>
                                    )}

                                    <th className={clsx(
                                        "sticky right-[198px] z-30 p-2 w-[80px] bg-background border-t border-b border-white/10 border-l border-white/10 text-center align-middle cursor-pointer hover:bg-white/5 transition-colors group/sort",
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )} onClick={() => handleSort('missing')}>
                                        <div className="flex flex-col items-center justify-center relative">
                                            <span className="text-[9px] font-black uppercase text-rose-400 leading-tight">Tests</span>
                                            <span className="text-[9px] font-black uppercase text-rose-400 leading-tight">Manquants</span>
                                            <div className="absolute -right-1 top-1/2 -translate-y-1/2">
                                                <SortIndicator column="missing" />
                                            </div>
                                        </div>
                                    </th>
                                    <th className={clsx(
                                        "sticky right-[99px] z-30 p-2 w-[100px] bg-background border-t border-b border-white/10 text-center align-middle cursor-pointer hover:bg-white/5 transition-colors",
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )} onClick={() => handleSort('weighted')}>
                                        <div className="flex items-center justify-center">
                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-tight">ÉVALUATIONS<br />EFFECTUÉES</span>
                                            <SortIndicator column="weighted" />
                                        </div>
                                    </th>
                                    <th className={clsx(
                                        "sticky right-0 z-30 p-2 w-[100px] bg-background border-t border-b border-white/10 border-r border-white/10 text-center align-middle cursor-pointer hover:bg-white/5 transition-colors",
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )} onClick={() => handleSort('simple')}>
                                        <div className="flex items-center justify-center">
                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-tight">RESULTATS<br />SELON %</span>
                                            <SortIndicator column="simple" />
                                        </div>
                                    </th>
                                </tr>

                                {/* Row 3: Max Points */}
                                <tr className="border-b border-white/10 bg-surface">
                                    <th className={clsx(
                                        "sticky left-0 z-40 bg-background px-4 py-2 text-left min-w-[240px] border-r border-white/10 border-b border-white/10 h-8",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )}>
                                        <span className="text-[9px] font-black uppercase text-grey-medium tracking-widest">Points Max</span>
                                    </th>

                                    {filteredEvaluations.length > 0 ? filteredEvaluations.map(ev => {
                                        if (!isDetailedView) {
                                            return (
                                                <th key={`max-ev-${ev.id}`} className="p-0 text-[10px] font-black text-grey-medium/60 uppercase border-b border-white/10 min-w-[120px] text-center border-r border-primary/50 border-l border-primary/50 align-middle px-2 h-8 bg-primary/5">
                                                    / {ev.note_max}
                                                </th>
                                            );
                                        }
                                        const evColumns = getEvaluationColumns(ev.id);
                                        return (
                                            <React.Fragment key={`max-cols-${ev.id}`}>
                                                {evColumns.map(col => (
                                                    <th key={`max-${col.id}`} className="p-0 min-w-[65px] h-8 text-center border-b border-white/10 border-r border-white/10 relative bg-surface/50">
                                                        <span className="text-[10px] font-black text-grey-medium/60 uppercase">
                                                            / {Number.isInteger(col.maxPoints) ? col.maxPoints : col.maxPoints.toFixed(1)}
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className="p-0 text-[10px] font-black text-grey-medium uppercase border-b border-white/10 min-w-[85px] text-center border-r border-primary/50 border-l border-primary/50 align-middle px-2 h-8 bg-primary/5">
                                                    / {ev.note_max}
                                                </th>
                                            </React.Fragment>
                                        );
                                    }) : null}

                                    {/* Summary Maxes */}
                                    <th className={clsx(
                                        "sticky right-[198px] z-30 p-2 w-[80px] bg-background border-b border-white/10 border-l border-white/10 text-center align-middle h-8",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )} />
                                    <th className={clsx(
                                        "sticky right-[99px] z-30 p-2 w-[100px] bg-background border-b border-white/10 text-center align-middle h-8 uppercase text-[10px] font-black text-grey-medium/60",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )}>
                                        {filteredEvaluations.length}
                                    </th>
                                    <th className={clsx(
                                        "sticky right-0 z-30 p-2 w-[100px] bg-background border-b border-white/10 text-center align-middle h-8 uppercase text-[10px] font-black text-grey-medium/60",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )}>
                                        100%
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/10 transition-all">
                                {sortedStudents.map((student, idx) => {
                                    const prevStudent = idx > 0 ? sortedStudents[idx - 1] : null;
                                    const showSeparator = idx === 0 || (prevStudent && student.Niveau?.id !== prevStudent.Niveau?.id);
                                    
                                    return (
                                        <React.Fragment key={student.id}>
                                            {showSeparator && (
                                                <tr className="bg-primary/5">
                                                    <td colSpan={100} className="sticky left-0 z-10 p-0 border-y border-primary/20">
                                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10">
                                                            <div className="w-1.5 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(255,179,0,0.5)]" />
                                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                                                {student.Niveau?.nom || 'Sans Niveau'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <StudentGradeRow
                                                student={student}
                                                evaluations={filteredEvaluations}
                                                evaluationColumnsMap={evaluationColumnsMap}
                                                scoreMap={scoreMap}
                                                resultsDataIndexed={resultsDataIndexed}
                                                isDetailedView={isDetailedView}
                                                isLast={idx === sortedStudents.length - 1}
                                                getScoreStyle={getScoreStyle}
                                                onGradeDoubleClick={handleGradeDoubleClick}
                                                onStudentClick={handleStudentClick}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer tip */}
                    <div className="bg-primary/5 p-3 px-6 flex items-center gap-2 border-t border-white/5">
                        <Info size={14} className="text-primary" />
                        <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">
                            Astuce : Cliquez sur la photo d'un élève pour voir son graphique de progression. Double-cliquez sur une note pour l'éditer.
                        </span>
                    </div>
                </CardInfo>
            )}

            {/* Quick Grade Entry Modal */}
            {isEntryModalOpen && editingStudent && editingEvaluation && resultsDataIndexed && (
                <StudentGradeEntryModal
                    isOpen={isEntryModalOpen}
                    onClose={() => {
                        setIsEntryModalOpen(false);
                        setEditingStudent(null);
                        setEditingEvaluation(null);
                    }}
                    student={editingStudent}
                    evaluation={editingEvaluation}
                    questions={resultsDataIndexed.questionsByEval.get(editingEvaluation.id) || []}
                    currentResult={resultsDataIndexed.resultsMap.get(`${editingStudent.id}_${editingEvaluation.id}`)}
                    questionResults={resultsDataIndexed.questionResults.filter((qr: any) => 
                        qr.eleve_id === editingStudent.id && 
                        (resultsDataIndexed.questionsByEval.get(editingEvaluation.id) || []).some((q: any) => q.id === qr.question_id)
                    )}
                    noteTypes={noteTypes}
                    getConversionPalier={gradeService.getConversionPalier}
                />
            )}

            {/* Student Progress Chart Modal */}
            <BaseModal
                isOpen={isChartModalOpen}
                onClose={() => setIsChartModalOpen(false)}
                title={selectedStudentForChart ? `Progression : ${selectedStudentForChart.prenom} ${selectedStudentForChart.nom}` : "Progression de l'élève"}
                icon={BarChart3}
                size="lg"
            >
                {selectedStudentForChart && (
                    <StudentProgressHistogram 
                        student={selectedStudentForChart}
                        evaluations={filteredEvaluations}
                        scoreMap={scoreMap}
                        getScoreStyle={getScoreStyle}
                    />
                )}
            </BaseModal>
        </div>
    );
};

export default GradesByStudentTable;
