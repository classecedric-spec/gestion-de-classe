import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
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
    const [loading, setLoading] = useState<boolean>(false);

    const fetchStudents = useCallback(async (groupId: string) => {
        setLoading(true);
        try {
            const { data: eleveIdsData } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            const eleveIds = eleveIdsData?.map(e => e.eleve_id) || [];

            if (eleveIds.length > 0) {
                const { data } = await supabase
                    .from('Eleve')
                    .select('*, Niveau(ordre, nom)')
                    .in('id', eleveIds);

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
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchActivitiesAndProgress = useCallback(async (moduleIds: string[]) => {
        setLoading(true);
        try {
            const { data: acts } = await supabase
                .from('Activite')
                .select(`
                    *,
                    Module(
                        id,
                        nom,
                        date_fin,
                        SousBranche(
                            id,
                            nom,
                            ordre,
                            Branche(
                                id,
                                nom,
                                ordre
                            )
                        )
                    ),
                    ActiviteNiveau(niveau_id)
                `)
                .in('module_id', moduleIds);

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

                const CHUNK_SIZE = 50;
                let allProgs: any[] = [];

                for (let i = 0; i < actIds.length; i += CHUNK_SIZE) {
                    const chunk = actIds.slice(i, i + CHUNK_SIZE);
                    const { data: chunkProgs } = await supabase
                        .from('Progression')
                        .select('eleve_id, activite_id, etat')
                        .in('eleve_id', studentIds)
                        .in('activite_id', chunk);

                    if (chunkProgs) {
                        allProgs = allProgs.concat(chunkProgs);
                    }
                }

                const groupLevelIds = new Set(students.map(s => s.niveau_id).filter(Boolean));

                const filteredActs = sortedActs.filter(a => {
                    const actLevels = a.ActiviteNiveau?.map(an => an.niveau_id) || [];
                    if (actLevels.length === 0) return false;
                    return actLevels.some(id => groupLevelIds.has(id));
                });

                setActivities(filteredActs);

                const progMap: ProgressionMap = {};
                allProgs.forEach(p => {
                    progMap[`${p.eleve_id}-${p.activite_id}`] = p.etat;
                });
                setProgressions(progMap);
            } else {
                setActivities([]);
                setProgressions({});
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
            }
        } else {
            setActivities([]);
            setProgressions({});
        }
    }, [selectedModuleId, selectedDateFin, selectedBrancheId, students, getFilteredModules, fetchActivitiesAndProgress]);

    return {
        students,
        activities,
        progressions,
        setProgressions,
        loading
    };
};
