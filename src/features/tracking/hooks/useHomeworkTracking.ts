import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { studentService } from '../../students/services/studentService';
import { startOfWeek, format } from 'date-fns';

export interface HomeworkActivity {
    id: string;
    titre: string;
    statut: string;
}

export interface HomeworkModule {
    id: string;
    nom: string;
    activities: HomeworkActivity[];
}

export interface HomeworkStudent {
    id: string;
    prenom: string;
    nom: string;
    modules: HomeworkModule[];
}

export const useHomeworkTracking = (selectedGroupId: string | null, date: Date | null, lieu: 'classe' | 'domicile' = 'domicile') => {
    const [students, setStudents] = useState<HomeworkStudent[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedGroupId || !date) {
                setStudents([]);
                return;
            }

            setLoading(true);
            try {
                // 1. Get students for the group
                const groupStudents = await studentService.getStudentsByGroup(selectedGroupId);
                if (!groupStudents || groupStudents.length === 0) {
                    setStudents([]);
                    return;
                }

                const studentIds = groupStudents.map(s => s.id);
                
                // Use date-fns to get the exact Monday (weekStartsOn: 1 = Monday)
                const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                
                const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                const dayName = days[date.getDay()];

                // 2. Query PlanificationHebdo
                const { data: plans, error: planError } = await supabase
                    .from('PlanificationHebdo')
                    .select('eleve_id, activite_id, statut')
                    .in('eleve_id', studentIds)
                    .eq('semaine_debut', weekStart)
                    .eq('jour', dayName)
                    .eq('lieu', lieu);

                if (planError) throw planError;
                
                // create a fast lookup for planned homework
                const plannedSet = new Set(plans.map(p => `${p.eleve_id}_${p.activite_id}`));
                const planStatusMap = new Map(plans.map(p => [`${p.eleve_id}_${p.activite_id}`, p.statut]));

                // 3. Query valid Progressions (like AvantMail)
                const { data: progressions, error: progError } = await supabase
                    .from('Progression')
                    .select(`
                        eleve_id,
                        activite_id,
                        etat,
                        Activite!inner (
                            id,
                            titre,
                            ordre,
                            Module!inner (
                                id,
                                nom,
                                statut
                            )
                        )
                    `)
                    .in('eleve_id', studentIds)
                    .eq('Activite.Module.statut', 'en_cours')
                    .not('etat', 'in', '("termine","valide","a_verifier")');

                if (progError) throw progError;

                // 4. Format data
                const studentsMap = new Map<string, HomeworkStudent>();

                // Initialize map with all students basic info
                groupStudents.forEach(s => {
                    studentsMap.set(s.id, {
                        id: s.id,
                        prenom: s.prenom || '',
                        nom: s.nom || '',
                        modules: []
                    });
                });

                if (progressions) {
                    progressions.forEach((prog: any) => {
                        const key = `${prog.eleve_id}_${prog.activite_id}`;
                        // ONLY PROCESS IF IT WAS PLANNED FOR THIS DAY AT HOME
                        if (!plannedSet.has(key)) return;

                        const student = studentsMap.get(prog.eleve_id);
                        if (!student || !prog.Activite || !prog.Activite.Module) return;

                        const modId = prog.Activite.Module.id;
                        const modNom = prog.Activite.Module.nom;
                        
                        let moduleObj = student.modules.find(m => m.id === modId);
                        if (!moduleObj) {
                            moduleObj = { id: modId, nom: modNom, activities: [] };
                            student.modules.push(moduleObj);
                        }

                        // Use the status from PlanificationHebdo to display exactly what the student chose
                        const kioskStatut = planStatusMap.get(key) || 'non_demarre';

                        moduleObj.activities.push({
                            id: prog.activite_id,
                            titre: prog.Activite.titre,
                            statut: kioskStatut
                        });
                    });
                }

                // Filter out students with no homework and sort them
                const activeStudents = Array.from(studentsMap.values())
                    .filter(s => s.modules.length > 0)
                    .sort((a, b) => a.prenom.localeCompare(b.prenom));
                
                // Optional: sort activities within modules by order
                // activeStudents.forEach(s => {
                //     s.modules.forEach(m => {
                //         // We could sort by order if we included order in the mapped object
                //     });
                // });

                setStudents(activeStudents);
            } catch (error) {
                console.error('Erreur lors du chargement des travaux à domicile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedGroupId, date]);

    return { students, loading };
};
