import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getCurrentUser } from '../../../lib/database';
import { User } from '@supabase/supabase-js';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/storage';
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
    loading: boolean;
    fetchInitialData: () => Promise<{ user: User | null; studentsData: Student[] }>;
}

/**
 * useHomeData
 * Hook to fetch and manage initial home page data (user, students, groups)
 */
export const useHomeData = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userName, setUserName] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchInitialData = useCallback(async () => {
        try {
            const user = await getCurrentUser();
            setUser(user);

            if (user) {
                // Fetch User Profile
                const profile = await userService.getProfile(user.id);
                if (profile?.prenom) setUserName(profile.prenom);

                // Fetch Students (Direct fetch for reliability, similar to Presence page logic but all)
                const fetched = await studentService.getStudentsForTeacher(user.id);
                const studentsData = fetched as unknown as Student[];
                setStudents(studentsData);

                // Note: Logic for caching was relying on studentsData which might be stale if inside setStudents callback?
                // For simplicity, we assume delta is enough or we refactor caching.
                // Actually, if we use functional setStudents, we can't easily run the caching logic dependent on the RESULT of merge.
                // Let's simplify: fetchInitialData is usually called ONCE on mount.
                // The 'students' state dependency was likely causing issues if fetchInitialData was re-triggered.
                // But for caching, let's keep it simple.

                // Alternative: Just remove 'students' from dependency if we accept that 'students' is initially empty on first load.
                // But mergeDelta needs the CURRENT students.

                // Better approach for stability:
                // If this is initial load, 'students' is likely empty.
                // If it's a re-fetch, we want latest.

                // Let's rely on functional updates correctly.

                if (studentsData) {
                    // ... caching logic is checking studentsData ...
                    // If we moved merge into functional update, studentsData variable is hard to set out.
                }

                // ...

                // Fix for Groups:
                const groupsData = await groupService.getGroups();
                const typedGroups = groupsData as unknown as Group[];
                setGroups(typedGroups || []);

                // Use functional update to check if we have a selected group
                // Default to 'All Groups' (null) instead of first group
                // setSelectedGroup(prev => {
                //     if (typedGroups?.length > 0 && !prev) {
                //         return typedGroups[0];
                //     }
                //     return prev;
                // });

                return { user, studentsData: studentsData || [] };
            }
            return { user: null, studentsData: [] };
        } catch (err) {
            console.error('Error fetching home data:', err);
            return { user: null, studentsData: [] };
        } finally {
            setLoading(false);
        }
    }, []); // Removed dependencies to prevent loop

    return {
        user,
        userName,
        students,
        groups,
        selectedGroup,
        setSelectedGroup,
        loading,
        fetchInitialData
    };
};
