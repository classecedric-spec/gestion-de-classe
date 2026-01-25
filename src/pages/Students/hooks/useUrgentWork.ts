import { useMemo } from 'react';
import { compareUrgentItems } from '../../../features/progression/utils/urgentSorting';

export const useUrgentWork = (studentProgress: any[]) => {
    return useMemo(() => {
        const now = new Date();
        const overdueModules: Record<string, any> = {};
        let totalOverdueCount = 0;

        studentProgress.forEach(p => {
            const module = p.Activite?.Module;

            // Check if overdue: not finished AND deadline passed AND module is 'en_cours'
            // Broadening filter: Exclude 'termine' and 'a_verifier'
            const isActivityInProgress = p.etat !== 'termine' && p.etat !== 'a_verifier';
            const hasDeadline = !!module?.date_fin;

            // Note: date_fin is typically YYYY-MM-DD 00:00:00. 
            // If date_fin is Today, new Date(today) < now (after 00:00) is TRUE.
            // So "Today or Before" is covered by < now.
            const isDeadlineReached = hasDeadline && new Date(module.date_fin!) < now;

            // USER REQUEST: Only modules "en cours" (exclude 'archive', 'preparation')
            const isModuleActive = module?.statut === 'en_cours';

            if (isActivityInProgress && isDeadlineReached && isModuleActive) {
                const moduleId = p.Activite.Module.id;
                if (!overdueModules[moduleId]) {
                    overdueModules[moduleId] = {
                        ...module,
                        activities: []
                    };
                }
                overdueModules[moduleId].activities.push(p);
                totalOverdueCount++;
            }
        });

        const sortedModules = Object.values(overdueModules).sort(compareUrgentItems);

        return {
            modules: sortedModules,
            count: totalOverdueCount,
            hasWork: totalOverdueCount > 0
        };
    }, [studentProgress]);
};
