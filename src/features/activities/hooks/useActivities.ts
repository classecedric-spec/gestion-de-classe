import { useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { activityService, ActivityWithRelations } from '../services/activityService';

interface AvailableModule {
    id: string;
    nom: string;
}

interface UseActivitiesReturn {
    activities: ActivityWithRelations[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: Dispatch<SetStateAction<string>>;
    statusFilter: string;
    setStatusFilter: Dispatch<SetStateAction<string>>;
    moduleFilter: string;
    setModuleFilter: Dispatch<SetStateAction<string>>;
    filteredActivities: ActivityWithRelations[];
    availableModules: AvailableModule[];
    fetchActivities: () => Promise<void>;
    deleteActivity: (id: string) => Promise<boolean>;
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>;
}

export const useActivities = (): UseActivitiesReturn => {
    const [activities, setActivities] = useState<ActivityWithRelations[]>([]);
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

            // Note: Schema has isActive but JS code uses statut. 
            // For now, we keep the logic but use any/cast if needed, 
            // or adapt to schema. JS code: a.Module?.statut
            const moduleStatut = a.Module?.statut;
            const matchesStatus = statusFilter === 'all' ||
                (moduleStatut === statusFilter) ||
                (statusFilter === 'en_preparation' && !moduleStatut);

            const matchesModule = moduleFilter === 'all' || a.module_id === moduleFilter;

            return matchesSearch && matchesStatus && matchesModule;
        });
    }, [activities, searchTerm, statusFilter, moduleFilter]);

    const availableModules = useMemo(() => {
        const modulesMap = new Map<string, string>();
        activities.forEach(a => {
            if (!a.Module || !a.module_id) return;

            const moduleStatut = a.Module?.statut;
            const matchesStatus = statusFilter === 'all' ||
                (moduleStatut === statusFilter) ||
                (statusFilter === 'en_preparation' && !moduleStatut);

            if (matchesStatus && a.Module?.nom) {
                modulesMap.set(a.module_id, a.Module.nom);
            }
        });

        return Array.from(modulesMap.entries())
            .map(([id, nom]) => ({ id, nom }))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [activities, statusFilter]);

    const deleteActivity = async (id: string) => {
        const previousActivities = [...activities];

        // Optimistic UI Update
        setActivities(prev => prev.filter(a => a.id !== id));

        try {
            await activityService.deleteActivity(id);
            return true;
        } catch (error) {
            console.error("Error deleting activity:", error);
            // Revert on error
            setActivities(previousActivities);
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
        setActivities
    };
};
