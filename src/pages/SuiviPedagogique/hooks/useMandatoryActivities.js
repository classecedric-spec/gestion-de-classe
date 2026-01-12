import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';

/**
 * useMandatoryActivities
 * Hook to manage mandatory modules for the current group
 */
export function useMandatoryActivities(selectedGroupId, students) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [levels, setLevels] = useState([]);
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [availableModules, setAvailableModules] = useState([]);
    const [mandatoryModules, setMandatoryModules] = useState([]); // Array of { module_id, level_id }
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [groupProgressions, setGroupProgressions] = useState([]);
    const [resolvedMandatoryModules, setResolvedMandatoryModules] = useState([]);

    // Fetch levels on mount
    useEffect(() => {
        const fetchLevels = async () => {
            const { data, error } = await supabase.from('Niveau').select('*').order('nom');
            if (error) console.error('Error fetching levels:', error);
            else setLevels(data || []);
        };
        fetchLevels();
    }, []);

    // Load preferences for the current group
    useEffect(() => {
        const loadPreferences = async () => {
            if (!selectedGroupId) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('UserPreference')
                .select('value')
                .eq('user_id', user.id)
                .eq('key', `suivi_mandatory_modules_${selectedGroupId}`)
                .maybeSingle();

            if (data?.value) {
                setMandatoryModules(data.value);
            } else {
                setMandatoryModules([]);
            }
        };
        loadPreferences();
    }, [selectedGroupId]);

    // Save preferences when they change
    useEffect(() => {
        const savePreferences = async () => {
            if (!selectedGroupId) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setIsSaving(true);
            await supabase.from('UserPreference').upsert({
                user_id: user.id,
                key: `suivi_mandatory_modules_${selectedGroupId}`,
                value: mandatoryModules,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });
            setIsSaving(false);
        };

        const timer = setTimeout(savePreferences, 1000);
        return () => clearTimeout(timer);
    }, [mandatoryModules, selectedGroupId]);

    // Fetch group progressions to calculate percentages
    const fetchGroupProgressions = useCallback(async () => {
        if (!selectedGroupId || students.length === 0) return;

        const { data, error } = await supabase
            .from('Progression')
            .select('eleve_id, activite_id, etat')
            .in('eleve_id', students.map(s => s.id));

        if (error) {
            console.error('Error fetching group progressions:', error);
        } else {
            setGroupProgressions(data || []);
        }
    }, [selectedGroupId, students]);

    useEffect(() => {
        fetchGroupProgressions();
    }, [fetchGroupProgressions]);

    // Fetch modules for a level when selected in modal
    useEffect(() => {
        if (!isModalOpen || !selectedLevelId) return;

        const fetchModulesForLevel = async () => {
            setLoading(true);
            try {
                // Fetch modules with status 'en_cours' and include their activities
                const { data: modules, error: modErr } = await supabase
                    .from('Module')
                    .select(`
                        id, 
                        nom, 
                        statut,
                        date_fin,
                        created_at,
                        SousBranche (
                            ordre,
                            Branche (ordre)
                        ),
                        Activite (
                            id,
                            ActiviteNiveau!inner (niveau_id)
                        )
                    `)
                    .eq('statut', 'en_cours');

                if (modErr) throw modErr;

                // Filter modules to only those having activities for the selected level
                const modulesWithStats = modules.map(mod => {
                    const levelActivities = mod.Activite.filter(act =>
                        act.ActiviteNiveau.some(an => an.niveau_id === selectedLevelId)
                    );

                    if (levelActivities.length === 0) return null;

                    const levelStudents = students.filter(s => (s.niveau_id === selectedLevelId || s.Niveau?.id === selectedLevelId));
                    if (levelStudents.length === 0) return {
                        id: mod.id,
                        nom: mod.nom,
                        percent: 0,
                        date_fin: mod.date_fin,
                        created_at: mod.created_at,
                        orderInfo: {
                            branchOrder: mod.SousBranche?.Branche?.ordre ?? 999,
                            subBranchOrder: mod.SousBranche?.ordre ?? 999
                        }
                    };

                    const studentIds = levelStudents.map(s => s.id);
                    const activityIds = levelActivities.map(a => a.id);

                    const totalPotential = studentIds.length * activityIds.length;
                    const completedCount = groupProgressions.filter(p =>
                        studentIds.includes(p.eleve_id) &&
                        activityIds.includes(p.activite_id) &&
                        (p.etat === 'termine' || p.etat === 'a_verifier')
                    ).length;

                    const percent = totalPotential > 0 ? Math.round((completedCount / totalPotential) * 100) : 0;

                    return {
                        id: mod.id,
                        nom: mod.nom,
                        date_fin: mod.date_fin,
                        created_at: mod.created_at,
                        percent,
                        orderInfo: {
                            branchOrder: mod.SousBranche?.Branche?.ordre ?? 999,
                            subBranchOrder: mod.SousBranche?.ordre ?? 999
                        }
                    };
                }).filter(Boolean);

                // Sort by: 1) End date, 2) Completion % (least first), 3) Branch
                const sortedModules = modulesWithStats.sort((a, b) => {
                    // 1. End date (earliest first, null/undefined last)
                    const dateA = a.date_fin ? new Date(a.date_fin).getTime() : Infinity;
                    const dateB = b.date_fin ? new Date(b.date_fin).getTime() : Infinity;
                    if (dateA !== dateB) return dateA - dateB;

                    // 2. Completion percentage (least finished first)
                    if (a.percent !== b.percent) return a.percent - b.percent;

                    // 3. Branch/SubBranch order
                    if (a.orderInfo.branchOrder !== b.orderInfo.branchOrder) return a.orderInfo.branchOrder - b.orderInfo.branchOrder;
                    if (a.orderInfo.subBranchOrder !== b.orderInfo.subBranchOrder) return a.orderInfo.subBranchOrder - b.orderInfo.subBranchOrder;
                    return a.nom.localeCompare(b.nom);
                });

                // Filter out modules that are already 100% finished
                setAvailableModules(sortedModules.filter(m => m.percent < 100));
            } catch (err) {
                console.error(err);
                toast.error('Erreur lors du chargement des modules');
            } finally {
                setLoading(false);
            }
        };

        fetchModulesForLevel();
    }, [isModalOpen, selectedLevelId, students, groupProgressions]);

    // Fetch details for mandatory modules
    useEffect(() => {
        const fetchDetails = async () => {
            if (mandatoryModules.length === 0) {
                setResolvedMandatoryModules([]);
                return;
            }

            const moduleIds = [...new Set(mandatoryModules.map(m => m.module_id))];

            // Fetch modules and their activities for specific levels
            const { data, error } = await supabase
                .from('Module')
                .select(`
                    id, 
                    nom, 
                    date_fin,
                    created_at,
                    SousBranche (
                        ordre,
                        Branche (ordre)
                    ),
                    Activite (
                        id,
                        ActiviteNiveau (niveau_id)
                    )
                `)
                .in('id', moduleIds);

            if (data && !error) {
                // Group by level, preserving the order from mandatoryModules
                const grouped = {};
                const levelList = [];

                mandatoryModules.forEach(mm => {
                    const mod = data.find(d => d.id === mm.module_id);
                    if (mod) {
                        const level = levels.find(l => l.id === mm.level_id);
                        const levelName = level?.nom || 'Inconnu';

                        const levelActivities = mod.Activite.filter(act =>
                            act.ActiviteNiveau.some(an => an.niveau_id === mm.level_id)
                        );

                        const levelStudents = students.filter(s => (s.niveau_id === mm.level_id || s.Niveau?.id === mm.level_id));
                        const studentIds = levelStudents.map(s => s.id);
                        const activityIds = levelActivities.map(a => a.id);

                        const totalPotential = studentIds.length * activityIds.length;
                        const completedCount = groupProgressions.filter(p =>
                            studentIds.includes(p.eleve_id) &&
                            activityIds.includes(p.activite_id) &&
                            (p.etat === 'termine' || p.etat === 'a_verifier')
                        ).length;

                        const percent = totalPotential > 0 ? Math.round((completedCount / totalPotential) * 100) : 0;

                        // Find students who haven't finished all activities of this level in this module
                        const remainingStudents = levelStudents
                            .filter(s => {
                                const completedForStudent = groupProgressions.filter(p =>
                                    p.eleve_id === s.id &&
                                    activityIds.includes(p.activite_id) &&
                                    (p.etat === 'termine' || p.etat === 'a_verifier')
                                ).length;
                                return completedForStudent < activityIds.length;
                            })
                            .map(s => {
                                const completedForStudent = groupProgressions.filter(p =>
                                    p.eleve_id === s.id &&
                                    activityIds.includes(p.activite_id) &&
                                    (p.etat === 'termine' || p.etat === 'a_verifier')
                                ).length;
                                const percentage = activityIds.length > 0
                                    ? Math.round((completedForStudent / activityIds.length) * 100)
                                    : 0;
                                return {
                                    name: `${s.prenom} ${s.nom}`,
                                    prenom: s.prenom,
                                    completed: completedForStudent,
                                    total: activityIds.length,
                                    percentage
                                };
                            })
                            // Sort by percentage (ascending) then alphabetically by prenom
                            .sort((a, b) => {
                                if (a.percentage !== b.percentage) return a.percentage - b.percentage;
                                return a.prenom.localeCompare(b.prenom);
                            });

                        if (!grouped[mm.level_id]) {
                            grouped[mm.level_id] = {
                                levelId: mm.level_id,
                                levelName,
                                modules: []
                            };
                            levelList.push(mm.level_id);
                        }
                        grouped[mm.level_id].modules.push({
                            id: mm.module_id,
                            nom: mod.nom,
                            percent,
                            date_fin: mod.date_fin,
                            created_at: mod.created_at,
                            remainingStudents,
                            orderInfo: {
                                branchOrder: mod.SousBranche?.Branche?.ordre ?? 999,
                                subBranchOrder: mod.SousBranche?.ordre ?? 999
                            }
                        });
                    }
                });

                // Result levels follow first appearance in mandatoryModules
                const result = levelList.map(lId => grouped[lId]);
                setResolvedMandatoryModules(result);
            }
        };

        fetchDetails();
    }, [mandatoryModules, levels, students, groupProgressions]);

    const toggleMandatory = (moduleId, levelId) => {
        setMandatoryModules(prev => {
            const exists = prev.find(m => m.module_id === moduleId && m.level_id === levelId);
            if (exists) {
                return prev.filter(m => !(m.module_id === moduleId && m.level_id === levelId));
            } else {
                return [...prev, { module_id: moduleId, level_id: levelId }];
            }
        });
    };

    const reorderModule = (levelId, moduleId, direction) => {
        setMandatoryModules(prev => {
            const sameLevel = prev.filter(m => m.level_id === levelId);
            const otherLevels = prev.filter(m => m.level_id !== levelId);

            const index = sameLevel.findIndex(m => m.module_id === moduleId);
            if (index === -1) return prev;

            const newSameLevel = [...sameLevel];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;

            if (targetIndex < 0 || targetIndex >= newSameLevel.length) return prev;

            [newSameLevel[index], newSameLevel[targetIndex]] = [newSameLevel[targetIndex], newSameLevel[index]];

            // Reconstruct the array preserving other levels
            return [...otherLevels, ...newSameLevel];
        });
    };

    const sortMandatoryModules = () => {
        const flatList = [];
        resolvedMandatoryModules.forEach(group => {
            group.modules.forEach(mod => {
                flatList.push({
                    module_id: mod.id,
                    level_id: group.levelId,
                    created_at: mod.created_at,
                    percent: mod.percent,
                    orderInfo: mod.orderInfo
                });
            });
        });

        const sorted = flatList.sort((a, b) => {
            // 1. Ancienneté (Oldest first)
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            if (dateA !== dateB) return dateA - dateB;

            // 2. % Fini (Least finished first)
            if (a.percent !== b.percent) return a.percent - b.percent;

            // 3. Branche
            if (a.orderInfo.branchOrder !== b.orderInfo.branchOrder) return a.orderInfo.branchOrder - b.orderInfo.branchOrder;
            return a.orderInfo.subBranchOrder - b.orderInfo.subBranchOrder;
        }).map(m => ({ module_id: m.module_id, level_id: m.level_id }));

        setMandatoryModules(sorted);
        toast.success("Ordre automatique appliqué");
    };

    const removeModule = (levelId, moduleId) => {
        setMandatoryModules(prev =>
            prev.filter(m => !(m.module_id === moduleId && m.level_id === levelId))
        );
        toast.success("Module retiré");
    };

    return {
        states: {
            isModalOpen,
            levels,
            selectedLevelId,
            availableModules,
            mandatoryModules,
            loading,
            isSaving,
            groupProgressions,
            resolvedMandatoryModules
        },
        actions: {
            setIsModalOpen,
            setSelectedLevelId,
            toggleMandatory,
            reorderModule,
            removeModule,
            sortMandatoryModules,
            fetchGroupProgressions
        }
    };
}
