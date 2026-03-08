import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityService, ActivityWithRelations } from '../services/activityService';
import { getCurrentUser } from '../../../lib/database';

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
    fetchActivities: () => void;
    deleteActivity: (id: string) => void;
    setActivities: (activities: ActivityWithRelations[]) => void;
}

export const useActivities = (): UseActivitiesReturn => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, en_preparation, en_cours, archive
    const [moduleFilter, setModuleFilter] = useState('all'); // all or module_id

    // 0. User fetching
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Fetching des activités
    const { data: activities = [], isLoading: loading } = useQuery({
        queryKey: ['activities', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await activityService.fetchActivities();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            const matchesSearch = a.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.Module?.nom && a.Module.nom.toLowerCase().includes(searchTerm.toLowerCase()));

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

    const deleteMutation = useMutation({
        mutationFn: (id: string) => activityService.deleteActivity(id),
        onMutate: async (id) => {
            const queryKey = ['activities', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ActivityWithRelations[]>(queryKey);

            if (previous) {
                queryClient.setQueryData<ActivityWithRelations[]>(queryKey,
                    previous.filter(a => a.id !== id)
                );
            }
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['activities', user?.id] });
        }
    });

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
        fetchActivities: () => queryClient.invalidateQueries({ queryKey: ['activities', user?.id] }),
        deleteActivity: (id: string) => deleteMutation.mutate(id),
        setActivities: (newActivities) => queryClient.setQueryData(['activities', user?.id], newActivities)
    };
};
