import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/photoCache';
import { fetchDelta, mergeDelta } from '../../../lib/deltaSync';
import { Student, Group } from '../../attendance/services/attendanceService';

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
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const fetchInitialData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                // Fetch User Profile
                const { data: profile } = await supabase
                    .from('CompteUtilisateur')
                    .select('prenom')
                    .eq('id', user.id)
                    .single();
                if (profile?.prenom) setUserName(profile.prenom);

                // Fetch Students with Delta Sync (incremental loading)
                let studentsData: Student[] | undefined;

                if (isFirstLoad) {
                    const { data, error: studentsError } = await supabase
                        .from('Eleve')
                        .select('id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)')
                        .eq('titulaire_id', user.id);

                    if (!studentsError) {
                        studentsData = data as unknown as Student[];
                        setIsFirstLoad(false);
                    }
                } else {
                    const { delta, isFirstSync } = await fetchDelta(
                        'Eleve',
                        'id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)',
                        { titulaire_id: user.id }
                    );

                    if (isFirstSync) {
                        const { data } = await supabase
                            .from('Eleve')
                            .select('id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)')
                            .eq('titulaire_id', user.id);
                        studentsData = data as unknown as Student[];
                    } else {
                        studentsData = mergeDelta(students, delta);
                    }
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
                                    } else if (student.photo_base64) {
                                        await setCachedPhoto(student.id!, student.photo_base64, student.photo_hash);
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
                const { data: groupsData, error: groupsError } = await supabase
                    .from('Groupe')
                    .select('*')
                    .order('nom');

                if (!groupsError) {
                    const typedGroups = groupsData as unknown as Group[];
                    setGroups(typedGroups || []);
                    // Only set first group as default if no group is currently selected
                    if (typedGroups?.length > 0 && !selectedGroup) {
                        setSelectedGroup(typedGroups[0]);
                    }
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
    }, [isFirstLoad, students, selectedGroup]);

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
