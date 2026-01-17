import { useMemo } from 'react';

/**
 * useModuleSpans - Hook pour calculer les spans de modules dans le header
 */
export const useModuleSpans = (activities) => {
    const moduleSpans = useMemo(() => {
        const spans = [];
        if (activities.length === 0) return spans;

        let currentModuleId = null;
        let currentSpan = { id: null, nom: '', count: 0 };

        activities.forEach(act => {
            const modId = act.Module?.id;
            const modNom = act.Module?.nom;

            if (modId !== currentModuleId) {
                if (currentSpan.count > 0) {
                    spans.push(currentSpan);
                }
                currentModuleId = modId;
                currentSpan = { id: modId, nom: modNom, count: 1 };
            } else {
                currentSpan.count++;
            }
        });

        if (currentSpan.count > 0) {
            spans.push(currentSpan);
        }

        return spans;
    }, [activities]);

    const lastActivityIds = useMemo(() => {
        const lastIds = new Set();
        const gridLastActivityId = activities.length > 0 ? activities[activities.length - 1].id : null;

        moduleSpans.forEach(span => {
            const moduleActivities = activities.filter(a => a.Module?.id === span.id);
            if (moduleActivities.length > 0) {
                const lastId = moduleActivities[moduleActivities.length - 1].id;
                if (lastId !== gridLastActivityId) {
                    lastIds.add(lastId);
                }
            }
        });
        return lastIds;
    }, [moduleSpans, activities]);

    return { moduleSpans, lastActivityIds };
};
