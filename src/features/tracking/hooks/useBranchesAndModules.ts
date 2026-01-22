import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { Student } from '../../attendance/services/attendanceService';

export interface Branch {
    id: string;
    nom: string;
    ordre?: number | null;
}

export interface ModuleWithStats {
    id: string;
    nom: string;
    date_fin: string | null;
    sous_branche_id: string | null;
    statut: string | null;
    SousBranche?: {
        nom: string;
        ordre: number | null;
        Branche?: {
            nom: string;
            ordre: number | null;
        } | null;
    } | null;
    totalActivities: number;
    completedActivities: number;
    percent: number;
    Activite?: any[];
}

export interface Activity {
    id: string;
    titre: string;
    ordre: number | null;
    nombre_exercices: number | null;
    nombre_erreurs: number | null;
    statut_exigence: string | null;
    module_id: string | null;
    ActiviteNiveau?: { niveau_id: string }[];
    Module?: {
        id: string;
        SousBranche?: {
            id: string;
            Branche?: {
                id: string;
            } | null;
        } | null;
    } | null;
    ActiviteMateriel?: {
        TypeMateriel?: {
            acronyme: string | null;
        } | null;
    }[];
}

/**
 * useBranchesAndModules
 * Manages branches, modules, activities fetching and filtering
 * 
 * @param {Student | null} selectedStudent - Currently selected student
 * @param {boolean} showPendingOnly - Filter flag for modules
 * @param {string | null} selectedGroupId - Current group ID
 * @returns {object} Branches and modules state and actions
 */
export function useBranchesAndModules(
    selectedStudent: Student | null,
    showPendingOnly: boolean,
    selectedGroupId: string | null
) {
    // Branches
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchForSuivi, setSelectedBranchForSuivi] = useState<string>('global');
    const [groupedProgressions, setGroupedProgressions] = useState<Record<string, Record<string, { total: number; done: number }>>>({});

    // Modules
    const [modules, setModules] = useState<ModuleWithStats[]>([]);
    const [selectedModule, setSelectedModule] = useState<ModuleWithStats | null>(null);
    const [loadingModules, setLoadingModules] = useState(false);

    // Activities
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Fetch branches
    const fetchBranches = async () => {
        await fetchWithCache(
            'branches',
            async () => {
                const { data } = await supabase.from('Branche').select('id, nom, ordre').order('ordre');
                return data || [];
            },
            setBranches
        );
    };

    // Fetch group progressions (for stats in student grid)
    const fetchGroupProgressions = async (groupId: string) => {
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
            (rawData: any[]) => {
                const map: Record<string, Record<string, { total: number; done: number }>> = {};
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
            (_err) => { }
        );
    };

    // Fetch modules for student
    const fetchModules = async (studentId: string) => {
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
            (data: any[]) => {
                const modulesWithStats: ModuleWithStats[] = (data || []).map(m => {
                    const studentLevelId = selectedStudent?.niveau_id;

                    const validActivities = m.Activite?.filter((act: any) => {
                        if (!studentLevelId) return true;
                        const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
                        return levels.length === 0 || levels.includes(studentLevelId);
                    }) || [];

                    const totalActivities = validActivities.length;
                    const completedActivities = validActivities.filter((act: any) =>
                        act.Progression?.some((p: any) => p.eleve_id === studentId && (p.etat === 'termine' || p.etat === 'a_verifier'))
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
            (_err) => {
                setLoadingModules(false);
            }
        );
    };

    // Fetch activities for module
    const fetchActivities = async (moduleId: string) => {
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
            (data: any[]) => {
                setActivities(data as Activity[]);
                setLoadingActivities(false);
            },
            (_err) => {
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
