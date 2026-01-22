import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { useUpdateProgression } from '../../../hooks/useUpdateProgression';
import { toast } from 'sonner';
import { Student } from '../../attendance/services/attendanceService';
import { Activity } from './useBranchesAndModules';

/**
 * useProgressions
 * Manages student progressions, status updates, and rotation logic
 * 
 * @param {Student | null} selectedStudent - Currently selected student
 * @param {Student[]} students - All students in current group
 * @param {string | null} selectedGroupId - Current group ID
 * @param {Activity[]} activities - Current activities list
 * @param {Record<string, any>} manualIndices - Auto-verification indices
 * @param {Record<string, any>} rotationSkips - Rotation skip counts
 * @param {function} setRotationSkips - Update rotation skips
 * @param {Record<string, Record<string, { total: number; done: number }>>} groupedProgressions - Progression stats by student/branch
 * @param {string} selectedBranchForSuivi - Branch filter for suivi
 * @param {function} fetchHelpRequests - Callback to refresh help requests
 * @returns {object} Progressions state and actions
 */
export function useProgressions(
    selectedStudent: Student | null,
    students: Student[],
    selectedGroupId: string | null,
    activities: Activity[],
    manualIndices: Record<string, any>,
    rotationSkips: Record<string, any>,
    setRotationSkips: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    groupedProgressions: Record<string, Record<string, { total: number; done: number }>>,
    selectedBranchForSuivi: string,
    fetchHelpRequests?: () => void
) {
    const { isOnline, addToQueue } = useOfflineSync();
    const { updateProgression } = useUpdateProgression();

    const [progressions, setProgressions] = useState<Record<string, string>>({});
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);

    // Fetch student progressions
    const fetchStudentProgressions = async (studentId: string) => {
        await fetchWithCache(
            `progressions_pedago_${studentId}`,
            async () => {
                const { data, error } = await supabase
                    .from('Progression')
                    .select('activite_id, etat')
                    .eq('eleve_id', studentId);
                if (error) throw error;
                return data || [];
            },
            (data: any[]) => {
                const progMap: Record<string, string> = {};
                data?.forEach(p => {
                    if (p.activite_id) {
                        progMap[p.activite_id] = p.etat;
                    }
                });
                setProgressions(progMap);
            },
            (_err) => { }
        );
    };

    // Handle status click (update progression)
    const handleStatusClick = async (activityId: string, newStatus: string, specificStudentId: string | null = null, explicitBranchId: string | null = null) => {
        const targetStudentId = specificStudentId || selectedStudent?.id;
        if (!targetStudentId) return;

        let finalStatus = newStatus;

        // AUTO-VERIFICATION LOGIC
        if (finalStatus === 'termine') {
            let branchId = explicitBranchId;

            if (!branchId) {
                const act = activities.find(a => a.id === activityId);
                if (act) branchId = act.Module?.SousBranche?.Branche?.id;
            }

            if (branchId) {
                const idx = manualIndices[targetStudentId]?.[branchId] ?? 50;
                if (Math.random() * 100 < idx) {
                    finalStatus = 'a_verifier';
                    toast("Vérification requise (Auto)", { description: "L'activité doit être vérifiée.", duration: 4000 });
                }
            }
        }

        const currentStatus = progressions[activityId] || 'a_commencer';

        await updateProgression(targetStudentId, activityId, currentStatus, {
            explicitNextStatus: finalStatus,
            onOptimisticUpdate: (status) => {
                if (targetStudentId === selectedStudent?.id) {
                    setProgressions(prev => ({
                        ...prev,
                        [activityId]: status
                    }));
                }
            },
            onRevert: async () => {
                if (targetStudentId === selectedStudent?.id) {
                    try {
                        const { data: revertedProg } = await supabase
                            .from('Progression')
                            .select('etat')
                            .eq('eleve_id', targetStudentId)
                            .eq('activite_id', activityId)
                            .single();

                        setProgressions(prev => ({
                            ...prev,
                            [activityId]: revertedProg?.etat || 'a_commencer'
                        }));
                    } catch (e) {
                        // Fallback if fetch fails
                        setProgressions(prev => ({ ...prev, [activityId]: 'a_commencer' }));
                    }
                }
            },
            onSuccess: fetchHelpRequests
        });
    };

    // Add students for suivi (rotation logic)
    const handleAddStudentsForSuivi = async () => {
        if (!students.length || !selectedGroupId) return;

        const currentGroupSkips = rotationSkips[selectedGroupId] || {};
        const eligiblePool = students.filter(s => !(currentGroupSkips[s.id] > 0));
        const targets = eligiblePool.length > 0 ? eligiblePool : students;

        const candidates = targets.map(s => {
            let performanceMultiplier = 0;

            const sStats = groupedProgressions[s.id] || {};

            if (selectedBranchForSuivi === 'global') {
                let maxDeficit = 0;
                Object.values(sStats).forEach(stat => {
                    if (stat.total > 0) {
                        const deficit = 1 - (stat.done / stat.total);
                        if (deficit > maxDeficit) maxDeficit = deficit;
                    }
                });
                performanceMultiplier = maxDeficit;
            } else {
                const stat = sStats[selectedBranchForSuivi];
                if (stat && stat.total > 0) {
                    performanceMultiplier = 1 - (stat.done / stat.total);
                } else {
                    performanceMultiplier = 0.5;
                }
            }

            const baseImp = s.importance_suivi !== null ? s.importance_suivi : 50;
            const weight = baseImp * (1 + (2 * performanceMultiplier));

            return {
                ...s,
                score: Math.random() * weight
            };
        })
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3);

        const { data: { user } } = await supabase.auth.getUser();

        const selectedIds = new Set(candidates.map(c => c.id));
        const newRotationSkips = { ...rotationSkips };

        students.forEach(s => {
            if (selectedIds.has(s.id)) {
                const theirGroups = (s as any).EleveGroupe?.map((eg: any) => eg.groupe_id) || [selectedGroupId];
                theirGroups.forEach((gId: string) => {
                    newRotationSkips[gId] = {
                        ...(newRotationSkips[gId] || {}),
                        [s.id]: 2
                    };
                });
            } else {
                const currentVal = newRotationSkips[selectedGroupId]?.[s.id] || 0;
                if (currentVal > 0) {
                    newRotationSkips[selectedGroupId] = {
                        ...newRotationSkips[selectedGroupId],
                        [s.id]: currentVal - 1
                    };
                }
            }
        });

        setRotationSkips(newRotationSkips);

        // Persist skips
        if (user) {
            await supabase.from('UserPreference').upsert({
                user_id: user.id,
                key: 'suivi_rotation_skips',
                value: newRotationSkips,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });
        }

        for (const student of candidates) {
            await supabase.from('Progression').insert({
                eleve_id: student.id,
                activite_id: null,
                etat: 'besoin_d_aide',
                is_suivi: true,
                user_id: user?.id,
                updated_at: new Date().toISOString()
            });
        }

        toast.success("3 élèves ajoutés au suivi personnalisé");
        if (fetchHelpRequests) fetchHelpRequests();
    };

    // Delete suivi entry
    const handleDeleteSuivi = async () => {
        if (!itemToDelete) return;

        try {
            const { error } = await supabase
                .from('Progression')
                .delete()
                .eq('id', itemToDelete.id);

            if (error) throw error;

            toast.success("Élève retiré du suivi");
            setItemToDelete(null);
            if (fetchHelpRequests) fetchHelpRequests();
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        }
    };

    return {
        states: {
            progressions,
            itemToDelete
        },
        actions: {
            handleStatusClick,
            handleAddStudentsForSuivi,
            handleDeleteSuivi,
            setItemToDelete,
            fetchStudentProgressions
        }
    };
}
