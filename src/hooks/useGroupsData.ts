import { useState, useEffect } from 'react';
import { groupService } from '../features/groups/services/groupService';

/**
 * Hook for fetching groups data
 */
export const useGroupsData = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const data = await groupService.getGroups();
            setGroups(data || []);
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    return { groups, loading, refetch: fetchGroups };
};
