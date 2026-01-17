import { useState, useEffect, useMemo, useCallback } from 'react';
import { activityService } from '../services/activityService';

export const useActivities = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, en_preparation, en_cours, archive
    const [moduleFilter, setModuleFilter] = useState('all'); // all or module_id

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const data = await activityService.fetchActivities();
            setActivities(data);
        } catch (error) {
            console.error("Error fetching activities:", error);
            // Optionally handle error state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    // Reset module filter when status filter changes
    useEffect(() => {
        setModuleFilter('all');
    }, [statusFilter]);

    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            const matchesSearch = a.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.Module?.nom && a.Module.nom.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (a.Module?.statut === statusFilter) ||
                (statusFilter === 'en_preparation' && !a.Module?.statut);

            const matchesModule = moduleFilter === 'all' || a.module_id === moduleFilter;

            return matchesSearch && matchesStatus && matchesModule;
        });
    }, [activities, searchTerm, statusFilter, moduleFilter]);

    const availableModules = useMemo(() => {
        const modulesMap = new Map();
        activities.forEach(a => {
            if (!a.Module) return;

            const matchesStatus = statusFilter === 'all' ||
                (a.Module.statut === statusFilter) ||
                (statusFilter === 'en_preparation' && !a.Module.statut);

            if (matchesStatus) {
                modulesMap.set(a.module_id, a.Module.nom);
            }
        });

        return Array.from(modulesMap.entries())
            .map(([id, nom]) => ({ id, nom }))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [activities, statusFilter]);

    const deleteActivity = async (id) => {
        try {
            await activityService.deleteActivity(id);
            // Optimistic update or refetch
            setActivities(prev => prev.filter(a => a.id !== id));
            return true;
        } catch (error) {
            console.error("Error deleting activity:", error);
            return false;
        }
    };

    return {
        activities,
        loading,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        moduleFilter,
        setModuleFilter,
        filteredActivities,
        availableModules,
        fetchActivities,
        deleteActivity,
        setActivities // Exposed for manual updates if needed
    };
};
