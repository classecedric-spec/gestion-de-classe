import { useState, useEffect, useCallback } from 'react';
import { studentService } from '../../../features/students/services/studentService';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { Student } from '../../../features/attendance/services/attendanceService';
import { AvancementModule } from './useAvancementData';

export interface AvancementActivity {
    id: string;
    titre: string;
    ordre: number;
    module_id: string;
    Module?: AvancementModule;
    ActiviteNiveau?: {
        niveau_id: string;
    }[];
}

export type ProgressionMap = Record<string, string>;

/**
 * useStudentsAndActivities - Hook pour gérer élèves et activités avec progressions
 */
export const useStudentsAndActivities = (
    selectedGroupId: string,
    selectedModuleId: string,
    selectedDateFin: string,
    selectedBrancheId: string,
    getFilteredModules: () => AvancementModule[]
) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [activities, setActivities] = useState<AvancementActivity[]>([]);
    const [progressions, setProgressions] = useState<ProgressionMap>({});
    const [relevantModuleIds, setRelevantModuleIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState<boolean>(false);

    const fetchStudents = useCallback(async (groupId: string) => {
        setLoading(true);
        try {
            const data = await studentService.getStudentsByGroup(groupId);
            const sortedStudents = (data as Student[] || []).sort((a, b) => {
                const levelA = a.Niveau?.ordre || 0;
                const levelB = b.Niveau?.ordre || 0;
                if (levelA !== levelB) return levelA - levelB;

                const prenomA = (a.prenom || '').toLowerCase();
                const prenomB = (b.prenom || '').toLowerCase();
                if (prenomA !== prenomB) return prenomA.localeCompare(prenomB);

                return (a.nom || '').localeCompare(b.nom || '');
            });

            setStudents(sortedStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchActivitiesAndProgress = useCallback(async (moduleIds: string[]) => {
        setLoading(true);
        try {
            const acts = await trackingService.getActivitiesByModules(moduleIds);

            const sortedActs = (acts as AvancementActivity[] || []).sort((a, b) => {
                const modA = a.Module;
                const modB = b.Module;

                if (modA?.id !== modB?.id) {
                    if (modA?.date_fin !== modB?.date_fin) {
                        if (!modA?.date_fin) return 1;
                        if (!modB?.date_fin) return -1;
                        return modA.date_fin.localeCompare(modB.date_fin);
                    }

                    const aB = (modA?.SousBranche as any)?.Branche;
                    const bB = (modB?.SousBranche as any)?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    if (aB?.nom !== bB?.nom) return (aB?.nom || '').localeCompare(bB?.nom || '');

                    const aSB = modA?.SousBranche;
                    const bSB = modB?.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    if (aSB?.nom !== bSB?.nom) return (aSB?.nom || '').localeCompare(bSB?.nom || '');

                    const aNom = modA?.nom || '';
                    const bNom = modB?.nom || '';
                    if (aNom !== bNom) return aNom.localeCompare(bNom);
                }

                return (a.ordre || 0) - (b.ordre || 0);
            });

            if (students.length > 0 && sortedActs.length > 0) {
                const studentIds = students.map(s => s.id);
                const actIds = sortedActs.map(a => a.id);

                const allProgs = await trackingService.getProgressionsForStudentsAndActivities(studentIds, actIds);

                const progMap: ProgressionMap = {};
                const modulesWithProgs = new Set<string>();
                const studentModulesMap: Record<string, Set<string>> = {};

                const actMap = new Map();
                sortedActs.forEach(a => actMap.set(a.id, a));

                allProgs.forEach(p => {
                    progMap[`${p.eleve_id}-${p.activite_id}`] = p.etat;
                    const act = actMap.get(p.activite_id);
                    if (act && act.module_id) {
                        modulesWithProgs.add(act.module_id);
                        if (!studentModulesMap[act.module_id]) {
                            studentModulesMap[act.module_id] = new Set();
                        }
                        const student = students.find(s => s.id === p.eleve_id);
                        if (student && student.prenom) {
                            studentModulesMap[act.module_id].add(student.prenom);
                        }
                    }
                });

                // Console logs from user specification
                console.log("=== [Filtrage Suivi Groupes] ===");
                modulesWithProgs.forEach(modId => {
                    const modName = sortedActs.find(a => a.module_id === modId)?.Module?.nom || modId;
                    const studentNames = Array.from(studentModulesMap[modId] || []).join(', ');
                    console.log(`Module AFFICHE : "${modName}" | Élèves liés :`, studentNames);
                });
                console.log("================================");

                setRelevantModuleIds(modulesWithProgs);

                // Afficher uniquement les activités appartenant aux modules pertinents
                const filteredActs = sortedActs.filter(a => modulesWithProgs.has(a.module_id));
                setActivities(filteredActs);
                setProgressions(progMap);
            } else {
                setActivities([]);
                setProgressions({});
                setRelevantModuleIds(new Set());
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    }, [students]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
        } else {
            setStudents([]);
        }
    }, [selectedGroupId, fetchStudents]);

    useEffect(() => {
        if (selectedModuleId) {
            fetchActivitiesAndProgress([selectedModuleId]);
        } else if (selectedDateFin || selectedBrancheId) {
            const filteredModules = getFilteredModules();
            const moduleIds = filteredModules.map(m => m.id);

            if (moduleIds.length > 0) {
                fetchActivitiesAndProgress(moduleIds);
            } else {
                setActivities([]);
                setProgressions({});
                setRelevantModuleIds(new Set());
            }
        } else {
            setActivities([]);
            setProgressions({});
            setRelevantModuleIds(new Set());
        }
    }, [selectedModuleId, selectedDateFin, selectedBrancheId, students, getFilteredModules, fetchActivitiesAndProgress]);

    return {
        students,
        activities,
        progressions,
        relevantModuleIds,
        setProgressions,
        loading
    };
};
