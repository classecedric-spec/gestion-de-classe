import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradeService } from '../services';
import { TablesInsert } from '../../../types/supabase';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * useNoteTypes
 * Hook to fetch available note types/scales
 */
export const useNoteTypes = () => {
    return useQuery({
        queryKey: ['note_types'],
        queryFn: () => gradeService.getNoteTypes()
    });
};

/**
 * useGradeMutations
 * Hook providing all grading-related actions without triggering any data fetches
 */
export const useGradeMutations = (selectedEvaluationId?: string | null) => {
    const queryClient = useQueryClient();

    const createEvaluationMutation = useMutation({
        mutationFn: ({ evaluation, questions }: { evaluation: TablesInsert<'Evaluation'>, questions?: any[] }) => 
            gradeService.createEvaluation(evaluation, questions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            toast.success("Évaluation créée avec succès");
        }
    });

    const deleteEvaluationMutation = useMutation({
        mutationFn: (id: string) => gradeService.deleteEvaluation(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['all_evaluations_detailed'] });
            await queryClient.cancelQueries({ queryKey: ['evaluations'] });

            const previousDetailed = queryClient.getQueryData<any[]>(['all_evaluations_detailed']);
            queryClient.setQueryData(['all_evaluations_detailed'], (old: any[] | undefined) =>
                old?.filter((e: any) => e.id !== id) ?? []
            );

            return { previousDetailed };
        },
        onError: (_err, _id, context) => {
            if (context?.previousDetailed) {
                queryClient.setQueryData(['all_evaluations_detailed'], context.previousDetailed);
            }
            toast.error("Erreur lors de la suppression");
        },
        onSuccess: () => {
            toast.success("Évaluation supprimée");
        }
    });

    const saveResultMutation = useMutation({
        mutationFn: (result: TablesInsert<'Resultat'>) => gradeService.saveResult(result),
        onMutate: async (newResult) => {
            if (!selectedEvaluationId) return;
            const queryKey = ['evaluation_results', selectedEvaluationId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<any[]>(queryKey) || [];

            const exists = previous.find((r: any) => r.eleve_id === newResult.eleve_id);
            if (exists) {
                queryClient.setQueryData(queryKey, previous.map((r: any) =>
                    r.eleve_id === newResult.eleve_id ? { ...r, ...newResult } : r
                ));
            } else {
                queryClient.setQueryData(queryKey, [...previous, { id: `temp-${Date.now()}`, ...newResult }]);
            }
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSuccess: () => {
            if (selectedEvaluationId) {
                queryClient.invalidateQueries({ queryKey: ['evaluation_results', selectedEvaluationId] });
            }
        }
    });

    const saveQuestionResultsMutation = useMutation({
        mutationFn: (results: TablesInsert<'ResultatQuestion'>[]) => gradeService.saveQuestionResults(results),
        onMutate: async (newResults) => {
            if (!selectedEvaluationId) return;
            const queryKey = ['question_results', selectedEvaluationId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<any[]>(queryKey) || [];

            let updated = [...previous];
            for (const nr of newResults) {
                const idx = updated.findIndex((r: any) => r.eleve_id === nr.eleve_id && r.question_id === nr.question_id);
                if (idx >= 0) {
                    updated[idx] = { ...updated[idx], ...nr };
                } else {
                    updated.push({ id: `temp-${Date.now()}`, ...nr });
                }
            }
            queryClient.setQueryData(queryKey, updated);
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSuccess: () => {
            if (selectedEvaluationId) {
                queryClient.invalidateQueries({ queryKey: ['question_results', selectedEvaluationId] });
                queryClient.invalidateQueries({ queryKey: ['evaluation_results', selectedEvaluationId] });
            }
        }
    });

    const saveNoteTypeMutation = useMutation({
        mutationFn: (typeNote: any) => gradeService.saveNoteType(typeNote),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note_types'] });
            toast.success("Type de note enregistré");
        }
    });

    const deleteNoteTypeMutation = useMutation({
        mutationFn: (id: string) => gradeService.deleteNoteType(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['note_types'] });
            const previous = queryClient.getQueryData<any[]>(['note_types']);
            queryClient.setQueryData(['note_types'], (old: any[] | undefined) =>
                old?.filter((nt: any) => nt.id !== id) ?? []
            );
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) queryClient.setQueryData(['note_types'], context.previous);
            toast.error("Erreur lors de la suppression");
        },
        onSuccess: () => {
            toast.success("Type de note supprimé");
        }
    });

    return {
        createEvaluation: createEvaluationMutation.mutateAsync,
        deleteEvaluation: deleteEvaluationMutation.mutate,
        saveResult: saveResultMutation.mutate,
        saveQuestionResults: saveQuestionResultsMutation.mutate,
        saveNoteType: saveNoteTypeMutation.mutateAsync,
        deleteNoteType: deleteNoteTypeMutation.mutateAsync,
    };
};

