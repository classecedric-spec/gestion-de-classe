import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { useUpdateProgression } from '../../../hooks/useUpdateProgression';
import { toast } from 'sonner';
import { Student } from '../../attendance/services/attendanceService';
import { Activity } from './useBranchesAndModules';
import { trackingService } from '../services/trackingService';

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
    fetchHelpRequests?: () => void,
    defaultLuckyCheckIndex?: number
) {
    // const { isOnline, addToQueue } = useOfflineSync();

    const { updateProgression } = useUpdateProgression();

    const [progressions, setProgressions] = useState<Record<string, string>>({});
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);



    // Fetch student progressions
    const fetchStudentProgressions = async (studentId: string) => {
        await fetchWithCache(
            `progressions_pedago_${studentId}`,
            async () => {
                const progMap = await trackingService.fetchStudentProgressionsMap(studentId);
                // Normalize back to array for cache consistency if cache expects array? 
                // Wait, hook logic maps array to map. 
                // trackingService returns map. 
                // Let's adapt logic.
                return progMap;
            },
            (data: any) => {
                // If service returns map directly
                setProgressions(data);
            },
            (_err) => { }
        );
    };

    // Handle status click
    const handleStatusClick = useCallback(async (
        activityId: string,
        newStatus: string,
        currentStatus: string, // PASSED explicitly to avoid 'progressions' dependency
        specificStudentId: string | null = null,
        explicitBranchId: string | null = null
    ) => {
        const targetStudentId = specificStudentId || selectedStudent?.id;
        if (!targetStudentId) return;

        let finalStatus = newStatus;

        // AUTO-VERIFICATION LOGIC
        if (finalStatus === 'termine') {
            let branchId = explicitBranchId;

            if (!branchId) {
                const act = activities.find(a => a.id === activityId);
                if (act) branchId = act.Module?.SousBranche?.Branche?.id || null;
            }

            if (branchId) {
                const specificIdx = manualIndices[targetStudentId]?.[branchId];
                const studentGlobalIdx = selectedStudent?.importance_suivi;

                // Fallback chain: specific branch index > student global importance > global default
                const idx = specificIdx ?? studentGlobalIdx ?? defaultLuckyCheckIndex ?? 50;
                const randomRoll = Math.random() * 100;
                const willVerify = randomRoll < idx;

                const targetStudent = students.find(s => s.id === targetStudentId);
                const act = activities.find(a => a.id === activityId);

                console.log(`[Dashboard] ${targetStudent?.prenom} ${targetStudent?.nom} | Module: ${act?.Module?.nom} | Activité: ${act?.titre}`);
                console.log(`- Détail des indices : Matière: ${specificIdx ?? '---'}% | Élève: ${studentGlobalIdx ?? '---'}% | Défaut: ${defaultLuckyCheckIndex ?? 50}%`);
                console.log(`- Indice appliqué : ${idx}% (Source: ${specificIdx !== undefined && specificIdx !== null ? 'MATIÈRE' : (studentGlobalIdx !== undefined && studentGlobalIdx !== null ? 'ÉLÈVE' : 'DÉFAUT')})`);
                console.log(`- Tirage: ${randomRoll.toFixed(2)}% | Décision: ${willVerify ? 'À VÉRIFIER 🟣' : 'TERMINÉ 🟢'}`);

                if (willVerify) {
                    finalStatus = 'a_verifier';
                    toast("Vérification requise (Auto)", { description: "L'activité doit être vérifiée.", duration: 4000 });
                }
            }
        }

        // TRUST ADJUSTMENT LOGIC (Learning)
        if (currentStatus === 'a_verifier') {
            const act = activities.find(a => a.id === activityId);
            const branchId = act?.Module?.SousBranche?.Branche?.id;

            if (branchId) {
                if (finalStatus === 'termine') {
                    // Validation success: increase trust (decrease index)
                    trackingService.updateStudentTrust(targetStudentId, branchId, -2, 'up');
                    toast.success("Confiance augmentée (-2%)");
                } else if (finalStatus === 'a_commencer') {
                    // Validation failure: decrease trust (increase index)
                    trackingService.updateStudentTrust(targetStudentId, branchId, 5, 'down');
                    toast.error("Confiance diminuée (+5%)");
                }
            }
        }

        const effectiveCurrentStatus = currentStatus || 'a_commencer';

        await updateProgression(targetStudentId, activityId, effectiveCurrentStatus, {
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
                    fetchStudentProgressions(targetStudentId);
                }
            },
            onSuccess: fetchHelpRequests
        });
    }, [selectedStudent, activities, manualIndices, updateProgression, fetchHelpRequests]);

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

            const baseImp = (s as any).importance_suivi !== null ? (s as any).importance_suivi : 50;
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
                // @ts-ignore
                const theirGroups = s.EleveGroupe?.map((eg: any) => eg.groupe_id) || [selectedGroupId];
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
            await trackingService.saveUserPreference(user.id, 'suivi_rotation_skips', newRotationSkips);
        }

        // Create progressions
        const newProgs = candidates.map(student => ({
            eleve_id: student.id,
            activite_id: null as unknown as string,
            etat: 'besoin_d_aide',
            is_suivi: true,
            user_id: user?.id,
            updated_at: new Date().toISOString()
        }));

        await trackingService.createProgressions(newProgs);

        toast.success("3 élèves ajoutés au suivi personnalisé");
        if (fetchHelpRequests) fetchHelpRequests();
    };

    // Delete suivi entry
    const handleDeleteSuivi = async () => {
        if (!itemToDelete) return;

        try {
            await trackingService.deleteProgression(itemToDelete.id);

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
