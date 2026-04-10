import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradeService } from '../services';
import { trackingService } from '../../tracking/services/trackingService';
import { Loader2, Users, X, Info } from 'lucide-react';
import { Avatar, CardInfo } from '../../../core';
import { useAllEvaluations } from '../hooks/useAllEvaluations';
import { useGroupsData } from '../../groups/hooks/useGroupsData';
import { useNoteTypes } from '../hooks/useGrades';
import { supabase } from '../../../lib/database';
import clsx from 'clsx';

const GradesByStudentTable: React.FC = () => {
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isDetailedView, setIsDetailedView] = useState(false);
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [periodeFilter, setPeriodeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // 1. Fetch all evaluations
    const { evaluations, loading: loadingEvals } = useAllEvaluations();

    // 2. Fetch all groups
    const { groups: availableGroups, loading: loadingGroups } = useGroupsData();

    // 2.5 Fetch note types (for color conversion)
    const { data: noteTypes = [] } = useNoteTypes();

    // 3. Fetch students of selected group
    const { data: studentData, isLoading: loadingStudents } = useQuery({
        queryKey: ['group_students', selectedGroupId],
        queryFn: async () => {
            if (!selectedGroupId) return { ids: [], full: [] };
            const results = await trackingService.fetchStudentsInGroup(selectedGroupId);
            results.full.sort((a, b) => (a.prenom || '').localeCompare(b.prenom || '') || (a.nom || '').localeCompare(b.nom || ''));
            return results;
        },
        enabled: !!selectedGroupId
    });

    const students = studentData?.full || [];
    const studentIds = useMemo(() => students.map(s => s.id), [students]);

    // 4. Fetch all unique group IDs these students belong to
    const { data: relevantGroupIds = [] } = useQuery({
        queryKey: ['relevant_groups_for_students', studentIds],
        queryFn: async () => {
            if (studentIds.length === 0) return [];
            const { data } = await supabase
                .from('EleveGroupe')
                .select('groupe_id')
                .in('eleve_id', studentIds);
            return Array.from(new Set(data?.map(d => d.groupe_id).filter(Boolean) as string[] || []));
        },
        enabled: studentIds.length > 0
    });

    const availableBranches = useMemo(() => {
        const branches = new Set<string>();
        evaluations.filter(ev => {
            if (!selectedGroupId) return true;
            return relevantGroupIds.includes(ev.group_id as string);
        }).forEach(ev => {
            if (ev._brancheName && ev._brancheName !== '-') branches.add(ev._brancheName);
        });
        return Array.from(branches).sort();
    }, [evaluations, selectedGroupId, relevantGroupIds]);

    const availablePeriodes = useMemo(() => {
        const periodes = new Set<string>();
        evaluations.filter(ev => {
            if (!selectedGroupId) return true;
            return relevantGroupIds.includes(ev.group_id as string);
        }).forEach(ev => {
            if (ev.periode) periodes.add(ev.periode);
        });
        return Array.from(periodes).sort();
    }, [evaluations, selectedGroupId, relevantGroupIds]);

    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(ev => {
            if (selectedGroupId && !relevantGroupIds.includes(ev.group_id as string)) return false;
            if (branchFilter !== 'all' && ev._brancheName !== branchFilter) return false;
            if (periodeFilter !== 'all' && ev.periode !== periodeFilter) return false;
            return true;
        }).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    }, [evaluations, selectedGroupId, relevantGroupIds, branchFilter, periodeFilter]);

    const evalIds = useMemo(() => filteredEvaluations.map(e => e.id), [filteredEvaluations]);

    const { data: resultsData, isLoading: loadingResults } = useQuery({
        queryKey: ['cross_table_results', evalIds, selectedGroupId],
        queryFn: async () => {
            const [results, questionResults, questions, regroupements] = await Promise.all([
                gradeService.getResultsForEvaluations(evalIds),
                supabase.from('ResultatQuestion').select('*, EvaluationQuestion!inner(evaluation_id)').in('EvaluationQuestion.evaluation_id', evalIds),
                supabase.from('EvaluationQuestion').select('*').in('evaluation_id', evalIds),
                supabase.from('EvaluationRegroupement').select('*').in('evaluation_id', evalIds)
            ]);
            return {
                results,
                questionResults: (questionResults.data as any[]) || [],
                questions: (questions.data as any[]) || [],
                regroupements: (regroupements.data as any[]) || []
            };
        },
        enabled: !!selectedGroupId && evalIds.length > 0
    });

    const scoreMap = useMemo(() => {
        if (!resultsData) return {};
        const map: Record<string, Record<string, number | null>> = {};
        students.forEach(student => {
            map[student.id] = {};
            filteredEvaluations.forEach(ev => {
                const evQs = resultsData.questions.filter(q => q.evaluation_id === ev.id);
                const evResults = resultsData.results.filter(r => r.evaluation_id === ev.id);
                const evQR = resultsData.questionResults.filter(qr => qr.EvaluationQuestion?.evaluation_id === ev.id);
                const total = gradeService.calculateStudentTotal(student.id, ev, evQs, evResults, evQR);
                map[student.id][ev.id] = total;
            });
        });
        return map;
    }, [students, filteredEvaluations, resultsData]);

    const getEvaluationColumns = useCallback((evaluationId: string) => {
        if (!resultsData) return [];
        
        const evQuestions = resultsData.questions
            .filter(q => q.evaluation_id === evaluationId)
            .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
            
        const evRegroupements = resultsData.regroupements
            ? resultsData.regroupements
                .filter(r => r.evaluation_id === evaluationId)
                .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
            : [];

        if (evRegroupements.length === 0) {
            return evQuestions.map(q => ({
                id: q.id,
                titre: q.titre,
                questions: [q],
                maxPoints: (q.note_max || 0) * (q.ratio || 1)
            }));
        }

        const questionsByNumber = new Map<number, any>();
        evQuestions.forEach((q, idx) => questionsByNumber.set(idx + 1, q));

        const assignedQuestionIds = new Set<string>();
        const columns: any[] = [];

        evRegroupements.forEach(r => {
            const groupingQuestions = (r.elements || [])
                .map((num: number) => questionsByNumber.get(num))
                .filter(Boolean);
                
            groupingQuestions.forEach((q: any) => assignedQuestionIds.add(q.id));
            
            columns.push({
                id: r.id,
                titre: r.titre,
                questions: groupingQuestions,
                maxPoints: groupingQuestions.reduce((acc: number, q: any) => acc + (q.note_max || 0) * (q.ratio || 1), 0)
            });
        });

        evQuestions.forEach(q => {
            if (!assignedQuestionIds.has(q.id)) {
                columns.push({
                    id: q.id,
                    titre: q.titre,
                    questions: [q],
                    maxPoints: (q.note_max || 0) * (q.ratio || 1)
                });
            }
        });

        return columns;
    }, [resultsData]);



    const searchedStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(s =>
            `${s.prenom} ${s.nom}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [students, searchQuery]);

    const getScoreStyle = (score: number | null, max: number, typeNoteId?: string | null) => {
        if (score === null) return { colorClass: 'text-grey-dark', letter: null };

        const noteType = noteTypes.find(nt => nt.id === typeNoteId);
        const palier = gradeService.getConversionPalier(score, max || 20, noteType);

        const colorMap: Record<string, string> = {
            emerald: 'text-emerald-500',
            blue: 'text-blue-500',
            amber: 'text-amber-500',
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
    };

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
                    <div className="flex items-center gap-2 bg-grey-dark/50 p-1 rounded-xl border border-white/5 mr-2">
                        <button
                            onClick={() => setIsDetailedView(false)}
                            className={clsx(
                                'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                                !isDetailedView ? 'bg-primary text-black' : 'text-grey-medium hover:text-white'
                            )}
                        >
                            Global
                        </button>
                        <button
                            onClick={() => setIsDetailedView(true)}
                            className={clsx(
                                'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                                isDetailedView ? 'bg-primary text-black' : 'text-grey-medium hover:text-white'
                            )}
                        >
                            Détails
                        </button>
                    </div>

                    {/* Group Selector */}
                    <div className="flex items-center gap-2 bg-grey-dark/50 p-1 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-grey-medium uppercase px-2">Groupe</span>
                        <select
                            className="bg-transparent text-sm text-text-main font-bold focus:outline-none min-w-[120px] cursor-pointer"
                            value={selectedGroupId || ''}
                            onChange={(e) => setSelectedGroupId(e.target.value || null)}
                        >
                            <option value="">Choisir...</option>
                            {availableGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.nom}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branch Filter */}
                    {selectedGroupId && (
                        <div className="flex items-center gap-2 bg-grey-dark/50 p-1 rounded-xl border border-white/5">
                            <span className="text-[10px] font-bold text-grey-medium uppercase px-2">Branche</span>
                            <select
                                className="bg-transparent text-sm text-text-main focus:outline-none min-w-[120px] cursor-pointer"
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                            >
                                <option value="all">Toutes</option>
                                {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Periode Filter */}
                    {selectedGroupId && (
                        <div className="flex items-center gap-2 bg-grey-dark/50 p-1 rounded-xl border border-white/5">
                            <span className="text-[10px] font-bold text-grey-medium uppercase px-2">Période</span>
                            <select
                                className="bg-transparent text-sm text-text-main focus:outline-none min-w-[120px] cursor-pointer"
                                value={periodeFilter}
                                onChange={(e) => setPeriodeFilter(e.target.value)}
                            >
                                <option value="all">Toutes</option>
                                {availablePeriodes.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            {!selectedGroupId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-surface rounded-3xl border border-dashed border-border/20">
                    <div className="p-6 rounded-full bg-grey-light/10 text-grey-light mb-2">
                        <Users size={48} strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Sélectionnez un groupe</h3>
                    <p className="max-w-xs text-grey-medium text-sm">
                        Choisissez un groupe dans la liste ci-dessus pour afficher le tableau de suivi.
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
                                    <th className="sticky left-0 top-0 z-40 bg-surface border-r border-white/10 h-16 min-w-[220px]" />
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
                                                className="p-2 border-r border-white/5 align-middle"
                                            >
                                                <div
                                                    className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] font-black text-primary uppercase tracking-widest whitespace-normal leading-tight mx-auto text-center break-words"
                                                    style={{ width: `${titleMaxWidth}px`, minWidth: 'min-content' }}
                                                    title={ev.titre}
                                                >
                                                    {ev.titre}
                                                </div>
                                            </th>
                                        );
                                    }) : (
                                        <th className="p-2 h-12" />
                                    )}
                                    {/* Spacer for summary columns */}
                                    <th className="sticky right-[198px] top-0 z-30 bg-surface border-b border-white/10 w-[80px]" />
                                    <th className="sticky right-[99px] top-0 z-30 bg-surface border-b border-white/10 w-[100px]" />
                                    <th className="sticky right-0 top-0 z-30 bg-surface border-b border-white/10 w-[100px]" />
                                </tr>

                                {/* Row 2: Column headers */}
                                <tr className="border-b border-white/10">
                                    <th className={clsx(
                                        'sticky left-0 z-40 bg-surface p-4 text-left min-w-[220px] border-r border-white/10 border-b border-white/10 h-10',
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )}>
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Élève</span>
                                    </th>

                                    {filteredEvaluations.length > 0 ? filteredEvaluations.map(ev => {
                                        if (!isDetailedView) {
                                            return (
                                                <th key={ev.id} className="p-0 text-[10px] font-black text-primary uppercase tracking-widest border-b border-white/10 min-w-[120px] text-center border-r border-white/10 align-middle px-2 h-10">
                                                    Résultat
                                                </th>
                                            );
                                        }
                                        const evColumns = getEvaluationColumns(ev.id);
                                        return (
                                            <React.Fragment key={`questions-${ev.id}`}>
                                                {evColumns.map(col => (
                                                    <th key={col.id} className="p-0 min-w-[65px] align-bottom pb-2 border-b border-white/10 border-r border-white/5 relative bg-surface group/col">
                                                        <div className="flex flex-col items-center justify-end h-[140px] w-full px-1">
                                                            <span
                                                                className="text-[10px] font-medium text-grey-medium uppercase tracking-wide leading-tight [writing-mode:vertical-rl] rotate-180 whitespace-normal mb-2 break-words text-left"
                                                                title={col.titre}
                                                            >
                                                                {col.titre}
                                                            </span>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="p-0 text-[10px] font-black text-primary uppercase tracking-widest border-b border-white/10 min-w-[85px] text-center border-r border-white/10 align-middle px-2">
                                                    Total
                                                </th>
                                            </React.Fragment>
                                        );
                                    }) : (
                                        <th className="p-4 font-bold text-grey-medium italic border-b border-white/10">
                                            Aucune évaluation trouvée
                                        </th>
                                    )}

                                    <th className={clsx(
                                        "sticky right-[198px] z-30 p-2 w-[80px] bg-surface border-b border-white/10 border-l border-white/10 text-center align-middle",
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )}>
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-[9px] font-black uppercase text-rose-400 leading-tight">Tests</span>
                                            <span className="text-[9px] font-black uppercase text-rose-400 leading-tight">Manquants</span>
                                        </div>
                                    </th>
                                    <th className={clsx(
                                        "sticky right-[99px] z-30 p-2 w-[100px] bg-surface border-b border-white/10 text-center align-middle",
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )}>
                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-tight">RESULTATS SELON<br />PONDERATION</span>
                                    </th>
                                    <th className={clsx(
                                        "sticky right-0 z-30 p-2 w-[100px] bg-surface border-b border-white/10 text-center align-middle",
                                        isDetailedView ? 'top-[64px]' : 'top-0'
                                    )}>
                                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest leading-tight">RESULTATS<br />SELON %</span>
                                    </th>
                                </tr>

                                {/* Row 3: Max Points */}
                                <tr className="border-b border-white/10 bg-surface/80">
                                    <th className={clsx(
                                        "sticky left-0 z-40 bg-surface px-4 py-2 text-left min-w-[220px] border-r border-white/10 border-b border-white/10 h-8",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )}>
                                        <span className="text-[9px] font-black uppercase text-grey-medium tracking-widest">Points Max</span>
                                    </th>

                                    {filteredEvaluations.length > 0 ? filteredEvaluations.map(ev => {
                                        if (!isDetailedView) {
                                            return (
                                                <th key={`max-ev-${ev.id}`} className="p-0 text-[10px] font-black text-grey-medium/60 uppercase border-b border-white/10 min-w-[120px] text-center border-r border-white/10 align-middle px-2 h-8">
                                                    / {ev.note_max}
                                                </th>
                                            );
                                        }
                                        const evColumns = getEvaluationColumns(ev.id);
                                        return (
                                            <React.Fragment key={`max-cols-${ev.id}`}>
                                                {evColumns.map(col => (
                                                    <th key={`max-${col.id}`} className="p-0 min-w-[65px] h-8 text-center border-b border-white/10 border-r border-white/5 relative bg-surface/50">
                                                        <span className="text-[10px] font-black text-grey-medium/60 uppercase">
                                                            / {Number.isInteger(col.maxPoints) ? col.maxPoints : col.maxPoints.toFixed(1)}
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className="p-0 text-[10px] font-black text-grey-medium uppercase border-b border-white/10 min-w-[85px] text-center border-r border-white/10 align-middle px-2 h-8">
                                                    / {ev.note_max}
                                                </th>
                                            </React.Fragment>
                                        );
                                    }) : null}

                                    {/* Summary Maxes */}
                                    <th className={clsx(
                                        "sticky right-[198px] z-30 p-2 w-[80px] bg-surface border-b border-white/10 border-l border-white/10 text-center align-middle h-8",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )} />
                                    <th className={clsx(
                                        "sticky right-[99px] z-30 p-2 w-[100px] bg-surface border-b border-white/10 text-center align-middle h-8 uppercase text-[10px] font-black text-grey-medium/60",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )}>
                                        100%
                                    </th>
                                    <th className={clsx(
                                        "sticky right-0 z-30 p-2 w-[100px] bg-surface border-b border-white/10 text-center align-middle h-8 uppercase text-[10px] font-black text-grey-medium/60",
                                        isDetailedView ? 'top-[204px]' : 'top-[40px]'
                                    )}>
                                        100%
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5 transition-all">
                                {searchedStudents.map(student => {
                                    // --- Summary calculations ---
                                    const scores = filteredEvaluations.map(ev => ({
                                        obtained: scoreMap[student.id]?.[ev.id],
                                        max: ev.note_max || 20,
                                        type_note_id: ev.type_note_id
                                    }));
                                    const completedScores = scores.filter(s => s.obtained !== null && s.obtained !== undefined);
                                    const missingCount = scores.length - completedScores.length;

                                    let globalPercentage: number | null = null;
                                    if (completedScores.length > 0) {
                                        const totalObtained = completedScores.reduce((sum, s) => sum + (s.obtained as number), 0);
                                        const totalMax = completedScores.reduce((sum, s) => sum + s.max, 0);
                                        globalPercentage = Math.round((totalObtained / totalMax) * 100);
                                    }
                                    const globalStyle = globalPercentage !== null ? getScoreStyle(globalPercentage, 100, null) : null;

                                    return (
                                        <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {/* Student Info (Sticky) */}
                                            <td className="sticky left-0 z-10 bg-surface p-3 border-r border-white/10 group-hover:bg-surface-light transition-colors min-w-[220px]">
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        src={student.photo_url}
                                                        text={`${student.prenom?.charAt(0)}${student.nom?.charAt(0)}`}
                                                        size="sm"
                                                        className="border-2 border-primary/20 group-hover:border-primary transition-colors"
                                                    />
                                                    <div className="min-w-0 flex flex-col">
                                                        <span className="font-bold text-text-main truncate text-xs">{student.prenom} {student.nom}</span>
                                                        <span className="text-[9px] text-grey-medium font-bold uppercase tracking-widest">
                                                            {student.Niveau?.nom || 'P6'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Cells for each evaluation */}
                                            {filteredEvaluations.map(ev => {
                                                const total = scoreMap[student.id]?.[ev.id];
                                                const percentage = (total !== null && total !== undefined) ? Math.round((total / (ev.note_max || 20)) * 100) : null;

                                                if (!isDetailedView) {
                                                    const scoreStyle = getScoreStyle(total ?? null, ev.note_max, ev.type_note_id);
                                                    return (
                                                        <td key={ev.id} className="p-2 text-center border-t border-white/5 border-r border-white/10 relative min-w-[120px]">
                                                            {(total !== null && total !== undefined) ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className={clsx('text-sm font-black', scoreStyle.colorClass)}>
                                                                        {total}
                                                                    </span>
                                                                    <span className={clsx('text-[10px] font-black opacity-80', scoreStyle.colorClass)}>
                                                                        {percentage}%
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center py-1">
                                                                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shadow-sm border border-rose-400/20" title="Aucun point encodé">
                                                                        <X className="w-3 h-3 text-white" strokeWidth={3} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                }

                                                // Detailed view cells
                                                if (isDetailedView) {
                                                    const evColumns = getEvaluationColumns(ev.id);
                                                    return (
                                                        <React.Fragment key={`row-${student.id}-${ev.id}`}>
                                                            {evColumns.map(col => {
                                                                let totalCol = 0;
                                                                let hasAnyMark = false;
                                                                
                                                                col.questions.forEach((q: any) => {
                                                                    const qr = resultsData?.questionResults.find(r => r.question_id === q.id && r.eleve_id === student.id);
                                                                    if (qr && qr.note !== null) {
                                                                        totalCol += (qr.note * (q.ratio || 1));
                                                                        hasAnyMark = true;
                                                                    }
                                                                });

                                                                const colStyle = getScoreStyle(hasAnyMark ? totalCol : null, col.maxPoints, ev.type_note_id);
                                                                
                                                                return (
                                                                    <td key={col.id} className="p-2 text-center border-t border-white/5 border-r border-white/5 min-w-[65px]">
                                                                        {hasAnyMark ? (
                                                                            <span className={clsx('text-xs font-bold', colStyle.colorClass)}>
                                                                                {Number.isInteger(totalCol) ? totalCol : totalCol.toFixed(1)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-grey-dark text-[10px]">—</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            {/* Total cell for this evaluation */}
                                                            <td className="p-2 text-center border-t border-white/5 border-r border-white/10 min-w-[85px]">
                                                            {(total !== null && total !== undefined) ? (() => {
                                                                const totalStyle = getScoreStyle(total, ev.note_max, ev.type_note_id);
                                                                return (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className={clsx('text-xs font-black', totalStyle.colorClass)}>{total}</span>
                                                                        <span className={clsx('text-[9px] font-black opacity-80', totalStyle.colorClass)}>{percentage}%</span>
                                                                    </div>
                                                                );
                                                            })() : (
                                                                <div className="flex items-center justify-center py-1">
                                                                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shadow-sm border border-rose-400/20" title="Aucun point encodé">
                                                                        <X className="w-3 h-3 text-white" strokeWidth={3} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            }
                                            return null;
                                        })}

                                            {(() => {
                                            const scoresInfo = filteredEvaluations.map(ev => {
                                                const obtained = scoreMap[student.id]?.[ev.id];
                                                const max = ev.note_max || 20;
                                                const pct = (obtained !== null && obtained !== undefined) ? (obtained / max) * 100 : null;
                                                return { obtained, max, pct, type_note_id: ev.type_note_id };
                                            });

                                            const completed = scoresInfo.filter(s => s.obtained !== null && s.obtained !== undefined);
                                            const missingCount = scoresInfo.length - completed.length;

                                            // 1. Weighted Average (Selon Pondération)
                                            let weightedPercentage: number | null = null;
                                            if (completed.length > 0) {
                                                const totalObtained = completed.reduce((sum, s) => sum + (s.obtained as number), 0);
                                                const totalMax = completed.reduce((sum, s) => sum + s.max, 0);
                                                weightedPercentage = Math.round((totalObtained / totalMax) * 100);
                                            }

                                            // 2. Simple Average (Selon %)
                                            let simplePercentage: number | null = null;
                                            if (completed.length > 0) {
                                                const sumPcts = completed.reduce((sum, s) => sum + (s.pct as number), 0);
                                                simplePercentage = Math.round(sumPcts / completed.length);
                                            }

                                            const weightedStyle = weightedPercentage !== null ? getScoreStyle(weightedPercentage, 100, null) : null;
                                            const simpleStyle = simplePercentage !== null ? getScoreStyle(simplePercentage, 100, null) : null;

                                            return (
                                                <>
                                                    {/* Summary: Missing count */}
                                                    <td className="sticky right-[198px] z-10 bg-surface border-t border-white/5 border-l border-white/10 text-center font-black text-sm transition-colors w-[80px]">
                                                        {missingCount > 0 ? (
                                                            <span className="text-rose-500">{missingCount}</span>
                                                        ) : (
                                                            <span className="text-grey-medium opacity-20 text-xs">0</span>
                                                        )}
                                                    </td>

                                                    {/* Summary: Weighted Result */}
                                                    <td className="sticky right-[99px] z-10 bg-surface border-t border-white/5 text-center p-2 transition-colors w-[100px]">
                                                        {weightedPercentage !== null ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className={clsx("text-base font-black leading-none", weightedStyle?.colorClass)}>
                                                                    {weightedPercentage}%
                                                                </span>

                                                            </div>
                                                        ) : (
                                                            <span className="text-grey-medium opacity-20">—</span>
                                                        )}
                                                    </td>

                                                    {/* Summary: Simple Average Result (%) */}
                                                    <td className="sticky right-0 z-10 bg-surface border-t border-white/5 text-center p-2 transition-colors w-[100px]">
                                                        {simplePercentage !== null ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className={clsx("text-base font-black leading-none", simpleStyle?.colorClass)}>
                                                                    {simplePercentage}%
                                                                </span>

                                                            </div>
                                                        ) : (
                                                            <span className="text-grey-medium opacity-20">—</span>
                                                        )}
                                                    </td>
                                                </>
                                            );
                                            })()}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer tip */}
                    <div className="bg-primary/5 p-3 px-6 flex items-center gap-2 border-t border-white/5">
                        <Info size={14} className="text-primary" />
                        <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">
                            Les moyennes et pourcentages sont recalculés en temps réel selon les barèmes configurés.
                        </span>
                    </div>
                </CardInfo>
            )}
        </div>
    );
};

export default GradesByStudentTable;