/**
 * useGrades
 * Main hook for grades management (backward compatibility + context-based fetching)
 */
export const useGrades = (brancheId?: string, periode?: string) => {
    const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);

    // Fetch evaluations
    const { data: evaluations = [], isLoading: loadingEvaluations } = useQuery({
        queryKey: ['evaluations', brancheId, periode],
        queryFn: () => gradeService.getEvaluations(brancheId, periode),
        enabled: !!brancheId && !!periode
    });

    // Fetch questions for selected evaluation
    const { data: questions = [], isLoading: loadingQuestions } = useQuery({
        queryKey: ['evaluation_questions', selectedEvaluationId],
        queryFn: () => selectedEvaluationId ? gradeService.getQuestions(selectedEvaluationId) : Promise.resolve([]),
        enabled: !!selectedEvaluationId
    });

    // Fetch results for selected evaluation
    const { data: currentResults = [], isLoading: loadingResults } = useQuery({
        queryKey: ['evaluation_results', selectedEvaluationId],
        queryFn: () => selectedEvaluationId ? gradeService.getResults(selectedEvaluationId) : Promise.resolve([]),
        enabled: !!selectedEvaluationId
    });

    // Fetch all results for current context (branch/period)
    const { data: contextResults = [], isLoading: loadingContextResults } = useQuery({
        queryKey: ['context_results', brancheId, periode],
        queryFn: () => evaluations.length > 0 ? gradeService.getResultsForEvaluations(evaluations.map(e => e.id)) : Promise.resolve([]),
        enabled: !!brancheId && !!periode && evaluations.length > 0
    });

    // Fetch individual question results
    const { data: questionResults = [], isLoading: loadingQuestionResults } = useQuery({
        queryKey: ['question_results', selectedEvaluationId],
        queryFn: () => selectedEvaluationId ? gradeService.getQuestionResults(selectedEvaluationId) : Promise.resolve([]),
        enabled: !!selectedEvaluationId
    });

    // Mutations and NoteTypes via shared hooks
    const mutations = useGradeMutations(selectedEvaluationId);
    const { data: noteTypes = [], isLoading: loadingNoteTypes } = useNoteTypes();

    // Fetch active evaluation details independently of context
    const { data: activeEvalData } = useQuery({
        queryKey: ['evaluation_detail', selectedEvaluationId],
        queryFn: () => selectedEvaluationId ? gradeService.getEvaluations() : Promise.resolve([]),
        enabled: !!selectedEvaluationId,
        select: (data) => data.find(e => e.id === selectedEvaluationId)
    });

    // Helper to calculate stats
    const evaluation = activeEvalData || evaluations.find(e => e.id === selectedEvaluationId);
    const stats = evaluation ? gradeService.calculateStats(currentResults, evaluation.note_max) : null;

    return {
        evaluations,
        questions,
        currentResults,
        contextResults,
        questionResults,
        noteTypes,
        loading: loadingEvaluations || loadingResults || loadingQuestions || loadingQuestionResults || loadingNoteTypes || loadingContextResults,
        activeEvaluation: evaluation,
        selectedEvaluationId,
        setSelectedEvaluationId,
        stats,
        ...mutations,
        getGradeColor: gradeService.getGradeColor,
        formatStatut: gradeService.formatStatut,
        convertNoteToLetter: gradeService.convertNoteToLetter.bind(gradeService),
        getConversionPalier: gradeService.getConversionPalier.bind(gradeService)
    };
};
