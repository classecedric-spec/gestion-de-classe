/**
 * Nom du module/fichier : useGrades.ts
 * 
 * Données en entrée : Les actions de l'enseignant (créer un devoir, taper une note, supprimer une évaluation) et le contexte (dans quelle branche/trimestre sommes-nous).
 * 
 * Données en sortie : L'enregistrement immédiat de ces actions en base de données, accompagné de mécanismes d'interface fluides (Optimistic Updates) pour que l'écran réagisse sans aucune latence.
 * 
 * Objectif principal : C'est le chef d'orchestre de la tuyauterie des notes. Il centralise toutes les requêtes serveurs et gère le fait que l'application doit paraître instantanée.
 * 
 * Ce que ça affiche : Rien visuellement. C'est un moteur invisible contenant des "Hooks" React.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradeService } from '../services';
import { TablesInsert } from '../../../types/supabase';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Ce petit hook récupère simplement la liste des barèmes configurés par l'enseignant (ex: "Interro sur 20", "Lettres A-E").
 */
export const useNoteTypes = () => {
    return useQuery({
        queryKey: ['note_types'],
        queryFn: () => gradeService.getNoteTypes()
    });
};

/**
 * Ce méga-Hook regroupe tous les "ordres de modification" (Mutations) qu'on peut donner au système : 
 * Créer un devoir, enregistrer une note, supprimer un barème, etc.
 * Il actionne aussi le miracle technologique nommé "Optimisation Optimiste" (Optimistic Updates) : 
 * Dès que l'enseignant tape une note, ce fichier l'affiche sur l'écran *avant même* que le serveur 
 * n'ait confirmé sa sauvegarde dans le cloud, pour éviter toute sensation de ralentissement (zéro latence).
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

    const updateEvaluationMutation = useMutation({
        mutationFn: ({ id, evaluation, questions }: { id: string, evaluation: any, questions?: any[] }) => 
            gradeService.updateEvaluation(id, evaluation, questions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            queryClient.invalidateQueries({ queryKey: ['evaluation_questions'] });
            toast.success("Évaluation mise à jour avec succès");
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
        // L'"Optimistic Update" en action : le professeur encode une note. On annule les chargements en cours, on affiche la note de suite sur son écran, et s'il y a un bug côté serveur (onError), on remettra l'ancienne note incognito.
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
        updateEvaluation: updateEvaluationMutation.mutateAsync,
        deleteEvaluation: deleteEvaluationMutation.mutate,
        saveResult: saveResultMutation.mutate,
        saveQuestionResults: saveQuestionResultsMutation.mutate,
        saveNoteType: saveNoteTypeMutation.mutateAsync,
        deleteNoteType: deleteNoteTypeMutation.mutateAsync,
    };
};

/**
 * Le Hook "useGrades" original. C'est lui qui alimente les pages d'une classe spécifique.
 * En fonction d'une matière et d'un trimestre donnés ("context-based fetching"), 
 * il aspire tout ce qu'il faut depuis la base de données (les devoirs existants, les élèves, les notes) pour que l'interface du prof soit tout de suite prête à l'emploi.
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

/**
 * 1. Une page liée aux carnets de cotes s'ouvre, elle appelle `useGrades(brancheId, trimestre)`.
 * 2. L'assistant `useGrades` lance plusieurs agents de liaison (`useQuery`) en parallèle pour aller chercher sur le cloud : les devoirs, les questions, tous les résultats des élèves, et les types de notes.
 * 3. En même temps, il prépare l'arsenal "mutations" (l'autorisation de modifier, d'ajouter ou de supprimer des éléments) via `useGradeMutations`.
 * 4. Si l'enseignant ajoute une note, le module `onMutate` insère cette valeur immédiatement sur l'écran pour que l'interface reste fluide et ultra-rapide au clic, pendant qu'en arrière-plan le serveur travaille silencieusement.
 * 5. Quand le serveur répond "OK, j'ai sauvegardé", les données sont certifiées conformes et la boucle est bouclée.
 */
