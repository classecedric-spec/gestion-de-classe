import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Tables } from '../../../types/supabase';
import { groupService } from '../../../features/groups/services/groupService';
import { classService } from '../../../features/classes/services/classService';

/**
 * useGroupsData - Hook pour la gestion des groupes
 */
export const useGroupsData = () => {
    const [groups, setGroups] = useState<Tables<'Groupe'>[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Tables<'Groupe'> | null>(null);
    const [classes, setClasses] = useState<Partial<Tables<'Classe'>>[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await groupService.getGroups();
            setGroups(data || []);

            // Re-sync selected group if it was updated
            if (selectedGroup) {
                const updated = data?.find(g => g.id === selectedGroup.id);
                if (updated) setSelectedGroup(updated);
            } else if (data && data.length > 0) {
                setSelectedGroup(data[0]);
            }
        } catch (error: any) {
            console.error(error);
            // Fallback strategy previously existed but with service we expect standard returns
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    const fetchClasses = useCallback(async () => {
        try {
            const data = await classService.getClasses();
            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    }, []);

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        setLoading(true);
        try {
            await groupService.deleteGroup(groupId);

            // Calculate remaining groups BEFORE updating state
            const remainingGroups = groups.filter(g => g.id !== groupId);

            // Optimistic update: remove group from local state immediately
            setGroups(remainingGroups);

            // If the deleted group was selected, select first remaining group
            if (selectedGroup?.id === groupId) {
                setSelectedGroup(remainingGroups.length > 0 ? remainingGroups[0] : null);
            }
        } catch (error) {
            // On error, refetch to ensure consistency
            await fetchGroups();
            throw error;
        } finally {
            setLoading(false);
        }
    }, [selectedGroup, groups, fetchGroups]);

    const handleAddGroup = useCallback((newGroup: Tables<'Groupe'>) => {
        // Optimistic update: add new group to local state immediately
        setGroups(prev => {
            const updated = [...prev, newGroup];
            return updated.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        });

        // Select the newly created group
        setSelectedGroup(newGroup);
    }, []);

    const handleDragEnd = useCallback(async (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = groups.findIndex(g => g.id === active.id);
        const newIndex = groups.findIndex(g => g.id === over.id);

        // Optimistic Update
        const newGroups = arrayMove(groups, oldIndex, newIndex);
        setGroups(newGroups);

        // Update Backend
        try {
            await Promise.all(newGroups.map((g, index) =>
                groupService.updateGroupOrder(g.id, index)
            ));
        } catch (error) {
            // Revert on error
            fetchGroups();
        }
    }, [groups, fetchGroups]);

    const filteredGroups = groups.filter(g =>
        g.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetchGroups();
        fetchClasses();
    }, []);

    return {
        groups,
        selectedGroup,
        setSelectedGroup,
        classes,
        loading,
        searchQuery,
        setSearchQuery,
        filteredGroups,
        fetchGroups,
        handleAddGroup,
        handleDeleteGroup,
        handleDragEnd
    };
};
