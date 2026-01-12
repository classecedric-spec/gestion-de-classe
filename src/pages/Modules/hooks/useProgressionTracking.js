import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

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
export function useProgressionTracking(detailTab, moduleActivities, selectedModule, setModules, setStats) {
    const [progressions, setProgressions] = useState([]);
    const [loadingProgressions, setLoadingProgressions] = useState(false);
    const [selectedProgressionActivity, setSelectedProgressionActivity] = useState(null);

    // Fetch progressions for an activity
    const fetchProgressions = async (activityId) => {
        if (!activityId) return;
        setLoadingProgressions(true);
        try {
            const { data, error } = await supabase
                .from('Progression')
                .select('*, Eleve(nom, prenom, photo_base64, EleveGroupe(Groupe(nom)))')
                .eq('activite_id', activityId);

            if (error) throw error;
            setProgressions(data || []);
        } catch (err) {
            console.error('Error fetching progressions:', err);
        } finally {
            setLoadingProgressions(false);
        }
    };

    // Update progression status
    const updateProgressionStatus = async (progressionId, newStatus) => {
        // Optimistic UI
        const oldProgressions = [...progressions];
        setProgressions(prev => prev.map(p =>
            p.id === progressionId ? { ...p, etat: newStatus } : p
        ));

        try {
            const { error } = await supabase
                .from('Progression')
                .update({ etat: newStatus })
                .eq('id', progressionId);

            if (error) throw error;
        } catch (err) {
            // Revert on error
            setProgressions(oldProgressions);
            console.error('Error updating progression:', err);
        }
    };

    // Handle Kanban drag-drop
    const handleProgressionDragEnd = (event) => {
        const { active, over } = event;

        if (!over) return;

        const progressionId = active.id;
        const newStatus = over.id; // Column id is the status string

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
                        percent: total > 0 ? Math.round((completed / total) * 100) : 0
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
