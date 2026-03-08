import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/database';
import { Student } from '../../attendance/services/attendanceService';

export interface HelpRequest {
    id: string;
    etat: string;
    is_suivi: boolean;
    eleve: {
        id: string;
        prenom: string;
        nom: string;
    } | null;
    activite: {
        id: string;
        titre: string;
        Module: {
            id: string;
            nom: string;
            date_fin: string | null;
            statut: string | null;
            SousBranche: {
                Branche: {
                    id: string;
                } | null;
            } | null;
        } | null;
        ActiviteMateriel: {
            TypeMateriel: {
                acronyme: string | null;
            } | null;
        }[];
    } | null;
}

export interface Helper {
    id: string;
    prenom: string;
    nom: string;
}

/**
 * useHelpRequests
 * Manages help requests using TanStack Query for caching and global sync
 */
export function useHelpRequests(
    students: Student[],
    selectedStudent: Student | null,
    fetchStudentProgressions?: (studentId: string) => Promise<void>
) {
    const queryClient = useQueryClient();
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [helpersCache, setHelpersCache] = useState<Record<string, Helper[]>>({});
    const [ajustementBoost, setAjustementBoost] = useState(0);

    const studentIds = useMemo(() => students.map(s => s.id), [students]);

    // 1. Help Requests Query
    const { data: helpRequestsRaw = [] } = useQuery({
        queryKey: ['help-requests', studentIds],
        queryFn: async () => {
            if (studentIds.length === 0) return [];

            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    is_suivi,
                    eleve:Eleve(id, prenom, nom),
                    activite:Activite(
                        id,
                        titre,
                        Module(
                            id,
                            nom,
                            date_fin,
                            statut,
                            SousBranche (
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
                    )
                `)
                .in('etat', ['besoin_d_aide', 'ajustement'])
                .in('eleve_id', studentIds)
                .order('updated_at', { ascending: true });

            if (error) throw error;
            return data as unknown as HelpRequest[];
        },
        enabled: studentIds.length > 0,
        staleTime: 1000 * 30, // 30 seconds
    });

    // 2. Filter and Sort logic
    const helpRequests = useMemo(() => {
        const validRequests = helpRequestsRaw.filter(req => {
            if (req.is_suivi) return true;
            if (!req.activite?.Module) return true;
            return req.activite.Module.statut === 'en_cours';
        });

        return [...validRequests].sort((a, b) => {
            const aIsAjustement = a.etat === 'ajustement';
            const bIsAjustement = b.etat === 'ajustement';
            const aBoost = aIsAjustement ? -(ajustementBoost * 3) : 0;
            const bBoost = bIsAjustement ? -(ajustementBoost * 3) : 0;
            const aIndex = validRequests.indexOf(a) + aBoost;
            const bIndex = validRequests.indexOf(b) + bBoost;
            return aIndex - bIndex;
        });
    }, [helpRequestsRaw, ajustementBoost]);

    // 3. Actions
    const handleExpandHelp = async (requestId: string, activityId: string) => {
        if (expandedRequestId === requestId) {
            setExpandedRequestId(null);
            return;
        }

        setExpandedRequestId(requestId);
        if (helpersCache[requestId]) return;

        try {
            const { data } = await supabase
                .from('Progression')
                .select('eleve:Eleve(id, prenom, nom)')
                .eq('activite_id', activityId)
                .eq('etat', 'termine')
                .in('eleve_id', studentIds);

            const finishers = (data as any[])?.map(p => p.eleve).filter(Boolean) || [];
            const randomHelpers = finishers.sort(() => 0.5 - Math.random()).slice(0, 3);

            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) {
            console.error('Error fetching helpers:', err);
        }
    };

    // 4. Invalidation hook for selected student
    useEffect(() => {
        if (selectedStudent && fetchStudentProgressions) {
            fetchStudentProgressions(selectedStudent.id);
        }
    }, [helpRequestsRaw, selectedStudent, fetchStudentProgressions]);

    // 5. Ajustement boost logic
    useEffect(() => {
        const boostInterval = setInterval(() => {
            setAjustementBoost(prev => prev + 1);
        }, 120000);
        return () => clearInterval(boostInterval);
    }, []);

    return {
        states: {
            helpRequests,
            expandedRequestId,
            helpersCache
        },
        actions: {
            handleExpandHelp,
            fetchHelpRequests: () => queryClient.invalidateQueries({ queryKey: ['help-requests', studentIds] })
        }
    };
}
