import { useState, useEffect } from 'react';
import { parseISO, compareAsc } from 'date-fns';
import { supabase } from '../../../lib/database';

export interface ResultQuestionView {
    id: string;
    titre: string;
    points: number | null;
    points_max: number | null;
}

export interface ResultEvalView {
    id: string;
    titre: string;
    date: string;
    pourcentage: number | null;
    questions: ResultQuestionView[];
}

export interface ResultBrancheView {
    nom: string;
    pourcentageMoyen: number | null;
    evaluations: ResultEvalView[];
}

export interface ResultPeriodeView {
    nom: string;
    branches: ResultBrancheView[];
}

export function useStudentResults(studentId: string | null) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ResultPeriodeView[]>([]);

    useEffect(() => {
        const fetchResults = async () => {
            if (!studentId) {
                setData([]);
                return;
            }
            setLoading(true);
            try {
                // 1. Fetch student's groups
                const { data: studentGroups, error: grpErr } = await supabase
                    .from('EleveGroupe')
                    .select('groupe_id')
                    .eq('eleve_id', studentId);
                
                if (grpErr) throw grpErr;
                const relevantGroupIds = studentGroups.map(sg => sg.groupe_id);

                // 2. Fetch all relevant evaluations (where group_id is null OR evaluation's group_id is one of the student's groups)
                let evalQuery = supabase
                    .from('Evaluation')
                    .select('*, Branche(nom)')
                    .is('deleted_at', null);

                // Handle the "OR" logic for group_id
                if (relevantGroupIds.length > 0) {
                    evalQuery = evalQuery.or(`group_id.in.(${relevantGroupIds.join(',')}),group_id.is.null`);
                } else {
                    evalQuery = evalQuery.is('group_id', null);
                }

                const { data: rawEvaluations, error: evErr } = await evalQuery;
                if (evErr) throw evErr;

                if (rawEvaluations.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                const evalIds = rawEvaluations.map(e => e.id);

                // 3. Fetch results for this student on these evaluations (NO statut filter)
                const { data: studentResults, error: resErr } = await supabase
                    .from('Resultat')
                    .select('*')
                    .eq('eleve_id', studentId)
                    .in('evaluation_id', evalIds);

                if (resErr) throw resErr;

                // 4. Fetch questions for those evals
                const { data: questions, error: qErr } = await supabase
                    .from('EvaluationQuestion')
                    .select('*')
                    .in('evaluation_id', evalIds)
                    .order('ordre', { ascending: true });
                if (qErr) throw qErr;

                // 5. Fetch question results for specifically this student
                const { data: questionResults, error: qrErr } = await supabase
                    .from('ResultatQuestion')
                    .select('*')
                    .in('question_id', questions.map(q => q.id))
                    .eq('eleve_id', studentId);
                if (qrErr) throw qrErr;

                // --- DATA STRUCTURING ---
                const periodeMap = new Map<string, Map<string, ResultEvalView[]>>();

                for (const ev of rawEvaluations) {
                    const periodeName = ev.periode || 'Toute l\'année';
                    const brancheName = ev.Branche?.nom || 'Sans matière';

                    const res = studentResults.find(r => r.evaluation_id === ev.id);

                    // Map questions
                    const evQuestions: ResultQuestionView[] = questions
                        .filter(q => q.evaluation_id === ev.id)
                        .map(q => {
                            const qr = questionResults.find(r => r.question_id === q.id);
                            return {
                                id: q.id,
                                titre: q.titre,
                                points: (qr && qr.note !== null) ? Number(qr.note) : null,
                                points_max: q.note_max ? Number(q.note_max) : null
                            };
                        });

                    // Calculate percentage (align with gradeService)
                    let parsedPourcentage: number | null = null;
                    
                    if (evQuestions.length > 0) {
                        let weightedSum = 0;
                        let maxWeightedSum = 0;
                        let noteFound = false;

                        const relevantQuestions = questions.filter(q => q.evaluation_id === ev.id);
                        relevantQuestions.forEach(q => {
                            const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
                            const qMax = parseFloat(q.note_max?.toString() || '10');
                            maxWeightedSum += qMax * ratio;

                            const qr = questionResults.find(r => r.question_id === q.id);
                            if (qr && qr.note !== null) {
                                weightedSum += parseFloat(qr.note.toString()) * ratio;
                                noteFound = true;
                            }
                        });

                        if (noteFound && maxWeightedSum > 0) {
                            parsedPourcentage = Math.round((weightedSum / maxWeightedSum) * 100);
                        }
                    } 
                    
                    if (parsedPourcentage === null && res && res.note !== null && res.statut === 'present') {
                        const note = Number(res.note);
                        const noteMax = ev.note_max ? Number(ev.note_max) : 20;
                        if (noteMax > 0) {
                            parsedPourcentage = Math.round((note / noteMax) * 100);
                        }
                    }

                    const evalView: ResultEvalView = {
                        id: ev.id,
                        titre: ev.titre || 'Évaluation',
                        date: ev.date,
                        pourcentage: parsedPourcentage,
                        questions: evQuestions
                    };

                    if (!periodeMap.has(periodeName)) {
                        periodeMap.set(periodeName, new Map());
                    }
                    const branchesInPeriode = periodeMap.get(periodeName)!;
                    
                    if (!branchesInPeriode.has(brancheName)) {
                        branchesInPeriode.set(brancheName, []);
                    }
                    branchesInPeriode.get(brancheName)!.push(evalView);
                }

                // Aggregate and sort
                const finalData: ResultPeriodeView[] = [];
                const sortedPeriodes = Array.from(periodeMap.keys()).sort();

                for (const periode of sortedPeriodes) {
                    const branchesMap = periodeMap.get(periode)!;
                    const sortedBranches = Array.from(branchesMap.keys()).sort();

                    const branchesView: ResultBrancheView[] = sortedBranches.map(bName => {
                        const evals = branchesMap.get(bName)!;
                        evals.sort((a, b) => {
                            const dateA = a.date ? parseISO(a.date) : new Date(0);
                            const dateB = b.date ? parseISO(b.date) : new Date(0);
                            const dateCompare = compareAsc(dateA, dateB);
                            
                            if (dateCompare !== 0) return dateCompare;
                            return a.titre.localeCompare(b.titre);
                        });
                        
                        // Filters out evaluaciones without percentage for the aggregate average
                        const validEvals = evals.filter(e => e.pourcentage !== null);
                        let avg: number | null = null;
                        if (validEvals.length > 0) {
                            const sum = validEvals.reduce((acc, curr) => acc + curr.pourcentage!, 0);
                            avg = Math.round(sum / validEvals.length);
                        }

                        return {
                            nom: bName,
                            pourcentageMoyen: avg,
                            evaluations: evals
                        };
                    });

                    finalData.push({
                        nom: periode,
                        branches: branchesView
                    });
                }

                setData(finalData);

            } catch (err) {
                console.error('Error fetching exhaustive student results:', err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [studentId]);

    return { loading, data };
}
