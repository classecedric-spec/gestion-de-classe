import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * useGroupsData - Hook pour la gestion des groupes
 */
export const useGroupsData = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Groupe')
                .select('id, nom, acronyme, ordre, photo_url')
                .order('ordre', { ascending: true })
                .order('nom');

            if (error) throw error;
            setGroups(data || []);

            // Re-sync selected group if it was updated
            if (selectedGroup) {
                const updated = data.find(g => g.id === selectedGroup.id);
                if (updated) setSelectedGroup(updated);
            } else if (data && data.length > 0) {
                setSelectedGroup(data[0]);
            }
        } catch (error) {
            // Fallback for missing 'ordre' column
            if (error.code === '42703' || error.message?.includes('does not exist')) {
                const { data: fallbackData } = await supabase.from('Groupe').select('id, nom, acronyme, photo_url').order('nom');
                setGroups(fallbackData || []);

                if (selectedGroup) {
                    const updated = fallbackData?.find(g => g.id === selectedGroup.id);
                    if (updated) setSelectedGroup(updated);
                } else if (fallbackData && fallbackData.length > 0) {
                    setSelectedGroup(fallbackData[0]);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    const fetchClasses = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('Classe')
                .select('id, nom')
                .order('nom');
            if (error) throw error;
            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    }, []);

    const handleDeleteGroup = useCallback(async (groupId) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('Groupe').delete().eq('id', groupId);
            if (error) throw error;

            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null);
            }

            await fetchGroups();
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    }, [selectedGroup, fetchGroups]);

    const handleDragEnd = useCallback(async (event) => {
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
                supabase
                    .from('Groupe')
                    .update({ ordre: index })
                    .eq('id', g.id)
            ));
        } catch (error) {
            // Revert on error
            fetchGroups();
        }
    }, [groups, fetchGroups]);

    const filteredGroups = groups.filter(g =>
        g.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.acronyme?.toLowerCase().includes(searchQuery.toLowerCase())
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
        handleDeleteGroup,
        handleDragEnd
    };
};
