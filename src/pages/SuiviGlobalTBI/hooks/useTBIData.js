import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

/**
 * useTBIData - Hook pour la gestion des données du Suivi Global TBI
 * Gère: groupes, élèves, modules, activités, progressions, demandes d'aide
 */
export const useTBIData = () => {
    const { isOnline, addToQueue } = useOfflineSync();

    // Core data
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({});

    // Navigation
    const [view, setView] = useState('students');

    // Help requests
    const [helpRequests, setHelpRequests] = useState([]);

    // --- Fetch Functions ---
    const fetchGroups = useCallback(async () => {
        await fetchWithCache(
            'groups',
            async () => {
                const { data, error } = await supabase.from('Groupe').select('*').order('ordre');
                if (error) throw error;
                return data || [];
            },
            (data) => {
                setGroups(data);
                if (data?.length > 0 && !selectedGroupId) {
                    setSelectedGroupId(data[0].id);
                }
            },
            (error, isCached) => {
                if (isCached) toast.info("Mode hors-ligne : Groupes chargés du cache");
                else toast.error("Erreur chargement groupes");
            }
        );
    }, [selectedGroupId]);

    const saveSelectedGroup = useCallback(async (groupId) => {
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
    }, []);

    const fetchStudents = useCallback(async (groupId) => {
        await fetchWithCache(
            `students_${groupId}`,
            async () => {
                const { data: links } = await supabase
                    .from('EleveGroupe')
                    .select('eleve_id')
                    .eq('groupe_id', groupId);

                const eleveIds = links?.map(l => l.eleve_id) || [];
                if (eleveIds.length > 0) {
                    const { data } = await supabase
                        .from('Eleve')
                        .select('id, prenom, nom, niveau_id, Niveau(ordre, nom)')
                        .in('id', eleveIds);

                    const sorted = (data || []).sort((a, b) => {
                        const levelA = a.Niveau?.ordre || 0;
                        const levelB = b.Niveau?.ordre || 0;
                        if (levelA !== levelB) return levelA - levelB;
                        return (a.prenom || '').localeCompare(b.prenom || '');
                    });
                    return sorted;
                }
                return [];
            },
            setStudents
        );
    }, []);

    const fetchModules = useCallback(async (studentId) => {
        await fetchWithCache(
            `modules_active_${studentId}`,
            async () => {
                const { data } = await supabase
                    .from('Module')
                    .select(`
                        *,
                        SousBranche (nom, ordre, Branche(nom, ordre)),
                        Activite (
                            id,
                            ActiviteNiveau (niveau_id),
                            Progression (etat, eleve_id)
                        )
                    `)
                    .eq('statut', 'en_cours');
                return data || [];
            },
            (data) => {
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id;

                const modulesWithStats = (data || []).map(m => {
                    const validActivities = m.Activite?.filter(act => {
                        if (!studentLevelId) return true;
                        const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                        return levels.length > 0 && levels.includes(studentLevelId);
                    }) || [];

                    const total = validActivities.length;
                    const completed = validActivities.filter(act =>
                        act.Progression?.some(p => p.eleve_id === studentId && (p.etat === 'termine' || p.etat === 'a_verifier'))
                    ).length;

                    return { ...m, total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
                }).filter(m => m.total > 0 && m.completed < m.total);

                const sorted = modulesWithStats.sort((a, b) => {
                    if (a.date_fin !== b.date_fin) {
                        if (!a.date_fin) return 1;
                        if (!b.date_fin) return -1;
                        return a.date_fin.localeCompare(b.date_fin);
                    }
                    const aB = a.SousBranche?.Branche;
                    const bB = b.SousBranche?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    const aSB = a.SousBranche;
                    const bSB = b.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    return a.nom.localeCompare(b.nom);
                });

                setModules(sorted);
            }
        );
    }, [students]);

    const fetchActivities = useCallback(async (moduleId, studentId) => {
        await fetchWithCache(
            `activities_${moduleId}_${studentId}`,
            async () => {
                const { data: acts } = await supabase
                    .from('Activite')
                    .select(`*, ActiviteNiveau (niveau_id)`)
                    .eq('module_id', moduleId)
                    .order('ordre');

                if (!acts) return { activities: [], progressions: [] };

                const { data: progs } = await supabase
                    .from('Progression')
                    .select('activite_id, etat')
                    .eq('eleve_id', studentId)
                    .in('activite_id', acts.map(a => a.id));

                return { activities: acts, progressions: progs || [] };
            },
            (data) => {
                const { activities: acts, progressions: progs } = data;
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id;

                const filtered = (acts || []).filter(act => {
                    const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                    return levels.length > 0 && levels.includes(studentLevelId);
                });

                const progMap = {};
                progs?.forEach(p => { progMap[p.activite_id] = p.etat; });
                setProgressions(progMap);
                setActivities(filtered);
            }
        );
    }, [students]);

    const fetchHelpRequests = useCallback(async () => {
        if (students.length === 0) return;
        const studentIds = students.map(s => s.id);

        const { data } = await supabase
            .from('Progression')
            .select(`
                id, etat, is_suivi,
                eleve:Eleve(id, prenom, nom),
                activite:Activite(id, titre, Module(statut))
            `)
            .in('etat', ['besoin_d_aide', 'a_verifier'])
            .in('eleve_id', studentIds)
            .order('updated_at', { ascending: true });

        const validRequests = (data || []).filter(req => {
            if (req.is_suivi) return true;
            return req.activite?.Module?.statut === 'en_cours';
        });

        setHelpRequests(validRequests);
    }, [students]);

    // --- Navigation Handlers ---
    const handleStudentClick = useCallback((student) => {
        setSelectedStudent(student);
        fetchModules(student.id);
        setView('modules');
    }, [fetchModules]);

    const handleModuleClick = useCallback((module) => {
        if (selectedModule?.id === module.id) {
            setSelectedModule(null);
            setActivities([]);
        } else {
            setSelectedModule(module);
            if (selectedStudent) {
                fetchActivities(module.id, selectedStudent.id);
            }
        }
    }, [selectedModule, selectedStudent, fetchActivities]);

    const handleBackToStudents = useCallback(() => {
        setSelectedStudent(null);
        setSelectedModule(null);
        setActivities([]);
        setView('students');
    }, []);

    const handleBackToModules = useCallback(() => {
        setSelectedModule(null);
        setActivities([]);
        setView('modules');
    }, []);

    const handleHelpStatusClick = useCallback(async (requestId) => {
        const { error } = await supabase
            .from('Progression')
            .update({ etat: 'termine', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (!error) fetchHelpRequests();
    }, [fetchHelpRequests]);

    // --- Effects ---
    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroupId) {
            saveSelectedGroup(selectedGroupId);
            fetchStudents(selectedGroupId);
            setSelectedStudent(null);
            setSelectedModule(null);
            setActivities([]);
            setView('students');
        }
    }, [selectedGroupId, saveSelectedGroup, fetchStudents]);

    useEffect(() => {
        if (students.length > 0) {
            fetchHelpRequests();
        }
    }, [students, fetchHelpRequests]);

    return {
        // Data
        groups, selectedGroupId, setSelectedGroupId,
        students, selectedStudent,
        modules, selectedModule,
        activities, progressions, setProgressions,
        view, helpRequests,

        // Navigation
        handleStudentClick,
        handleModuleClick,
        handleBackToStudents,
        handleBackToModules,
        handleHelpStatusClick,

        // Refresh
        fetchHelpRequests
    };
};
