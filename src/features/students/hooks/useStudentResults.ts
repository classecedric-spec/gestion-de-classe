import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database/supabaseClient';

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
                // Fetch student resultats with Evaluation and Branche
                const { data: resultats, error: resErr } = await supabase
                    .from('Resultat')
                    .select('*, Evaluation:evaluation_id(*, Branche(nom))')
                    .eq('eleve_id', studentId);
                
                if (resErr) throw resErr;

                const evalIds = resultats.map(r => r.evaluation_id);
                if (evalIds.length === 0) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                // Fetch questions for those evals
                const { data: questions, error: qErr } = await supabase
                    .from('EvaluationQuestion')
                    .select('*')
                    .in('evaluation_id', evalIds)
                    .order('ordre', { ascending: true });
                if (qErr) throw qErr;

                // Fetch student specifically grouped questions
                const { data: questionResults, error: qrErr } = await supabase
                    .from('ResultatQuestion')
                    .select('*')
                    .in('question_id', questions.map(q => q.id))
                    .eq('eleve_id', studentId);
                if (qrErr) throw qrErr;

                // Structure data
                const periodeMap = new Map<string, Map<string, ResultEvalView[]>>();

                for (const res of resultats) {
                    const ev = res.Evaluation;
                    if (!ev) continue;
                    
                    const periodeName = ev.periode || 'Toute l\'année';
                    const brancheName = ev.Branche?.nom || 'Sans matière';

                    const evQuestions: ResultQuestionView[] = questions
                        .filter(q => q.evaluation_id === ev.id)
                        .map(q => {
                            const qr = questionResults.find(r => r.question_id === q.id);
                            let points: number | null = null;
                            if (qr && qr.note !== null) {
                                points = Number(qr.note);
                            }
                            return {
                                id: q.id,
                                titre: q.titre,
                                points: points,
                                points_max: q.note_max ? Number(q.note_max) : null
                            };
                        });

                    // Calculate percentage
                    let parsedPourcentage: number | null = null;
                    
                    if (evQuestions.length > 0) {
                        // Calculate from questions (following gradeService logic)
                        let weightedSum = 0;
                        let maxWeightedSum = 0;
                        let noteFound = false;

                        evQuestions.forEach(q => {
                            if (q.points_max !== null) {
                                maxWeightedSum += q.points_max;
                                if (q.points !== null) {
                                    weightedSum += q.points;
                                    noteFound = true;
                                }
                            }
                        });

                        if (noteFound && maxWeightedSum > 0) {
                            parsedPourcentage = Math.round((weightedSum / maxWeightedSum) * 100);
                        }
                    } 
                    
                    // Fallback to global note if no questions or no notes found in questions
                    if (parsedPourcentage === null && res.note !== null) {
                        const note = Number(res.note);
                        const noteMax = ev.note_max ? Number(ev.note_max) : 10;
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

                // Aggregate into Final Array
                const finalData: ResultPeriodeView[] = [];

                // Sort periods chronologically if possible. Since we don't have strict dates for periods,
                // we sort them alphabetically (e.g. Semestre 1, Semestre 2)
                const sortedPeriodes = Array.from(periodeMap.keys()).sort();

                for (const periode of sortedPeriodes) {
                    const branchesMap = periodeMap.get(periode)!;
                    const sortedBranches = Array.from(branchesMap.keys()).sort();

                    const branchesView: ResultBrancheView[] = sortedBranches.map(bName => {
                        const evals = branchesMap.get(bName)!;
                        // Sort evals by date
                        evals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        
                        // Computes average of the percentages of evaluations that have a percentage
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
                console.error('Error fetching student results:', err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [studentId]);

    return { loading, data };
}
