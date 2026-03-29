import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import { Tables } from '../../../types/supabase';
import { groupService } from '../../../features/groups/services/groupService';
import { classService } from '../../../features/classes/services/classService';
import { getCurrentUser } from '../../../lib/database';

/**
 * useGroupsData - Hook pour la gestion des groupes
 */
export const useGroupsData = () => {
    const queryClient = useQueryClient();
    const [selectedGroup, setSelectedGroup] = useState<Tables<'Groupe'> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // 0. User fetching
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Fetching des groupes
    const { data: groups = [], isLoading: loading } = useQuery({
        queryKey: ['groups', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const data = await groupService.getGroups();
            return data || [];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });


    // 2. Fetching des classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const data = await classService.getClasses();
            return data || [];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // Set initial selected group
    useEffect(() => {
        if (!selectedGroup && groups.length > 0) {
            setSelectedGroup(groups[0]);
        } else if (selectedGroup) {
            // Re-sync if the current group was updated in the list
            const updated = groups.find(g => g.id === selectedGroup.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedGroup)) {
                setSelectedGroup(updated);
            }
        }
    }, [groups, selectedGroup]);

    // 3. Mutations
    const createGroupMutation = useMutation({
        mutationFn: (groupData: { nom: string; acronyme?: string; photo_url?: string;[key: string]: any }) => groupService.createGroup(groupData as any),
        onMutate: async (newGroupData) => {
            const queryKey = ['groups', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousGroups = queryClient.getQueryData<Tables<'Groupe'>[]>(queryKey) || [];

            const tempGroup = {
                id: 'temp-' + Date.now(),
                ...newGroupData,
                created_at: new Date().toISOString()
            } as Tables<'Groupe'>;

            queryClient.setQueryData<Tables<'Groupe'>[]>(queryKey, [tempGroup, ...previousGroups]);
            setSelectedGroup(tempGroup);

            return { previousGroups, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGroups) {
                queryClient.setQueryData(context.queryKey, context.previousGroups);
            }
        },
        onSuccess: (data: any) => {
            if (data && data.id) {
                setSelectedGroup(data);
                queryClient.setQueryData<Tables<'Groupe'>[]>(['groups', user?.id], (old = []) =>
                    old.map(g => g.id.startsWith('temp-') ? { ...g, ...data } : g)
                );
            }
            // Sync with server to get clean data
            queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: (groupId: string) => groupService.deleteGroup(groupId),
        onMutate: async (groupId) => {
            const queryKey = ['groups', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousGroups = queryClient.getQueryData<Tables<'Groupe'>[]>(queryKey) || [];

            queryClient.setQueryData<Tables<'Groupe'>[]>(queryKey,
                previousGroups.filter(g => g.id !== groupId)
            );

            if (selectedGroup?.id === groupId) {
                const remaining = previousGroups.filter(g => g.id !== groupId);
                setSelectedGroup(remaining.length > 0 ? remaining[0] : null);
            }

            return { previousGroups, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGroups) {
                queryClient.setQueryData(context.queryKey, context.previousGroups);
            }
            queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
        }
    });

    const updateOrderMutation = useMutation({
        mutationFn: async (newGroups: Tables<'Groupe'>[]) => {
            await Promise.all(newGroups.map((g, index) =>
                groupService.updateGroupOrder(g.id, index)
            ));
        },
        onMutate: async (newGroups) => {
            const queryKey = ['groups', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousGroups = queryClient.getQueryData(queryKey);
            queryClient.setQueryData(queryKey, newGroups);
            return { previousGroups, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGroups) queryClient.setQueryData(context.queryKey, context.previousGroups);
            queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
        }
    });

    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = groups.findIndex(g => g.id === active.id);
        const newIndex = groups.findIndex(g => g.id === over.id);

        const newGroups = arrayMove(groups, oldIndex, newIndex);
        updateOrderMutation.mutate(newGroups);
    }, [groups, updateOrderMutation]);

    const handleAddGroup = useCallback((groupData: { nom: string; acronyme?: string; photo_url?: string }) => {
        createGroupMutation.mutate(groupData as any);
    }, [createGroupMutation]);

    const filteredGroups = groups.filter(g =>
        g.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
        groups,
        selectedGroup,
        setSelectedGroup,
        classes,
        loading,
        searchQuery,
        setSearchQuery,
        filteredGroups,
        fetchGroups: () => queryClient.invalidateQueries({ queryKey: ['groups', user?.id] }),
        handleAddGroup,
        handleDeleteGroup: (id: string) => deleteGroupMutation.mutate(id),
        handleDragEnd,
        createGroupMutation // Export it for high-level control if needed
    };
};
