import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/photoCache';
import { fetchDelta, mergeDelta } from '../../../lib/deltaSync';

/**
 * useHomeData
 * Hook to fetch and manage initial home page data (user, students, groups)
 */
export const useHomeData = () => {
    const [user, setUser] = useState(null);
    const [userName, setUserName] = useState('');
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
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
                let studentsData;

                if (isFirstLoad) {
                    const { data, error: studentsError } = await supabase
                        .from('Eleve')
                        .select('id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)')
                        .eq('titulaire_id', user.id);

                    if (!studentsError) {
                        studentsData = data;
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
                        studentsData = data;
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
                                    const cachedPhoto = await getCachedPhoto(student.id, student.photo_hash);
                                    if (cachedPhoto) {
                                        return { ...student, photo_base64: cachedPhoto };
                                    } else if (student.photo_base64) {
                                        await setCachedPhoto(student.id, student.photo_base64, student.photo_hash);
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
                    setGroups(groupsData || []);
                    // Only set first group as default if no group is currently selected
                    if (groupsData?.length > 0 && !selectedGroup) {
                        setSelectedGroup(groupsData[0]);
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
    }, [isFirstLoad, students]);

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
