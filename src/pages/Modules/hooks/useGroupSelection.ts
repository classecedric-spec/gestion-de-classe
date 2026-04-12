import { useState, useEffect } from 'react';
import { groupService } from '../../../features/groups/services/groupService';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

/**
 * useGroupSelection
 * Manages group fetching and selection for progression generation
 * 
 * @param {string} detailTab - Current active tab
 * @returns {object} Group selection state and actions
 */
export function useGroupSelection(detailTab: string) {
    const [groups, setGroups] = useState<Tables<'Groupe'>[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

    // Fetch groups
    const fetchGroups = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const data = await groupService.getGroups(user.id);
            setGroups(data || []);
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    // Fetch groups when switching to groups tab
    useEffect(() => {
        if (detailTab === 'groups') {
            fetchGroups();
        }
    }, [detailTab]);

    // Toggle group selection
    const handleToggleGroup = (groupId: string) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    return {
        states: {
            groups,
            selectedGroups
        },
        actions: {
            handleToggleGroup,
            setSelectedGroups
        }
    };
}
