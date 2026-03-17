import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradeService } from '../services';
import { TablesInsert } from '../../../types/supabase';
import { useState } from 'react';
import { toast } from 'sonner';

export const useGrades = (brancheId?: string, periode?: string) => {
    const queryClient = useQueryClient();
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

    // Fetch individual question results
    const { data: questionResults = [], isLoading: loadingQuestionResults } = useQuery({
        queryKey: ['question_results', selectedEvaluationId],
        queryFn: () => selectedEvaluationId ? gradeService.getQuestionResults(selectedEvaluationId) : Promise.resolve([]),
        enabled: !!selectedEvaluationId
    });

    // Create evaluation with questions
    const createEvaluationMutation = useMutation({
        mutationFn: ({ evaluation, questions }: { evaluation: TablesInsert<'Evaluation'>, questions?: any[] }) => 
            gradeService.createEvaluation(evaluation, questions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            toast.success("Évaluation créée avec succès");
        }
    });

    // Delete evaluation
    const deleteEvaluationMutation = useMutation({
        mutationFn: (id: string) => gradeService.deleteEvaluation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            toast.success("Évaluation supprimée");
        }
    });

    // Save result (total score)
    const saveResultMutation = useMutation({
        mutationFn: (result: TablesInsert<'Resultat'>) => gradeService.saveResult(result),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_results', selectedEvaluationId] });
        }
    });

    // Save question result
    const saveQuestionResultsMutation = useMutation({
        mutationFn: (results: TablesInsert<'ResultatQuestion'>[]) => gradeService.saveQuestionResults(results),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['question_results', selectedEvaluationId] });
            queryClient.invalidateQueries({ queryKey: ['evaluation_results', selectedEvaluationId] });
        }
    });

    // Fetch note types
    const { data: noteTypes = [], isLoading: loadingNoteTypes } = useQuery({
        queryKey: ['note_types'],
        queryFn: () => gradeService.getNoteTypes()
    });

    // Save note type
    const saveNoteTypeMutation = useMutation({
        mutationFn: (typeNote: any) => gradeService.saveNoteType(typeNote),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note_types'] });
            toast.success("Type de note enregistré");
        }
    });

    // Delete note type
    const deleteNoteTypeMutation = useMutation({
        mutationFn: (id: string) => gradeService.deleteNoteType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note_types'] });
            toast.success("Type de note supprimé");
        }
    });

    // Helper to calculate stats
    const evaluation = evaluations.find(e => e.id === selectedEvaluationId);
    const stats = evaluation ? gradeService.calculateStats(currentResults, evaluation.note_max) : null;

    return {
        evaluations,
        questions,
        currentResults,
        questionResults,
        noteTypes,
        loading: loadingEvaluations || loadingResults || loadingQuestions || loadingQuestionResults || loadingNoteTypes,
        activeEvaluation: evaluation,
        selectedEvaluationId,
        setSelectedEvaluationId,
        stats,
        createEvaluation: createEvaluationMutation.mutateAsync,
        deleteEvaluation: deleteEvaluationMutation.mutate,
        saveResult: saveResultMutation.mutate,
        saveQuestionResults: saveQuestionResultsMutation.mutate,
        saveNoteType: saveNoteTypeMutation.mutateAsync,
        deleteNoteType: deleteNoteTypeMutation.mutateAsync,
        getGradeColor: gradeService.getGradeColor,
        formatStatut: gradeService.formatStatut
    };
};
