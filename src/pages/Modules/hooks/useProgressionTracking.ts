import { useState, useEffect } from 'react';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { DragEndEvent } from '@dnd-kit/core';

/**
 * useProgressionTracking
 * Manages progression fetching, updates, and Kanban drag-drop
 * 
 * @param {string} detailTab - Current active tab
 * @param {array} moduleActivities - All activities in current module
 * @param {object} selectedModule - Currently selected module
 * @param {function} setModules - Update modules for optimistic updates
 * @param {function} setStats - Update activity stats
 * @returns {object} Progression tracking state and actions
 */
export function useProgressionTracking(
    detailTab: string,
    moduleActivities: any[],
    selectedModule: any,
    setModules: React.Dispatch<React.SetStateAction<any[]>>,
    setStats: React.Dispatch<React.SetStateAction<Record<string, any>>>
) {
    const [progressions, setProgressions] = useState<any[]>([]);
    const [loadingProgressions, setLoadingProgressions] = useState(false);
    const [selectedProgressionActivity, setSelectedProgressionActivity] = useState<any | null>(null);

    // Fetch progressions for an activity
    const fetchProgressions = async (activityId: string) => {
        if (!activityId) return;
        setLoadingProgressions(true);
        try {
            const data = await trackingService.fetchProgressionsByActivity(activityId);
            setProgressions(data || []);
        } catch (err) {
            console.error('Error fetching progressions:', err);
        } finally {
            setLoadingProgressions(false);
        }
    };

    // Update progression status
    const updateProgressionStatus = async (progressionId: string, newStatus: string) => {
        // Optimistic UI
        const oldProgressions = [...progressions];
        setProgressions(prev => prev.map(p =>
            p.id === progressionId ? { ...p, etat: newStatus } : p
        ));

        try {
            await trackingService.updateProgressionStatus(progressionId, newStatus);
        } catch (err) {
            // Revert on error
            setProgressions(oldProgressions);
            console.error('Error updating progression:', err);
        }
    };

    // Handle Kanban drag-drop
    const handleProgressionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const progressionId = active.id as string;
        const newStatus = over.id as string; // Column id is the status string

        const currentProgression = progressions.find(p => p.id === progressionId);
        if (!currentProgression || currentProgression.etat === newStatus) return;

        const validStatuses = ['a_commencer', 'besoin_d_aide', 'a_verifier', 'termine', 'a_domicile'];
        if (!validStatuses.includes(newStatus)) return;

        // Optimistically update module progress
        if (selectedModule) {
            setModules(prev => prev.map(m => {
                if (m.id === selectedModule.id) {
                    let { totalProgressions = 0, completedProgressions = 0 } = m;

                    const isNewCompleted = newStatus === 'termine';
                    const isOldCompleted = currentProgression.etat === 'termine';

                    if (isNewCompleted && !isOldCompleted) {
                        completedProgressions++;
                    } else if (!isNewCompleted && isOldCompleted) {
                        completedProgressions--;
                    }

                    return {
                        ...m,
                        totalProgressions,
                        completedProgressions,
                        percent: totalProgressions > 0 ? Math.round((completedProgressions / totalProgressions) * 100) : 0
                    };
                }
                return m;
            }));
        }

        // Optimistically update activity stats
        if (selectedProgressionActivity) {
            setStats(prev => {
                const currentStats = prev[selectedProgressionActivity.id];
                if (!currentStats) return prev;

                let { total, completed } = currentStats;

                const isNewCompleted = newStatus === 'termine';
                const isOldCompleted = currentProgression.etat === 'termine';

                if (isNewCompleted && !isOldCompleted) {
                    completed++;
                } else if (!isNewCompleted && isOldCompleted) {
                    completed--;
                }

                return {
                    ...prev,
                    [selectedProgressionActivity.id]: {
                        total,
                        completed,
                        completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0
                    }
                };
            });
        }

        updateProgressionStatus(progressionId, newStatus);
    };

    // Fetch progressions when tab or activity changes
    useEffect(() => {
        if (detailTab === 'progression' && selectedProgressionActivity) {
            fetchProgressions(selectedProgressionActivity.id);
        }
    }, [detailTab, selectedProgressionActivity]);

    // Set first activity as default when switching to progression tab
    useEffect(() => {
        if (detailTab === 'progression' && moduleActivities.length > 0 && !selectedProgressionActivity) {
            setSelectedProgressionActivity(moduleActivities[0]);
        }
    }, [detailTab, moduleActivities]);

    return {
        states: {
            progressions,
            loadingProgressions,
            selectedProgressionActivity
        },
        actions: {
            setSelectedProgressionActivity,
            handleProgressionDragEnd
        }
    };
}
