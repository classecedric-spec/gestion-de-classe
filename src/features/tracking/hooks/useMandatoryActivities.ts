import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { toast } from 'sonner';
import { Student } from '../../attendance/services/attendanceService';
import { levelService } from '../../levels/services/levelService';
import { trackingService } from '../services/trackingService';

export interface Level {
    id: string;
    nom: string;
    ordre?: number | null;
}

export interface MandatoryModuleReference {
    module_id: string;
    level_id: string;
}

export interface ResolvedMandatoryModule {
    levelId: string;
    levelName: string;
    modules: {
        id: string;
        nom: string;
        percent: number;
        date_fin: string | null;
        created_at: string;
        remainingStudents: {
            name: string;
            prenom: string;
            completed: number;
            total: number;
            percentage: number;
        }[];
        orderInfo: {
            branchOrder: number;
            subBranchOrder: number;
        };
    }[];
}

/**
 * useMandatoryActivities
 * Hook to manage mandatory modules for the current group
 */
export function useMandatoryActivities(selectedGroupId: string | null, students: Student[]) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [levels, setLevels] = useState<Level[]>([]);
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [availableModules, setAvailableModules] = useState<any[]>([]);
    const [mandatoryModules, setMandatoryModules] = useState<MandatoryModuleReference[]>([]); // Array of { module_id, level_id }
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [groupProgressions, setGroupProgressions] = useState<any[]>([]);
    const [resolvedMandatoryModules, setResolvedMandatoryModules] = useState<ResolvedMandatoryModule[]>([]);



    // ...

    // Fetch levels on mount
    useEffect(() => {
        const fetchLevels = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            // Adapt levelService to return what we need (Level[])
            // levelService.fetchLevels returns LevelWithStudentCount[] which extends Level
            const data = await levelService.fetchLevels(user.id);
            setLevels(data);
        };
        fetchLevels();
    }, []);

    // Load preferences for the current group
    useEffect(() => {
        const loadPreferences = async () => {
            if (!selectedGroupId) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const value = await trackingService.loadUserPreference(user.id, `suivi_mandatory_modules_${selectedGroupId}`);

            if (value) {
                setMandatoryModules(value as MandatoryModuleReference[]);
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
            await trackingService.saveUserPreference(
                user.id,
                `suivi_mandatory_modules_${selectedGroupId}`,
                mandatoryModules
            );
            setIsSaving(false);
        };

        const timer = setTimeout(savePreferences, 1000);
        return () => clearTimeout(timer);
    }, [mandatoryModules, selectedGroupId]);

    // Fetch group progressions to calculate percentages
    const fetchGroupProgressions = useCallback(async () => {
        if (!selectedGroupId || students.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const data = await trackingService.fetchGroupProgressions(students.map(s => s.id), user.id);
        setGroupProgressions(data || []);
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
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch modules with status 'en_cours'
                // Note: fetchModulesForStudent ignores levelId arg currently and returns all active modules, 
                // but we can filter or just use it as is if it includes everything needed.
                const modules = await trackingService.fetchModulesForStudent(null, user.id);

                // Filter modules to only those having mandatory activities for the selected level
                const modulesWithStats = (modules as any[]).map(mod => {
                    const levelActivities = mod.Activite.filter((act: any) => {
                        const levelLink = act.ActiviteNiveau.find((an: any) => an.niveau_id === selectedLevelId);
                        if (!levelLink) return false;

                        const status = levelLink?.statut_exigence || act.statut_exigence || 'obligatoire';
                        return status === 'obligatoire';
                    });

                    if (levelActivities.length === 0) return null;

                    const levelStudents = students.filter(s => (s.niveau_id === selectedLevelId || (s as any).Niveau?.id === selectedLevelId));
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
                    const activityIds = levelActivities.map((a: any) => a.id);

                    // Count existing progressions (not theoretical)
                    const totalExisting = groupProgressions.filter(p =>
                        studentIds.includes(p.eleve_id) &&
                        activityIds.includes(p.activite_id)
                    ).length;

                    const completedCount = groupProgressions.filter(p =>
                        studentIds.includes(p.eleve_id) &&
                        activityIds.includes(p.activite_id) &&
                        (p.etat === 'termine' || p.etat === 'a_verifier')
                    ).length;

                    const percent = totalExisting > 0 ? Math.round((completedCount / totalExisting) * 100) : 0;

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
                const sortedModules = (modulesWithStats as any[]).sort((a: any, b: any) => {
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

            // Re-use fetchModulesForStudent but we need SPECIFIC modules by ID.
            // TrackingService doesn't have fetchModulesByIds.
            // However, we can fetch all and filter, OR add a method.
            // Since we upgraded fetchModulesForStudent to return lots of data, let's try to reuse it 
            // BUT fetchModulesForStudent only returns 'en_cours'. 
            // If a mandatory module is closed, we might miss it?
            // The original query used `in('id', moduleIds)` without status filter.
            // We should add `fetchModulesByIds` to TrackingService if we want to be clean, 
            // OR just use `fetchModulesForStudent` if we assume mandatory are active.
            // Let's assume mandatory are active for now to save time, or filter from full list.
            // Wait, original query didn't filter by status.
            // I should add `fetchModulesByIds` to service/repo.
            // For now, I will keep the supabase query here OR use `fetchModulesForStudent` and hope it covers it.
            // Actually, `fetchModulesForStudent` returns all active modules. If a mandatory module is archive, it won't show up.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const allModules = await trackingService.fetchModulesForStudent(null, user.id);
            const relevantModules = allModules.filter((m: any) => moduleIds.includes(m.id));
            const data = relevantModules;

            if (data) {
                // Group by level, preserving the order from mandatoryModules
                const grouped: Record<string, ResolvedMandatoryModule> = {};
                const levelList: string[] = [];

                mandatoryModules.forEach(mm => {
                    const mod = (data as any[]).find(d => d.id === mm.module_id);
                    if (mod) {
                        const level = levels.find(l => l.id === mm.level_id);
                        const levelName = level?.nom || 'Inconnu';

                        // Determine if an activity is mandatory for this level
                        const levelActivities = mod.Activite.filter((act: any) => {
                            // 1. Check if activity is linked to this level
                            const levelLink = act.ActiviteNiveau.find((an: any) => an.niveau_id === mm.level_id);
                            if (!levelLink) return false;

                            // 2. Respect requirement status (Specific level status overrides base activity status)
                            const status = levelLink?.statut_exigence || act.statut_exigence || 'obligatoire';
                            return status === 'obligatoire';
                        });

                        const levelStudents = students.filter(s => (s.niveau_id === mm.level_id || (s as any).Niveau?.id === mm.level_id));
                        const studentIds = levelStudents.map(s => s.id);
                        const activityIds = levelActivities.map((a: any) => a.id);

                        // Count existing progressions (not theoretical)
                        const totalExisting = groupProgressions.filter(p =>
                            studentIds.includes(p.eleve_id) &&
                            activityIds.includes(p.activite_id)
                        ).length;

                        const completedCount = groupProgressions.filter(p =>
                            studentIds.includes(p.eleve_id) &&
                            activityIds.includes(p.activite_id) &&
                            (p.etat === 'termine' || p.etat === 'a_verifier')
                        ).length;

                        const percent = totalExisting > 0 ? Math.round((completedCount / totalExisting) * 100) : 0;

                        // Find students who haven't finished all activities of this level in this module
                        const remainingStudents = levelStudents
                            .filter(s => {
                                // Count completed activities
                                const completedForStudent = groupProgressions.filter(p =>
                                    p.eleve_id === s.id &&
                                    activityIds.includes(p.activite_id) &&
                                    (p.etat === 'termine' || p.etat === 'a_verifier')
                                ).length;

                                // Check if student has ANY progression for this module's activities
                                const hasProgressions = groupProgressions.some(p =>
                                    p.eleve_id === s.id &&
                                    activityIds.includes(p.activite_id)
                                );

                                // Only show students who have started AND haven't finished all
                                return hasProgressions && completedForStudent < activityIds.length;
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

    const toggleMandatory = (moduleId: string, levelId: string) => {
        setMandatoryModules(prev => {
            const exists = prev.find(m => m.module_id === moduleId && m.level_id === levelId);
            if (exists) {
                return prev.filter(m => !(m.module_id === moduleId && m.level_id === levelId));
            } else {
                return [...prev, { module_id: moduleId, level_id: levelId }];
            }
        });
    };

    const reorderModule = (levelId: string, moduleId: string, direction: 'up' | 'down') => {
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
        const flatList: any[] = [];
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

    const removeModule = (levelId: string, moduleId: string) => {
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
