import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../../../lib/database';
import { groupService } from '../../../features/groups/services/groupService';
import { studentService } from '../../../features/students/services/studentService';
import { userService } from '../../../features/users/services/userService';
import { trackingService } from '../../../features/tracking/services/trackingService';
// @ts-ignore
import { fetchWithCache } from '../../../lib/sync';
// @ts-ignore
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';
import { Tables } from '../../../types/supabase';

// Helper types for the hook
type Group = Tables<'Groupe'>;
type Student = Tables<'Eleve'> & { Niveau?: { ordre: number; nom: string } };
type ModuleWithStats = Tables<'Module'> & {
    total: number;
    completed: number;
    percent: number;
    SousBranche?: {
        nom: string;
        ordre: number;
        Branche?: { nom: string; ordre: number };
    };
    Activite?: any[]; // Simplified
};
type Activity = Tables<'Activite'> & { ActiviteNiveau?: any[] };

/**
 * useTBIData - Hook pour la gestion des données du Suivi Global TBI
 * Gère: groupes, élèves, modules, activités, progressions, demandes d'aide
 */
export const useTBIData = () => {
    // @ts-ignore
    const { isOnline, addToQueue } = useOfflineSync();

    // Core data
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [modules, setModules] = useState<ModuleWithStats[]>([]);
    const [selectedModule, setSelectedModule] = useState<ModuleWithStats | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [progressions, setProgressions] = useState<Record<string, string>>({});

    // Navigation
    const [view, setView] = useState<'students' | 'modules'>('students');

    // Help requests
    const [helpRequests, setHelpRequests] = useState<any[]>([]);

    // --- Fetch Functions ---
    const fetchGroups = useCallback(async () => {
        const user = await getCurrentUser();
        if (!user) return;

        await fetchWithCache(
            'groups',
            async () => {
                return await groupService.getGroups(user.id);
            },
            (data: Group[]) => {
                setGroups(data);
                if (data?.length > 0 && !selectedGroupId) {
                    setSelectedGroupId(data[0].id);
                }
            },
            (error: any, isCached: boolean) => {
                if (isCached) toast.info("Mode hors-ligne : Groupes chargés du cache");
                else {
                    console.error(error);
                    toast.error("Erreur chargement groupes");
                }
            }
        );
    }, [selectedGroupId]);

    const saveSelectedGroup = useCallback(async (groupId: string) => {
        try {
            const user = await getCurrentUser();
            if (user) {
                await userService.updateLastSelectedGroup(user.id, groupId);
            }
        } catch (error) {
            console.error('Error saving selected group:', error);
        }
    }, []);

    const fetchStudents = useCallback(async (groupId: string) => {
        await fetchWithCache(
            `students_${groupId}`,
            async () => {
                return await studentService.getStudentsByGroup(groupId);
            },
            setStudents
        );
    }, []);

    const fetchModules = useCallback(async (studentId: string) => {
        await fetchWithCache(
            `modules_active_${studentId}`,
            async () => {
                const user = await getCurrentUser();
                if (!user) return [];
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id || undefined;
                return await trackingService.getModulesWithProgressions(studentId, user.id, studentLevelId);
            },
            (data: any[]) => {
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id;

                const modulesWithStats = (data || []).map(m => {
                    const validActivities = m.Activite?.filter((act: any) => {
                        if (!studentLevelId) return true;
                        const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
                        return levels.length > 0 && levels.includes(studentLevelId);
                    }) || [];

                    const total = validActivities.length;
                    const completed = validActivities.filter((act: any) =>
                        act.Progression?.some((p: any) => p.eleve_id === studentId && (p.etat === 'termine' || p.etat === 'a_verifier'))
                    ).length;

                    return { ...m, total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
                }).filter(m => m.total > 0 && m.completed < m.total);

                const sorted = modulesWithStats.sort((a: any, b: any) => {
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

    const fetchActivities = useCallback(async (moduleId: string, studentId: string) => {
        await fetchWithCache(
            `activities_${moduleId}_${studentId}`,
            async () => {
                const user = await getCurrentUser();
                if (!user) return { activities: [], progressions: [] };
                return await trackingService.getModuleActivitiesAndProgressions(moduleId, studentId, user.id);
            },
            (data: any) => {
                const { activities: acts, progressions: progs } = data;
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id;

                const filtered = (acts || []).filter((act: any) => {
                    const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
                    return levels.length > 0 && levels.includes(studentLevelId);
                });

                const progMap: Record<string, string> = {};
                progs?.forEach((p: any) => { progMap[p.activite_id] = p.etat; });
                setProgressions(progMap);
                setActivities(filtered);
            }
        );
    }, [students]);

    const fetchHelpRequests = useCallback(async () => {
        if (students.length === 0) return;
        const studentIds = students.map(s => s.id);

        const user = await getCurrentUser();
        if (!user) return;

        // trackingService.getHelpRequests handles fetch and filtering
        const validRequests = await trackingService.getHelpRequests(studentIds, user.id);
        setHelpRequests(validRequests);
    }, [students]);

    // --- Navigation Handlers ---
    const handleStudentClick = useCallback((student: Student) => {
        setSelectedStudent(student);
        fetchModules(student.id);
        setView('modules');
    }, [fetchModules]);

    const handleModuleClick = useCallback((module: ModuleWithStats) => {
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

    const handleHelpStatusClick = useCallback(async (requestId: string) => {
        const user = await getCurrentUser();
        if (!user) return;
        const success = await trackingService.updateProgressionStatus(requestId, 'termine', user.id);
        if (success) fetchHelpRequests();
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
