import { useQuery, useQueryClient } from '@tanstack/react-query';
import { trackingService } from '../features/tracking/services/trackingService';
import { processModules } from '../lib/helpers/mobileEncodingHelpers';

/**
 * Hook for fetching modules and activities data for a specific student
 */
export const useModulesData = (studentId: string | null, levelId: string | null) => {
    const queryClient = useQueryClient();

    // 1. Fetch modules and progressions map
    const { data, isLoading: loading } = useQuery({
        queryKey: ['modules', studentId, levelId],
        queryFn: async () => {
            if (!studentId || !levelId) return { modules: [], progressions: {} };

            const [modulesData, progMap] = await Promise.all([
                trackingService.getMobileModules(),
                trackingService.fetchStudentProgressionsMap(studentId)
            ]);

            const processedModules = processModules(modulesData || [], levelId, progMap);
            return { modules: processedModules, progressions: progMap };
        },
        enabled: !!studentId && !!levelId,
        staleTime: 1000 * 60 * 5,
    });

    const modules = data?.modules || [];
    const progressions = data?.progressions || {};

    const updateProgression = (_activityId: string, _newStatus: string) => {
        // With global realtime, we just need to invalidate the query
        // The actual DB update happened elsewhere
        queryClient.invalidateQueries({ queryKey: ['modules', studentId, levelId] });
    };

    return { modules, progressions, loading, updateProgression };
};
