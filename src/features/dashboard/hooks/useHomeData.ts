import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
import { User } from '@supabase/supabase-js';
import { Student, Group } from '../../attendance/services/attendanceService';
import { studentService } from '../../students/services/studentService';
import { groupService } from '../../groups/services/groupService';
import { userService } from '../../users/services/userService';

export interface HomeData {
    user: User | null;
    userName: string;
    students: Student[];
    groups: Group[];
    selectedGroup: Group | null;
    setSelectedGroup: React.Dispatch<React.SetStateAction<Group | null>>;
    loading: boolean;
    refetch: () => Promise<void>;
}

/**
 * useHomeData
 * Hook to fetch and manage initial home page data (user, students, groups)
 * using React Query for robust caching and retries.
 */
export const useHomeData = (userId?: string) => {
    const queryClient = useQueryClient();
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // Local state for user profile name
    const [userName, setUserName] = useState('');

    // 1. Resolve effective User ID
    const [effectiveUser, setEffectiveUser] = useState<User | null>(null);

    useEffect(() => {
        if (userId) {
            setEffectiveUser({ id: userId } as User);
        } else {
            getCurrentUser().then(u => setEffectiveUser(u));
        }
    }, [userId]);

    const resolvedUserId = userId || effectiveUser?.id;

    // 2. Fetch Students
    const {
        data: students = [],
        isLoading: loadingStudents,
        refetch: refetchStudents
    } = useQuery({
        queryKey: ['students', resolvedUserId],
        queryFn: async () => {
            if (!resolvedUserId) return [];
            const data = await studentService.getStudentsForTeacher(resolvedUserId);
            return data as unknown as Student[];
        },
        enabled: !!resolvedUserId,
        retry: 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 3. Fetch Groups
    const {
        data: groups = [],
        isLoading: loadingGroups,
        refetch: refetchGroups
    } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const data = await groupService.getGroups();
            return (data as unknown as Group[]) || [];
        },
        retry: 2,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // 4. Fetch User Profile Name (Side effect)
    useEffect(() => {
        const fetchProfile = async () => {
            if (resolvedUserId && !userName) {
                const profile = await userService.getProfile(resolvedUserId);
                if (profile?.prenom) setUserName(profile.prenom);
            }
        };
        fetchProfile();
    }, [resolvedUserId, userName]);

    // Combined Loading State
    const loading = !resolvedUserId || loadingStudents;

    // Manual refetch wrapper
    const refetch = async () => {
        await Promise.all([refetchStudents(), refetchGroups()]);
    };

    return {
        user: effectiveUser,
        userName,
        students,
        groups,
        selectedGroup,
        setSelectedGroup,
        loading,
        refetch
    };
};
