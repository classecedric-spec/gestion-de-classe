import { useMemo } from 'react';
import { AvancementActivity } from './useStudentsAndActivities';

export interface ModuleSpan {
    id: string | null;
    nom: string | undefined;
    count: number;
}

/**
 * useModuleSpans - Hook pour calculer les spans de modules dans le header
 */
export const useModuleSpans = (activities: AvancementActivity[]) => {
    const moduleSpans = useMemo(() => {
        const spans: ModuleSpan[] = [];
        if (activities.length === 0) return spans;

        let currentModuleId: string | null = null;
        let currentSpan: ModuleSpan = { id: null, nom: '', count: 0 };

        activities.forEach(act => {
            const modId = act.Module?.id || null;
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
        const lastIds = new Set<string>();
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
