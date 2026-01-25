import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { useInAppMigration } from '../../../hooks/useInAppMigration';
import { Student, Group } from '../../attendance/services/attendanceService';
import { groupService } from '../../groups/services/groupService';
import { trackingService } from '../services/trackingService';
import { userService } from '../../users/services/userService';

/**
 * useGroupsAndStudents
 * Manages groups, students selection, and navigation from Home page
 * 
 * @returns {object} Groups and students state and actions
 */
export function useGroupsAndStudents() {
    const location = useLocation();

    // Groups
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showGroupSelector, setShowGroupSelector] = useState(false);

    // Students
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Preferences
    const [manualIndices, setManualIndices] = useState<Record<string, any>>({});
    const [rotationSkips, setRotationSkips] = useState<Record<string, any>>({});
    const [defaultLuckyCheckIndex, setDefaultLuckyCheckIndex] = useState<number>(50);

    // Pending student selection (from Home navigation)
    const pendingStudentSelection = useRef<string | null>(null);



    // ... (imports)

    // Fetch groups
    const fetchGroups = async () => {
        await fetchWithCache(
            'groups',
            async () => {
                return await groupService.getGroups();
            },
            setGroups
        );
    };

    // Fetch students for a group
    const fetchStudents = async (groupId: string) => {
        setLoadingStudents(true);
        try {
            await fetchWithCache(
                `students_pedago_${groupId}`,
                async () => {
                    const data = await trackingService.getStudentsForPedago(groupId);
                    return data || [];
                },
                (data) => setStudents(data as Student[]),
                (_err) => {
                    setStudents([]);
                }
            );
        } finally {
            setLoadingStudents(false);
        }
    };

    // Load manual indices (for verification logic)
    const loadManualIndices = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const value = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
        if (value) {
            setManualIndices(value as Record<string, any>);
        }
    };

    // Load rotation skips
    const loadRotationSkips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const value = await trackingService.loadUserPreference(user.id, 'suivi_rotation_skips');
        if (value) {
            setRotationSkips(value as Record<string, any>);
        }
    };

    // Load default lucky check index
    const loadDefaultLuckyCheckIndex = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const value = await trackingService.loadUserPreference(user.id, 'default_lucky_check_index');
        if (value !== undefined && value !== null) {
            setDefaultLuckyCheckIndex(Number(value));
        }
    };

    // Handle navigation from Home (eleve_id in location.state)
    useEffect(() => {
        if (location.state?.eleve_id && groups.length > 0 && !selectedStudent) {
            const targetStudentId = location.state.eleve_id;

            // If students already loaded, find directly
            if (students.length > 0) {
                const found = students.find(s => s.id === targetStudentId);
                if (found) {
                    setSelectedStudent(found);
                    window.history.replaceState({}, document.title);
                    return;
                }
            }

            // Otherwise find student's group (keeping direct supabase query for specific lookup for now)
            const findStudentGroup = async () => {
                const { data } = await supabase
                    .from('EleveGroupe')
                    .select('groupe_id')
                    .eq('eleve_id', targetStudentId)
                    .single();

                if (data && data.groupe_id) {
                    const grp = groups.find(g => g.id === data.groupe_id);
                    if (grp) {
                        setSelectedGroupId(grp.id);
                        pendingStudentSelection.current = targetStudentId;
                    }
                }
            };
            findStudentGroup();
        }
    }, [location.state, groups, selectedStudent, students]);

    // Load groups and preferences on mount
    useEffect(() => {
        fetchGroups();
        loadManualIndices();
        loadRotationSkips();
        loadDefaultLuckyCheckIndex();
    }, []);

    // Fetch students when group selected
    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
            setSelectedStudent(null); // Reset downstream
        }
    }, [selectedGroupId]);

    // In-app migration for students and groups
    useInAppMigration(students, 'Eleve', 'eleve');
    useInAppMigration(groups, 'Groupe', 'groupe');

    // Actions
    const handleGroupSelect = async (groupId: string) => {
        setSelectedGroupId(groupId);
        setShowGroupSelector(false);

        // Save to Supabase for cross-device sync
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await userService.updateLastSelectedGroup(user.id, groupId);
            }
        } catch (error) {
            console.error('Error saving selected group:', error);
        }
    };

    const handleBack = () => {
        setSelectedStudent(null);
    };

    return {
        states: {
            groups,
            selectedGroupId,
            showGroupSelector,
            students,
            selectedStudent,
            loadingStudents,
            manualIndices,
            rotationSkips,
            defaultLuckyCheckIndex
        },
        actions: {
            setSelectedGroupId,
            setShowGroupSelector,
            setSelectedStudent,
            setManualIndices,
            setRotationSkips,
            handleGroupSelect,
            handleBack
        }
    };
}
