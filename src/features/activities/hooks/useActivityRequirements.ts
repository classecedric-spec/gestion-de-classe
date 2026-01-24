import { useCallback, Dispatch, SetStateAction } from 'react';
import { activityService, ActivityWithRelations } from '../services/activityService';

export interface Requirement {
    id: string;
    targetId: string;
    label: string;
    nbExercises: number;
    nbErrors: number;
    status: string;
    isBase: boolean;
    order?: number;
}

interface UseActivityRequirementsReturn {
    requirements: Requirement[];
    updateRequirement: (req: Requirement, field: string, value: any) => Promise<void>;
    toggleStatus: (req: Requirement) => Promise<void>;
}

export const useActivityRequirements = (
    selectedActivity: ActivityWithRelations | null,
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>
): UseActivityRequirementsReturn => {

    const getRequirementsList = useCallback((): Requirement[] => {
        if (!selectedActivity) return [];

        // Level Specific Requirements
        const levelReqs: Requirement[] = (selectedActivity.ActiviteNiveau || [])
            .map(an => ({
                id: an.id,
                targetId: an.id,
                label: (an as any).Niveau?.nom || 'Niveau Inconnu',
                nbExercises: an.nombre_exercices || 0,
                nbErrors: an.nombre_erreurs || 0,
                status: an.statut_exigence || 'obligatoire',
                isBase: false,
                order: (an as any).Niveau?.ordre || 999
            }))
            .sort((a, b) => (a.order || 999) - (b.order || 999));

        return levelReqs;
    }, [selectedActivity]);

    const updateRequirement = async (req: Requirement, field: string, value: any) => {
        if (!selectedActivity) return;

        // Optimistic update in parent state
        setActivities(prevActivities => {
            return prevActivities.map(a => {
                if (a.id === selectedActivity.id) {
                    if (req.isBase) {
                        return { ...a, [field]: value };
                    } else {
                        // For level requirements, we need to map over ActiviteNiveau
                        return {
                            ...a,
                            ActiviteNiveau: (a.ActiviteNiveau || []).map(an =>
                                an.id === req.id ? { ...an, [field]: value } : an
                            )
                        };
                    }
                }
                return a;
            });
        });

        try {
            await activityService.updateRequirement(req.isBase, req.targetId || req.id, field, value);
        } catch (err) {
            console.error("Error updating requirement:", err);
            // Optionally trigger a refetch to revert
        }
    };

    const toggleStatus = async (req: Requirement) => {
        const newStatus = req.status === 'obligatoire' ? 'facultatif' : 'obligatoire';
        await updateRequirement(req, 'statut_exigence', newStatus);
    };

    return {
        requirements: getRequirementsList(),
        updateRequirement,
        toggleStatus
    };
};
