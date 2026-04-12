import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { activityService } from '../../../features/activities/services/activityService';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { supabase } from '../../../lib/database';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import { ModuleWithRelations, Activite } from '../utils/moduleHelpers';
import { TablesInsert } from '../../../types/supabase';

interface ActivityStats {
    total: number;
    completed: number;
    percent: number;
}

interface ActivityManagementReturn {
    states: {
        moduleActivities: Activite[];
        activityToEdit: Activite | null;
        stats: Record<string, ActivityStats>;
    };
    actions: {
        setActivityToEdit: Dispatch<SetStateAction<Activite | null>>;
        setModuleActivities: Dispatch<SetStateAction<Activite[]>>;
        setStats: Dispatch<SetStateAction<Record<string, ActivityStats>>>;
        handleDragEnd: (event: any) => Promise<void>;
        deleteActivity: (id: string) => Promise<void>;
    };
}

/**
 * useActivityManagement
 * Manages activities for a module (CRUD, ordering, drag-drop)
 */
export function useActivityManagement(
    selectedModule: ModuleWithRelations | null,
    setModules: Dispatch<SetStateAction<ModuleWithRelations[]>>,
    setSelectedModule: Dispatch<SetStateAction<ModuleWithRelations | null>>
): ActivityManagementReturn {
    const [moduleActivities, setModuleActivities] = useState<Activite[]>([]);
    const [activityToEdit, setActivityToEdit] = useState<Activite | null>(null);
    const [stats, setStats] = useState<Record<string, ActivityStats>>({});

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

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const data = await trackingService.getProgressionStatsForActivities(activityIds, user.id);

                const newStats: Record<string, ActivityStats> = {};
                activityIds.forEach(id => {
                    const activityProgressions = (data || []).filter(p => p.activite_id === id);
                    const total = activityProgressions.length;
                    const completed = activityProgressions.filter(p => p.etat === 'termine').length;
                    newStats[id] = {
                        total,
                        completed,
                        percent: total > 0 ? Math.round((completed / total) * 100) : 0
                    };
                });
                setStats(newStats);
            } catch (error) {
                console.error('Error fetching activity stats:', error);
            }
        };

        fetchStats();
    }, [moduleActivities]);

    // Handle drag end (reorder activities)
    const handleDragEnd = async (event: any) => {
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
            if (selectedModule && m.id === selectedModule.id && m.Activite) {
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

    // Delete activity
    const deleteActivity = async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non authentifié.");
            await activityService.deleteActivity(id, user.id);

            // Update local state
            setModuleActivities(prev => prev.filter(a => a.id !== id));

            // Update global state
            if (selectedModule) {
                const updatedActivities = moduleActivities.filter(a => a.id !== id);
                const updatedModule = { ...selectedModule, Activite: updatedActivities };
                setSelectedModule(updatedModule);
                setModules(prev => prev.map(m => m.id === selectedModule.id ? updatedModule : m));
            }

            toast.success("Activité supprimée avec succès");
        } catch (error) {
            console.error('Error deleting activity:', error);
            toast.error("Erreur lors de la suppression de l'activité");
        }
    };

    // Update activities order in database
    const updateActivitiesOrder = async (updates: any[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non authentifié.");
            await activityService.upsertActivities(updates as TablesInsert<'Activite'>[], user.id);
        } catch (err) {
            console.error('Error updating activities order:', err);
            toast.error("Erreur lors de la mise à jour de l'ordre");
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
            handleDragEnd,
            deleteActivity
        }
    };
}
