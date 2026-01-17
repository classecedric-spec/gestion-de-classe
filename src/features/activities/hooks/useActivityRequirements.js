import { useState, useCallback } from 'react';
import { activityService } from '../services/activityService';

export const useActivityRequirements = (selectedActivity, setActivities) => {

    const getRequirementsList = useCallback(() => {
        if (!selectedActivity) return [];

        // Base Requirement
        const baseReq = {
            id: 'base',
            // Use activity ID for the base requirement ID in update logic if needed,
            // but here we mark it with isBase: true to distinguish.
            targetId: selectedActivity.id,
            label: 'Exigence de base',
            nbExercises: selectedActivity.nombre_exercices || 0,
            nbErrors: selectedActivity.nombre_erreurs || 0,
            status: selectedActivity.statut_exigence || 'obligatoire',
            isBase: true
        };

        // Level Specific Requirements
        const levelReqs = (selectedActivity.ActiviteNiveau || [])
            .map(an => ({
                id: an.id,
                targetId: an.id,
                label: an.Niveau?.nom || 'Niveau Inconnu',
                nbExercises: an.nombre_exercices || 0,
                nbErrors: an.nombre_erreurs || 0,
                status: an.statut_exigence || 'obligatoire',
                isBase: false,
                order: an.Niveau?.ordre || 999
            }))
            .sort((a, b) => a.order - b.order);

        return [baseReq, ...levelReqs];
    }, [selectedActivity]);

    const updateRequirement = async (req, field, value) => {
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
                            ActiviteNiveau: a.ActiviteNiveau.map(an =>
                                an.id === req.id ? { ...an, [field]: value } : an
                            )
                        };
                    }
                }
                return a;
            });
        });

        // Current requirement object for revert in case of error (not fully implemented here for brevity, rely on fetch)
        try {
            await activityService.updateRequirement(req.isBase, req.targetId || req.id, field, value);
        } catch (err) {
            console.error("Error updating requirement:", err);
            // Optionally trigger a refetch to revert
        }
    };

    const toggleStatus = async (req) => {
        const newStatus = req.status === 'obligatoire' ? 'facultatif' : 'obligatoire';
        await updateRequirement(req, 'statut_exigence', newStatus);
    };

    return {
        requirements: getRequirementsList(),
        updateRequirement,
        toggleStatus
    };
};
