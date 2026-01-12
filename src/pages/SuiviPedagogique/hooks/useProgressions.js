import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

/**
 * useProgressions
 * Manages student progressions, status updates, and rotation logic
 * 
 * @param {object} selectedStudent - Currently selected student
 * @param {array} students - All students in current group
 * @param {string} selectedGroupId - Current group ID
 * @param {array} activities - Current activities list
 * @param {object} manualIndices - Auto-verification indices
 * @param {object} rotationSkips - Rotation skip counts
 * @param {function} setRotationSkips - Update rotation skips
 * @param {object} groupedProgressions - Progression stats by student/branch
 * @param {string} selectedBranchForSuivi - Branch filter for suivi
 * @param {function} fetchHelpRequests - Callback to refresh help requests
 * @returns {object} Progressions state and actions
 */
export function useProgressions(
    selectedStudent,
    students,
    selectedGroupId,
    activities,
    manualIndices,
    rotationSkips,
    setRotationSkips,
    groupedProgressions,
    selectedBranchForSuivi,
    fetchHelpRequests
) {
    const { isOnline, addToQueue } = useOfflineSync();

    const [progressions, setProgressions] = useState({});
    const [itemToDelete, setItemToDelete] = useState(null);

    // Fetch student progressions
    const fetchStudentProgressions = async (studentId) => {
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
            (data) => {
                const progMap = {};
                data?.forEach(p => {
                    progMap[p.activite_id] = p.etat;
                });
                setProgressions(progMap);
            },
            (err) => { }
        );
    };

    // Handle status click (update progression)
    const handleStatusClick = async (activityId, newStatus, specificStudentId = null, explicitBranchId = null) => {
        const targetStudentId = specificStudentId || selectedStudent?.id;
        if (!targetStudentId) return;

        // AUTO-VERIFICATION LOGIC
        if (newStatus === 'termine') {
            let branchId = explicitBranchId;

            if (!branchId) {
                const act = activities.find(a => a.id === activityId);
                if (act) branchId = act.Module?.SousBranche?.Branche?.id;
            }

            if (branchId) {
                const idx = manualIndices[targetStudentId]?.[branchId] ?? 50;
                if (Math.random() * 100 < idx) {
                    newStatus = 'a_verifier';
                    toast("Vérification requise (Auto)", { description: "L'activité doit être vérifiée.", duration: 4000 });
                }
            }
        }

        // Optimistic update
        if (targetStudentId === selectedStudent?.id) {
            setProgressions(prev => ({
                ...prev,
                [activityId]: newStatus
            }));
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'Progression',
                    method: 'upsert',
                    payload: {
                        eleve_id: targetStudentId,
                        activite_id: activityId,
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        user_id: userId
                    },
                    match: null,
                    contextDescription: `Maj statut ${activities.find(a => a.id === activityId)?.nom || 'activité'}`
                });
                toast.info("Sauvegardé hors-ligne");
                return;
            }

            const { error } = await supabase
                .from('Progression')
                .upsert(
                    {
                        eleve_id: targetStudentId,
                        activite_id: activityId,
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        user_id: userId
                    },
                    { onConflict: 'eleve_id,activite_id' }
                );
            if (error) throw error;
            if (fetchHelpRequests) fetchHelpRequests();
        } catch (err) {
            toast.error("Erreur de sauvegarde");
            // Revert optimistic update
            if (targetStudentId === selectedStudent?.id) {
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
            }
        }
    };

    // Add students for suivi (rotation logic)
    const handleAddStudentsForSuivi = async () => {
        if (!students.length) return;

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
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        const { data: { user } } = await supabase.auth.getUser();

        const selectedIds = new Set(candidates.map(c => c.id));
        const newRotationSkips = { ...rotationSkips };

        students.forEach(s => {
            if (selectedIds.has(s.id)) {
                const theirGroups = s.EleveGroupe?.map(eg => eg.groupe_id) || [selectedGroupId];
                theirGroups.forEach(gId => {
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
