import { useState, useEffect } from 'react';
import { trackingService } from '../features/tracking/services/trackingService';
import { processModules } from '../lib/helpers/mobileEncodingHelpers';

/**
 * Hook for fetching modules and activities data for a specific student
 */
export const useModulesData = (studentId: string | null, levelId: string | null) => {
    const [modules, setModules] = useState<any[]>([]);
    const [progressions, setProgressions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (studentId && levelId) {
            fetchModulesAndActivities(studentId, levelId);
        }
    }, [studentId, levelId]);

    const fetchModulesAndActivities = async (sId: string, lId: string) => {
        setLoading(true);

        try {
            // Fetch modules and progressions in parallel
            const [modulesData, progMap] = await Promise.all([
                trackingService.getMobileModules(),
                trackingService.fetchStudentProgressionsMap(sId)
            ]);

            setProgressions(progMap);

            // Process modules (filter by level, calculate stats)
            const processedModules = processModules(modulesData || [], lId, progMap);
            setModules(processedModules);
        } catch (error) {
            console.error("Error fetching mobile modules data:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateProgression = (activityId: string, newStatus: string) => {
        setProgressions(prev => ({
            ...prev,
            [activityId]: newStatus
        }));

        // Update module stats
        setModules(prev => prev.map(m => {
            const isInModule = m.filteredActivities?.some((a: any) => a.id === activityId);
            if (!isInModule) return m;

            const newProgMap = { ...progressions, [activityId]: newStatus };
            const completedActivities = m.filteredActivities.filter((act: any) =>
                newProgMap[act.id] === 'termine' || newProgMap[act.id] === 'a_verifier'
            ).length;

            return {
                ...m,
                completedActivities,
                percent: m.totalActivities > 0 ? Math.round((completedActivities / m.totalActivities) * 100) : 0
            };
        }));
    };

    return { modules, progressions, loading, updateProgression };
};
