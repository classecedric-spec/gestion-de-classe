import { useState, useCallback } from 'react';
import { getCurrentUser } from '../../../lib/database';
import { User } from '@supabase/supabase-js';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/storage';
import { mergeDelta } from '../../../lib/sync';
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

                // Fetch Students with Delta Sync (incremental loading)
                let studentsData: Student[] | undefined;

                const { delta, isFirstSync } = await studentService.getStudentsDelta(user.id);

                if (isFirstSync) {
                    studentsData = delta as unknown as Student[];
                } else {
                    studentsData = mergeDelta(students, delta) as unknown as Student[];
                }

                if (studentsData) {
                    // Apply photo caching if enabled
                    if (isCacheEnabled() && studentsData) {
                        const studentsWithCache = await Promise.all(
                            studentsData.map(async (student) => {
                                if (student.photo_hash) {
                                    const cachedPhoto = await getCachedPhoto(student.id!, student.photo_hash);
                                    if (cachedPhoto) {
                                        return { ...student, photo_base64: cachedPhoto };
                                    } else if ((student as any).photo_base64) {
                                        await setCachedPhoto(student.id!, (student as any).photo_base64, student.photo_hash);
                                    }
                                }
                                return student;
                            })
                        );
                        setStudents(studentsWithCache || []);
                    } else {
                        setStudents(studentsData || []);
                    }
                }

                // Fetch Groups
                const groupsData = await groupService.getGroups();
                const typedGroups = groupsData as unknown as Group[];
                setGroups(typedGroups || []);
                // Only set first group as default if no group is currently selected
                if (typedGroups?.length > 0 && !selectedGroup) {
                    setSelectedGroup(typedGroups[0]);
                }

                return { user, studentsData: studentsData || [] };
            }
            return { user: null, studentsData: [] };
        } catch (err) {
            console.error('Error fetching home data:', err);
            return { user: null, studentsData: [] };
        } finally {
            setLoading(false);
        }
    }, [students, selectedGroup]);

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
