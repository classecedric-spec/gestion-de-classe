import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
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
 * Manages help requests, expansions, helpers cache, and realtime sync
 * 
 * @param {Student[]} students - Current students in group
 * @param {Student | null} selectedStudent - Currently viewed student
 * @param {function} fetchStudentProgressions - Callback to refresh student progressions
 * @returns {object} Help requests state and actions
 */
export function useHelpRequests(
    students: Student[],
    selectedStudent: Student | null,
    fetchStudentProgressions?: (studentId: string) => Promise<void>
) {
    const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [helpersCache, setHelpersCache] = useState<Record<string, Helper[]>>({});
    const [ajustementBoost, setAjustementBoost] = useState(0); // Boost counter for ajustement priority

    const selectedStudentRef = useRef<Student | null>(selectedStudent);

    useEffect(() => {
        selectedStudentRef.current = selectedStudent;
    }, [selectedStudent]);

    // Fetch help requests
    const fetchHelpRequests = async () => {
        if (students.length === 0) return;
        const studentIds = students.map(s => s.id);

        try {
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
                .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement'])
                .in('eleve_id', studentIds)
                .order('updated_at', { ascending: true });

            if (error) return;

            // Filter: include if is_suivi OR module is 'en_cours'
            const validRequests = (data as unknown as HelpRequest[] || []).filter(req => {
                if (req.is_suivi) return true;
                // If no module data, still include to avoid hiding valid requests
                if (!req.activite?.Module) return true;
                return req.activite.Module.statut === 'en_cours';
            });

            // Sort with ajustement priority boost
            const sortedRequests = [...validRequests].sort((a, b) => {
                const aIsAjustement = a.etat === 'ajustement';
                const bIsAjustement = b.etat === 'ajustement';

                // Calculate effective position (lower = higher priority)
                const aBoost = aIsAjustement ? -(ajustementBoost * 3) : 0;
                const bBoost = bIsAjustement ? -(ajustementBoost * 3) : 0;

                const aIndex = validRequests.indexOf(a) + aBoost;
                const bIndex = validRequests.indexOf(b) + bBoost;

                return aIndex - bIndex;
            });

            setHelpRequests(sortedRequests);
        } catch (err) {
            console.error('Error fetching help requests:', err);
        }
    };

    // Expand help request to show potential helpers
    const handleExpandHelp = async (requestId: string, activityId: string) => {
        if (expandedRequestId === requestId) {
            setExpandedRequestId(null);
            return;
        }

        setExpandedRequestId(requestId);

        if (helpersCache[requestId]) return;

        if (students.length === 0) return;
        const studentIds = students.map(s => s.id);

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

    // Realtime subscription
    useEffect(() => {
        if (students.length > 0) {
            fetchHelpRequests();

            const channel = supabase
                .channel('suivi_pedagogique_global')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'Progression' },
                    (payload) => {
                        fetchHelpRequests();

                        const currentSelected = selectedStudentRef.current;
                        const impactedId = payload.new?.eleve_id || payload.old?.eleve_id;

                        if (currentSelected && impactedId === currentSelected.id) {
                            if (fetchStudentProgressions) {
                                fetchStudentProgressions(currentSelected.id);
                            }
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [students]);

    // Polling backup
    useEffect(() => {
        const interval = setInterval(() => {
            if (students.length > 0) {
                fetchHelpRequests();
            }
            if (selectedStudentRef.current && fetchStudentProgressions) {
                fetchStudentProgressions(selectedStudentRef.current.id);
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [students]);

    // Ajustement boost timer: every 2 minutes, increase boost by 1
    useEffect(() => {
        const boostInterval = setInterval(() => {
            setAjustementBoost(prev => prev + 1);
        }, 120000);

        return () => clearInterval(boostInterval);
    }, []);

    // Re-sort when boost changes
    useEffect(() => {
        if (ajustementBoost > 0 && students.length > 0) {
            fetchHelpRequests();
        }
    }, [ajustementBoost]);

    return {
        states: {
            helpRequests,
            expandedRequestId,
            helpersCache
        },
        actions: {
            handleExpandHelp,
            fetchHelpRequests
        }
    };
}
