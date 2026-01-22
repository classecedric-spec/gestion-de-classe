import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useInAppMigration } from '../../../hooks/useInAppMigration';
import { Student, Group } from '../../attendance/services/attendanceService';

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

    // Pending student selection (from Home navigation)
    const pendingStudentSelection = useRef<string | null>(null);

    // Fetch groups
    const fetchGroups = async () => {
        await fetchWithCache(
            'groups',
            async () => {
                const { data, error } = await supabase.from('Groupe').select('*').order('nom');
                if (error) throw error;
                return data || [];
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
                    const { data, error } = await supabase
                        .from('Eleve')
                        .select(`
                            *,
                            importance_suivi,
                            Classe (
                                nom,
                                ClasseAdulte (
                                    role,
                                    Adulte (id, nom, prenom)
                                )
                            ),
                            Niveau (id, nom),
                            EleveGroupe!inner(
                                groupe_id,
                                Groupe(id, nom)
                            )
                        `)
                        .eq('EleveGroupe.groupe_id', groupId)
                        .order('prenom');

                    if (error) throw error;
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

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'eleve_profil_competences')
            .maybeSingle();

        if (data?.value) {
            setManualIndices(data.value as Record<string, any>);
        }
    };

    // Load rotation skips
    const loadRotationSkips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'suivi_rotation_skips')
            .maybeSingle();

        if (data?.value) {
            setRotationSkips(data.value as Record<string, any>);
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

            // Otherwise find student's group
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

    // Select student once students are loaded (after navigation)
    useEffect(() => {
        if (pendingStudentSelection.current && students.length > 0) {
            const found = students.find(s => s.id === pendingStudentSelection.current);
            if (found) {
                setSelectedStudent(found);
                pendingStudentSelection.current = null;
                window.history.replaceState({}, document.title);
            }
        }
    }, [students]);

    // Load groups and preferences on mount
    useEffect(() => {
        fetchGroups();
        loadManualIndices();
        loadRotationSkips();
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
                await supabase
                    .from('CompteUtilisateur')
                    .update({ last_selected_group_id: groupId })
                    .eq('id', user.id);
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
            rotationSkips
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
