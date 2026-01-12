import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * useActivityManagement
 * Manages activities for a module (CRUD, ordering, drag-drop)
 * 
 * @param {object} selectedModule - Currently selected module
 * @param {function} setModules - Update modules state (for optimistic updates)
 * @param {function} setSelectedModule - Update selected module
 * @returns {object} Activity management state and actions
 */
export function useActivityManagement(selectedModule, setModules, setSelectedModule) {
    const [moduleActivities, setModuleActivities] = useState([]);
    const [activityToEdit, setActivityToEdit] = useState(null);
    const [stats, setStats] = useState({});

    // Update activities when module changes
    useEffect(() => {
        if (selectedModule && selectedModule.Activite) {
            const sorted = [...selectedModule.Activite].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
            setModuleActivities(sorted);
        } else {
            setModuleActivities([]);
        }
    }, [selectedModule]);

    // Fetch stats for all activities
    useEffect(() => {
        const fetchStats = async () => {
            if (!moduleActivities.length) return;

            const activityIds = moduleActivities.map(a => a.id);
            if (activityIds.length === 0) return;

            const { data, error } = await supabase
                .from('Progression')
                .select('activite_id, etat')
                .in('activite_id', activityIds);

            if (error) return;

            const newStats = {};
            activityIds.forEach(id => {
                const activityProgressions = data.filter(p => p.activite_id === id);
                const total = activityProgressions.length;
                const completed = activityProgressions.filter(p => p.etat === 'termine').length;
                newStats[id] = {
                    total,
                    completed,
                    percent: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            });
            setStats(newStats);
        };

        fetchStats();
    }, [moduleActivities]);

    // Handle drag end (reorder activities)
    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!active || !over || active.id === over.id) return;

        const oldIndex = moduleActivities.findIndex((item) => item.id === active.id);
        const newIndex = moduleActivities.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(moduleActivities, oldIndex, newIndex);

        // Update local state
        setModuleActivities(newItems);

        // Prepare updates for database
        const updates = newItems.map((item, index) => ({
            id: item.id,
            ordre: index + 1,
            titre: item.titre,
            module_id: item.module_id,
            user_id: item.user_id
        }));

        // Optimistically update global modules state
        setModules(prev => prev.map(m => {
            if (m.id === selectedModule.id) {
                const updatedActivities = m.Activite.map(act => {
                    const update = updates.find(u => u.id === act.id);
                    return update ? { ...act, ordre: update.ordre } : act;
                }).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

                const updatedModule = { ...m, Activite: updatedActivities };
                setSelectedModule(updatedModule);
                return updatedModule;
            }
            return m;
        }));

        // Persist to database
        await updateActivitiesOrder(updates);
    };

    // Update activities order in database
    const updateActivitiesOrder = async (updates) => {
        try {
            const { error } = await supabase
                .from('Activite')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;
        } catch (err) {
            console.error('Error updating activities order:', err);
            // Could refetch modules here to revert
        }
    };

    return {
        states: {
            moduleActivities,
            activityToEdit,
            stats
        },
        actions: {
            setActivityToEdit,
            setModuleActivities,
            setStats,
            handleDragEnd
        }
    };
}
