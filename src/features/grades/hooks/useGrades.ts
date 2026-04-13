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
import { supabase, getCurrentUser } from '../../../lib/database';

/**
 * Ce petit hook récupère simplement la liste des barèmes configurés par l'enseignant (ex: "Interro sur 20", "Lettres A-E").
 */
export const useNoteTypes = (userId?: string) => {
    return useQuery({
        queryKey: ['note_types', userId],
        queryFn: () => userId ? gradeService.getNoteTypes(userId) : Promise.resolve([]),
        enabled: !!userId
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

    // On récupère l'utilisateur actuel pour l'injecter automatiquement dans les mutations si besoin.
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    const createEvaluationMutation = useMutation({
        mutationFn: ({ 
            evaluation, 
            questions, 
            regroupements, 
            results, // New optional parameter
            userId: providedUserId 
        }: { 
            evaluation: TablesInsert<'Evaluation'>, 
            userId?: string, 
            questions?: any[], 
            regroupements?: any[],
            results?: any[] // Optional results for bulk creation
        }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            
            if (results && results.length > 0) {
                return gradeService.createEvaluationWithResults(evaluation, effectiveUserId, questions || [], results);
            }
            
            return gradeService.createEvaluation(evaluation, effectiveUserId, questions, regroupements);
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['evaluations'] });
            await queryClient.cancelQueries({ queryKey: ['all_evaluations_detailed'] });

            const previousEvaluations = queryClient.getQueryData<any[]>(['evaluations']);
            const previousDetailed = queryClient.getQueryData<any[]>(['all_evaluations_detailed']);

            const optimisticId = variables.evaluation.id || `temp-${Date.now()}`;
            const optimisticEval = {
                ...variables.evaluation,
                id: optimisticId,
                date: variables.evaluation.date || new Date().toISOString(),
                created_at: new Date().toISOString(),
                is_optimistic: true 
            };

            queryClient.setQueryData(['all_evaluations_detailed'], (old: any[] | undefined) =>
                [optimisticEval, ...(old || [])]
            );

            return { previousEvaluations, previousDetailed };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousEvaluations) queryClient.setQueryData(['evaluations'], context.previousEvaluations);
            if (context?.previousDetailed) queryClient.setQueryData(['all_evaluations_detailed'], context.previousDetailed);
            toast.error("Erreur lors de la création");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            queryClient.invalidateQueries({ queryKey: ['context_results'] });
            toast.success("Évaluation créée avec succès");
        }
    });

    const updateEvaluationMutation = useMutation({
        mutationFn: ({ 
            id, 
            evaluation, 
            questions, 
            regroupements, 
            results, // Accept results even if not fully used here yet
            userId: providedUserId 
        }: { 
            id: string, 
            evaluation: any, 
            userId?: string, 
            questions?: any[], 
            regroupements?: any[],
            results?: any[]
        }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            // Note: Results during update aren't processed here yet by gradeService.updateEvaluation
            return gradeService.updateEvaluation(id, evaluation, effectiveUserId, questions, regroupements);
        },
        onMutate: async (variables) => {
            const { id, evaluation } = variables;
            await queryClient.cancelQueries({ queryKey: ['evaluations'] });
            await queryClient.cancelQueries({ queryKey: ['all_evaluations_detailed'] });
            await queryClient.cancelQueries({ queryKey: ['evaluation_detail', id] });

            const previousEvaluations = queryClient.getQueryData<any[]>(['evaluations']);
            const previousDetailed = queryClient.getQueryData<any[]>(['all_evaluations_detailed']);
            const previousDetail = queryClient.getQueryData(['evaluation_detail', id]);

            // Optimistically update all caches
            const updateFn = (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.map(ev => ev.id === id ? { ...ev, ...evaluation } : ev);
            };

            queryClient.setQueryData(['all_evaluations_detailed'], updateFn);
            queryClient.setQueryData(['evaluations'], updateFn);
            if (previousDetail) {
                queryClient.setQueryData(['evaluation_detail', id], (old: any) => ({ ...old, ...evaluation }));
            }

            return { previousEvaluations, previousDetailed, previousDetail };
        },
        onError: (_err, variables, context) => {
            if (context?.previousEvaluations) queryClient.setQueryData(['evaluations'], context.previousEvaluations);
            if (context?.previousDetailed) queryClient.setQueryData(['all_evaluations_detailed'], context.previousDetailed);
            if (context?.previousDetail) queryClient.setQueryData(['evaluation_detail', variables.id], context.previousDetail);
            toast.error("Erreur lors de la mise à jour");
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            queryClient.invalidateQueries({ queryKey: ['evaluation_questions', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['evaluation_regroupements', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['evaluation_detail', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['evaluation_meta', variables.id] });
            toast.success("Évaluation mise à jour avec succès");
        }
    });

    const deleteEvaluationMutation = useMutation({
        mutationFn: ({ id, userId: providedUserId }: { id: string, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.deleteEvaluation(id, effectiveUserId);
        },
        onMutate: async ({ id }) => {
            // On annule les chargements en cours pour éviter les télescopages de données.
            await queryClient.cancelQueries({ queryKey: ['all_evaluations_detailed'] });
            await queryClient.cancelQueries({ queryKey: ['evaluations'] });

            const previousDetailed = queryClient.getQueryData<any[]>(['all_evaluations_detailed']);
            const previousEvaluations = queryClient.getQueriesData<any[]>({ queryKey: ['evaluations'] });

            // Mise à jour optimiste du cache global (Excel-like view)
            queryClient.setQueryData(['all_evaluations_detailed'], (old: any[] | undefined) =>
                old?.filter((e: any) => e.id !== id) ?? []
            );

            // Mise à jour optimiste de toutes les vues filtrées (Branche/Trimestre)
            queryClient.setQueriesData<{pages?: any[], data?: any[]} | any[]>(
                { queryKey: ['evaluations'] }, 
                (old: any) => {
                    if (Array.isArray(old)) return old.filter((e: any) => e.id !== id);
                    return old;
                }
            );

            return { previousDetailed, previousEvaluations };
        },
        onError: (_err, _id, context) => {
            // Oh mince, erreur serveur ? On remet discrètement l'ancienne liste.
            if (context?.previousDetailed) {
                queryClient.setQueryData(['all_evaluations_detailed'], context.previousDetailed);
            }
            if (context?.previousEvaluations) {
                context.previousEvaluations.forEach(([queryKey, queryData]) => {
                    queryClient.setQueryData(queryKey, queryData);
                });
            }
            toast.error("Erreur lors de la suppression");
        },
        onSuccess: (_data, variables) => {
            // On force un rafraîchissement final pour certifier les totaux et moyennes.
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            queryClient.invalidateQueries({ queryKey: ['context_results'] });
            queryClient.invalidateQueries({ queryKey: ['deleted_evaluations'] });
            toast.success("Évaluation déplacée vers la corbeille");
        }
    });

    const restoreEvaluationMutation = useMutation({
        mutationFn: ({ id, userId: providedUserId }: { id: string, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.restoreEvaluation(id, effectiveUserId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            queryClient.invalidateQueries({ queryKey: ['deleted_evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['context_results'] });
            toast.success("Évaluation restaurée");
        }
    });

    const permanentDeleteEvaluationMutation = useMutation({
        mutationFn: ({ id, userId: providedUserId }: { id: string, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.permanentDeleteEvaluation(id, effectiveUserId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deleted_evaluations'] });
            toast.success("Évaluation définitivement supprimée");
        }
    });

    const saveResultMutation = useMutation({
        mutationFn: ({ result, userId: providedUserId }: { result: TablesInsert<'Resultat'>, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.saveResult(result, effectiveUserId);
        },
        // L'"Optimistic Update" en action : le professeur encode une note. On annule les chargements en cours, on affiche la note de suite sur son écran, et s'il y a un bug côté serveur (onError), on remettra l'ancienne note incognito.
        onMutate: async ({ result: newResult }) => {
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
        onSuccess: (_data, variables) => {
            const evId = variables.result.evaluation_id || selectedEvaluationId;
            if (evId) {
                queryClient.invalidateQueries({ queryKey: ['evaluation_results', evId] });
                queryClient.invalidateQueries({ queryKey: ['context_results'] });
                // Important: invalidate global stats since a grade change affects averages
                queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            }
        }
    });

    const saveResultsMutation = useMutation({
        mutationFn: ({ results, userId: providedUserId }: { results: TablesInsert<'Resultat'>[], userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.saveResults(results, effectiveUserId);
        },
        onSuccess: (_data, variables) => {
            const evId = variables.results[0]?.evaluation_id || selectedEvaluationId;
            if (evId) {
                queryClient.invalidateQueries({ queryKey: ['evaluation_results', evId] });
                queryClient.invalidateQueries({ queryKey: ['context_results'] });
                queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            }
            toast.success(`${variables.results.length} notes importées avec succès`);
        }
    });

    const saveQuestionResultsMutation = useMutation({
        mutationFn: ({ results, userId: providedUserId }: { results: TablesInsert<'ResultatQuestion'>[], userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.saveQuestionResults(results, effectiveUserId);
        },
        onMutate: async ({ results: newResults }) => {
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
            const evId = selectedEvaluationId;
            if (evId) {
                queryClient.invalidateQueries({ queryKey: ['question_results', evId] });
                queryClient.invalidateQueries({ queryKey: ['evaluation_results', evId] });
                queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
                queryClient.invalidateQueries({ queryKey: ['context_results'] });
            }
        }
    });

    const saveNoteTypeMutation = useMutation({
        mutationFn: ({ typeNote, userId: providedUserId }: { typeNote: any, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.saveNoteType(typeNote, effectiveUserId);
        },
        onMutate: async (variables) => {
            const { typeNote } = variables;
            await queryClient.cancelQueries({ queryKey: ['note_types'] });
            const previous = queryClient.getQueryData<any[]>(['note_types']);

            if (typeNote.id) {
                // Update
                queryClient.setQueryData(['note_types'], (old: any[] | undefined) =>
                    old?.map(nt => nt.id === typeNote.id ? { ...nt, ...typeNote } : nt) ?? []
                );
            } else {
                // Creation
                queryClient.setQueryData(['note_types'], (old: any[] | undefined) =>
                    [{ ...typeNote, id: `temp-${Date.now()}` }, ...(old || [])]
                );
            }

            return { previous };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(['note_types'], context.previous);
            toast.error("Erreur lors de l'enregistrement du barème");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note_types'] });
            toast.success("Type de note enregistré");
        }
    });

    const deleteNoteTypeMutation = useMutation({
        mutationFn: ({ id, userId: providedUserId }: { id: string, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.deleteNoteType(id, effectiveUserId);
        },
        onMutate: async ({ id }) => {
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

    const updateEvaluationsPeriodMutation = useMutation({
        mutationFn: ({ oldLabel, newLabel, userId: providedUserId }: { oldLabel: string, newLabel: string, userId?: string }) => {
            const effectiveUserId = providedUserId || user?.id;
            if (!effectiveUserId) throw new Error("Utilisateur non identifié");
            return gradeService.updateEvaluationsPeriod(effectiveUserId, oldLabel, newLabel);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
            queryClient.invalidateQueries({ queryKey: ['context_results'] });
            queryClient.invalidateQueries({ queryKey: ['deleted_evaluations'] });
        }
    });

    return {
        createEvaluation: createEvaluationMutation.mutateAsync,
        updateEvaluation: updateEvaluationMutation.mutateAsync,
        deleteEvaluation: deleteEvaluationMutation.mutate,
        saveResult: saveResultMutation.mutateAsync,
        saveResults: saveResultsMutation.mutateAsync,
        saveQuestionResults: saveQuestionResultsMutation.mutateAsync,
        saveNoteType: saveNoteTypeMutation.mutateAsync,
        deleteNoteType: deleteNoteTypeMutation.mutateAsync,
        restoreEvaluation: restoreEvaluationMutation.mutateAsync,
        permanentDeleteEvaluation: permanentDeleteEvaluationMutation.mutateAsync,
        updateEvaluationsPeriod: updateEvaluationsPeriodMutation.mutateAsync,
        isCreating: createEvaluationMutation.isPending,
        isUpdating: updateEvaluationMutation.isPending,
    };
};

/**
 * Le Hook "useGrades" original. C'est lui qui alimente les pages d'une classe spécifique.
 * En fonction d'une matière et d'un trimestre donnés ("context-based fetching"), 
 * il aspire tout ce qu'il faut depuis la base de données (les devoirs existants, les élèves, les notes) pour que l'interface du prof soit tout de suite prête à l'emploi.
 */
export const useGrades = (brancheId?: string, periode?: string) => {
    const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // Fetch evaluations
    const { data: evaluations = [], isLoading: loadingEvaluations } = useQuery({
        queryKey: ['evaluations', brancheId, periode, user?.id],
        queryFn: () => user ? gradeService.getEvaluations(user.id, brancheId, periode) : Promise.resolve([]),
        enabled: !!brancheId && !!periode && !!user
    });

    // Fetch questions for selected evaluation
    const { data: questions = [], isLoading: loadingQuestions } = useQuery({
        queryKey: ['evaluation_questions', selectedEvaluationId, user?.id],
        queryFn: async () => {
            if (!selectedEvaluationId || !user) return [];
            return await gradeService.getQuestions(selectedEvaluationId, user.id);
        },
        enabled: !!selectedEvaluationId && !!user
    });

    // Fetch results for selected evaluation
    const { data: currentResults = [], isLoading: loadingResults } = useQuery({
        queryKey: ['evaluation_results', selectedEvaluationId, user?.id],
        queryFn: () => (selectedEvaluationId && user) ? gradeService.getResults(user.id, selectedEvaluationId) : Promise.resolve([]),
        enabled: !!selectedEvaluationId && !!user
    });

    // Fetch all results for current context (branch/period)
    const { data: contextResults = [], isLoading: loadingContextResults } = useQuery({
        queryKey: ['context_results', brancheId, periode, user?.id],
        queryFn: () => (evaluations.length > 0 && user) ? gradeService.getResultsForEvaluations(evaluations.map(e => e.id), user.id) : Promise.resolve([]),
        enabled: !!brancheId && !!periode && evaluations.length > 0 && !!user
    });

    // Fetch individual question results
    const { data: questionResults = [], isLoading: loadingQuestionResults } = useQuery({
        queryKey: ['question_results', selectedEvaluationId, user?.id],
        queryFn: () => (selectedEvaluationId && user) ? gradeService.getQuestionResults(selectedEvaluationId, user.id) : Promise.resolve([]),
        enabled: !!selectedEvaluationId && !!user
    });

    // Mutations and NoteTypes via shared hooks
    const mutations = useGradeMutations(selectedEvaluationId);
    const { data: noteTypes = [], isLoading: loadingNoteTypes } = useNoteTypes(user?.id);

    // Fetch deleted evaluations for the trash view
    const { data: deletedEvaluations = [], isLoading: loadingDeleted } = useQuery({
        queryKey: ['deleted_evaluations', user?.id],
        queryFn: () => user ? gradeService.getDeletedEvaluations(user.id) : Promise.resolve([]),
        enabled: !!user
    });

    // Fetch active evaluation details independently of context
    const { data: activeEvalData } = useQuery({
        queryKey: ['evaluation_detail', selectedEvaluationId, user?.id],
        queryFn: () => (selectedEvaluationId && user) ? gradeService.getEvaluationById(selectedEvaluationId, user.id) : Promise.resolve(null),
        enabled: !!selectedEvaluationId && !!user
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
        deletedEvaluations,
        loading: loadingEvaluations || loadingResults || loadingQuestions || loadingQuestionResults || loadingNoteTypes || loadingContextResults || loadingDeleted,
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
