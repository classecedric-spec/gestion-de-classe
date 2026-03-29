import { useUserPreferences } from '../../../hooks/useUserPreferences';
import { useCallback } from 'react';

export interface Period {
    id: string;
    label: string;
    ordre: number;
}

const DEFAULT_PERIODS: Period[] = [
    { id: 'trimestre_1', label: 'Trimestre 1', ordre: 0 },
    { id: 'trimestre_2', label: 'Trimestre 2', ordre: 1 },
    { id: 'trimestre_3', label: 'Trimestre 3', ordre: 2 },
];

const PREFERENCE_KEY = 'grades_periods_v1';

/**
 * usePeriods
 * Manages user-defined evaluation periods stored in UserPreference.
 * Returns the list of periods plus CRUD operations.
 */
export function usePeriods() {
    const [periods, setPeriods, loading] = useUserPreferences<Period[]>(PREFERENCE_KEY, DEFAULT_PERIODS);

    const addPeriod = useCallback(async (label: string) => {
        const newPeriod: Period = {
            id: `period_${Date.now()}`,
            label,
            ordre: periods.length
        };
        await setPeriods([...periods, newPeriod]);
    }, [periods, setPeriods]);

    const updatePeriod = useCallback(async (id: string, label: string) => {
        const updated = periods.map(p => p.id === id ? { ...p, label } : p);
        await setPeriods(updated);
    }, [periods, setPeriods]);

    const deletePeriod = useCallback(async (id: string) => {
        const filtered = periods.filter(p => p.id !== id).map((p, i) => ({ ...p, ordre: i }));
        await setPeriods(filtered);
    }, [periods, setPeriods]);

    const reorderPeriods = useCallback(async (reordered: Period[]) => {
        await setPeriods(reordered.map((p, i) => ({ ...p, ordre: i })));
    }, [setPeriods]);

    // Sorted for display
    const sortedPeriods = [...periods].sort((a, b) => a.ordre - b.ordre);

    // Options for the Select/dropdown (label as value, since Evaluation.periode stores the text)
    const periodOptions = sortedPeriods.map(p => ({
        value: p.label,
        label: p.label
    }));

    return {
        periods: sortedPeriods,
        periodOptions,
        loading,
        addPeriod,
        updatePeriod,
        deletePeriod,
        reorderPeriods
    };
}
