import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/database';

export interface UrgentActivity {
    id: string;
    etat: string;
    updated_at: string;
    Activite: {
        id: string;
        titre: string;
        ordre: number;
        Module: {
            id: string;
            nom: string;
            date_fin: string;
            statut: string;
            SousBranche: {
                nom: string;
                ordre: number;
                Branche: {
                    nom: string;
                    ordre: number;
                };
            };
        };
    };
}

export interface UrgentModule {
    id: string;
    nom: string;
    date_fin: string;
    branchName: string;
    branchOrder: number;
    activities: UrgentActivity[];
}

export interface UrgentStudent {
    id: string;
    prenom: string;
    nom: string;
    photo_url: string | null;
    modules: UrgentModule[];
    totalOverdue: number;
}

export const useGroupUrgentWork = (groupId: string | null) => {
    const [data, setData] = useState<UrgentStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchUrgentWork = async () => {
        if (!groupId) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Fetch overdue progressions for the group
            // Rules: etat != 'termine' AND module.date_fin < now AND module.statut == 'en_cours'
            const now = new Date().toISOString();

            // We fetch all progressions for students in the group, we'll filter levels in JS if needed
            // but the query will focus on overdue status.
            const { data: progressions, error: progError } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    updated_at,
                    eleve_id,
                    Eleve (
                        id, prenom, nom, photo_url,
                        EleveGroupe!inner(groupe_id)
                    ),
                    Activite (
                        id, titre, ordre,
                        Module (
                            id, nom, date_fin, statut,
                            SousBranche (
                                nom, ordre,
                                Branche (nom, ordre)
                            )
                        )
                    )
                `)
                .eq('Eleve.EleveGroupe.groupe_id', groupId)
                .neq('etat', 'termine')
                .neq('etat', 'valide'); // Assuming 'valide' is also a terminal state

            if (progError) throw progError;

            // 2. Filter and Transform in memory for exact business logic
            const currentTimestamp = new Date().getTime();

            const studentMap: Record<string, UrgentStudent> = {};

            (progressions as any[])?.forEach((p: any) => {
                const module = p.Activite?.Module;

                // CRITERIA 2: Deadline passed
                if (!module || !module.date_fin) return;
                const deadline = new Date(module.date_fin).getTime();
                if (deadline >= currentTimestamp) return;

                // CRITERIA 3: Module Active
                if (module.statut !== 'en_cours') return;

                const eleve = p.Eleve;
                if (!eleve) return;

                if (!studentMap[eleve.id]) {
                    studentMap[eleve.id] = {
                        id: eleve.id,
                        prenom: eleve.prenom,
                        nom: eleve.nom,
                        photo_url: eleve.photo_url,
                        modules: [],
                        totalOverdue: 0
                    };
                }

                // Group by module
                const student = studentMap[eleve.id];
                let urgentModule = student.modules.find(m => m.id === module.id);

                if (!urgentModule) {
                    urgentModule = {
                        id: module.id,
                        nom: module.nom,
                        date_fin: module.date_fin,
                        branchName: module.SousBranche?.Branche?.nom || 'Inconnu',
                        branchOrder: module.SousBranche?.Branche?.ordre || 999,
                        activities: []
                    };
                    student.modules.push(urgentModule);
                }

                urgentModule.activities.push(p);
                student.totalOverdue++;
            });

            // 3. Sorting logic
            const result = Object.values(studentMap).map(student => {
                // Sort Modules within student: date_fin (ASC), then branchOrder (ASC), then name (ASC)
                student.modules.sort((a, b) => {
                    const dateA = new Date(a.date_fin).getTime();
                    const dateB = new Date(b.date_fin).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    if (a.branchOrder !== b.branchOrder) return a.branchOrder - b.branchOrder;
                    return a.nom.localeCompare(b.nom);
                });

                // Sort activities within module: ordre (ASC)
                student.modules.forEach(m => {
                    m.activities.sort((a, b) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0));
                });

                return student;
            });

            // Sort Students: totalOverdue (DESC)
            result.sort((a, b) => b.totalOverdue - a.totalOverdue);

            setData(result);
            setError(null);
        } catch (err: any) {
            console.error("Error in useGroupUrgentWork:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUrgentWork();
    }, [groupId]);

    const refresh = () => fetchUrgentWork();

    return { data, loading, error, refresh };
};
