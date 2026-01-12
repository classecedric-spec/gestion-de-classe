import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';

/**
 * useBranchesAndModules
 * Manages branches, modules, activities fetching and filtering
 * 
 * @param {object} selectedStudent - Currently selected student
 * @param {boolean} showPendingOnly - Filter flag for modules
 * @param {string} selectedGroupId - Current group ID
 * @returns {object} Branches and modules state and actions
 */
export function useBranchesAndModules(selectedStudent, showPendingOnly, selectedGroupId) {
    // Branches
    const [branches, setBranches] = useState([]);
    const [selectedBranchForSuivi, setSelectedBranchForSuivi] = useState('global');
    const [groupedProgressions, setGroupedProgressions] = useState({});

    // Modules
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [loadingModules, setLoadingModules] = useState(false);

    // Activities
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Fetch branches
    const fetchBranches = async () => {
        await fetchWithCache(
            'branches',
            async () => {
                const { data } = await supabase.from('Branche').select('id, nom').order('ordre');
                return data || [];
            },
            setBranches
        );
    };

    // Fetch group progressions (for stats in student grid)
    const fetchGroupProgressions = async (groupId) => {
        await fetchWithCache(
            `group_progressions_${groupId}`,
            async () => {
                const { data: rawData, error } = await supabase
                    .from('Progression')
                    .select(`
                        eleve_id,
                        etat,
                        Activite (
                            Module (
                                SousBranche (
                                    branche_id
                                )
                            )
                        )
                    `);
                if (error) throw error;
                return rawData || [];
            },
            (rawData) => {
                const map = {};
                rawData.forEach(p => {
                    const sId = p.eleve_id;
                    const bId = p.Activite?.Module?.SousBranche?.branche_id;

                    if (!sId || !bId) return;

                    if (!map[sId]) map[sId] = {};
                    if (!map[sId][bId]) map[sId][bId] = { total: 0, done: 0 };

                    map[sId][bId].total++;
                    if (p.etat === 'termine' || p.etat === 'a_verifier') map[sId][bId].done++;
                });
                setGroupedProgressions(map);
            },
            (err) => { }
        );
    };

    // Fetch modules for student
    const fetchModules = async (studentId) => {
        if (!studentId) return;
        setLoadingModules(true);

        await fetchWithCache(
            `modules_pedago_${studentId}`,
            async () => {
                const { data, error } = await supabase
                    .from('Module')
                    .select(`
                        id, nom, date_fin, sous_branche_id, statut,
                        SousBranche:sous_branche_id (
                            nom,
                            ordre,
                            Branche:branche_id (nom, ordre)
                        ),
                        Activite (
                            id, titre, nombre_exercices, nombre_erreurs, statut_exigence,
                            ActiviteNiveau (niveau_id),
                            Progression (etat, eleve_id)
                        )
                    `)
                    .eq('statut', 'en_cours');
                if (error) throw error;
                return data || [];
            },
            (data) => {
                const modulesWithStats = (data || []).map(m => {
                    const studentLevelId = selectedStudent?.niveau_id;

                    const validActivities = m.Activite?.filter(act => {
                        if (!studentLevelId) return true;
                        const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                        return levels.length > 0 && levels.includes(studentLevelId);
                    }) || [];

                    const totalActivities = validActivities.length;
                    const completedActivities = validActivities.filter(act =>
                        act.Progression?.some(p => p.eleve_id === studentId && (p.etat === 'termine' || p.etat === 'a_verifier'))
                    ).length;

                    return {
                        ...m,
                        totalActivities,
                        completedActivities,
                        percent: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
                    };
                });

                const filteredByCompletion = modulesWithStats.filter(m => {
                    if (m.totalActivities === 0) return false;
                    if (showPendingOnly) {
                        return m.completedActivities < m.totalActivities;
                    }
                    return true;
                });

                const sortedModules = filteredByCompletion.sort((a, b) => {
                    if (a.date_fin !== b.date_fin) {
                        if (!a.date_fin) return 1;
                        if (!b.date_fin) return -1;
                        return a.date_fin.localeCompare(b.date_fin);
                    }
                    const aB = a.SousBranche?.Branche;
                    const bB = b.SousBranche?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    if (aB?.nom !== bB?.nom) return (aB?.nom || '').localeCompare(bB?.nom || '');
                    const aSB = a.SousBranche;
                    const bSB = b.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    if (aSB?.nom !== bSB?.nom) return (aSB?.nom || '').localeCompare(bSB?.nom || '');
                    return a.nom.localeCompare(b.nom);
                });

                setModules(sortedModules);
                setLoadingModules(false);
            },
            (err) => {
                setLoadingModules(false);
            }
        );
    };

    // Fetch activities for module
    const fetchActivities = async (moduleId) => {
        setLoadingActivities(true);
        await fetchWithCache(
            `activities_pedago_${moduleId}`,
            async () => {
                const { data, error } = await supabase
                    .from('Activite')
                    .select(`
                        *,
                        ActiviteNiveau (niveau_id),
                        Module (
                            id,
                            SousBranche (
                                id,
                                Branche (
                                    id
                                )
                            )
                        ),
                        ActiviteMateriel (
                            TypeMateriel (
                                acronyme
                            )
                        )
                    `)
                    .eq('module_id', moduleId)
                    .order('ordre', { ascending: true });
                if (error) throw error;
                return data || [];
            },
            (data) => {
                setActivities(data);
                setLoadingActivities(false);
            },
            (err) => {
                setLoadingActivities(false);
            }
        );
    };

    // Load branches on mount
    useEffect(() => {
        fetchBranches();
    }, []);

    // Fetch group progressions when group changes
    useEffect(() => {
        if (selectedGroupId) {
            fetchGroupProgressions(selectedGroupId);
        }
    }, [selectedGroupId]);

    // Fetch modules when student selected
    useEffect(() => {
        if (selectedStudent) {
            fetchModules(selectedStudent.id);
            setSelectedModule(null);
            setActivities([]);
        }
    }, [selectedStudent, showPendingOnly]);

    // Fetch activities when module selected
    useEffect(() => {
        if (selectedModule) {
            fetchActivities(selectedModule.id);
        }
    }, [selectedModule]);

    return {
        states: {
            branches,
            selectedBranchForSuivi,
            modules,
            selectedModule,
            activities,
            loadingModules,
            loadingActivities,
            groupedProgressions
        },
        actions: {
            setSelectedBranchForSuivi,
            setSelectedModule,
            setActivities
        }
    };
}
