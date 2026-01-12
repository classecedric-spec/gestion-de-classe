import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * useGroupSelection
 * Manages group fetching and selection for progression generation
 * 
 * @param {string} detailTab - Current active tab
 * @returns {object} Group selection state and actions
 */
export function useGroupSelection(detailTab) {
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Fetch groups
    const fetchGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('Groupe')
                .select('*, Classe(nom)')
                .order('nom');

            if (error) throw error;
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
    const handleToggleGroup = (groupId) => {
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
