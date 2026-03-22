import { useQuery } from '@tanstack/react-query';
import { gradeService } from '../services';

/**
 * useAllEvaluations
 * Context-free hook that fetches ALL evaluations with their related data
 * (Branche, Groupe, TypeNote) and ALL results for stats computation.
 */
export const useAllEvaluations = () => {
    // Fetch all evaluations with joins and precomputed stats (from EvaluationWithStats view)
    const {
        data: evaluations = [],
        isLoading: loading,
        refetch
    } = useQuery({
        queryKey: ['all_evaluations_detailed'],
        queryFn: () => gradeService.getAllEvaluationsDetailed(),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Map stats from the view to the naming convention used by the component
    const evaluationsWithStats = evaluations.map((ev: any) => ({
        ...ev,
        _brancheName: ev.Branche?.nom || '-',
        _groupeName: ev.Groupe?.nom || '-',
        _typeNoteName: ev.TypeNote?.nom || '-',
        _nbResultats: ev.nb_resultats || 0,
        _moyenne: ev.moyenne,
        _noteMaxResult: ev.note_max_result,
        _noteMinResult: ev.note_min_result,
    }));

    return {
        evaluations: evaluationsWithStats,
        loading,
        refetch
    };
};
