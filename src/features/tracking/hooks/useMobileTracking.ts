import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/database';
import { toast } from 'sonner';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { trackingService, ProgressionWithDetails, StudentBasicInfo } from '../services/trackingService';
import { groupService } from '../../groups/services/groupService';
import { userService } from '../../users/services/userService';

export function useMobileTracking() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isOnline, addToQueue } = useOfflineSync();

    // --- Data Queries ---

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupService.getGroups(),
    });

    const { data: groupInfo } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => groupId ? trackingService.fetchGroupInfo(groupId) : null,
        enabled: !!groupId,
    });

    const { data: studentsData } = useQuery({
        queryKey: ['students', 'group', groupId],
        queryFn: () => groupId ? trackingService.fetchStudentsInGroup(groupId) : null,
        enabled: !!groupId,
    });

    const studentsIds = useMemo(() => studentsData?.ids || [], [studentsData]);
    const fullStudents = useMemo(() => studentsData?.full || [], [studentsData]);

    const { data: helpRequests = [], isLoading: loading } = useQuery({
        queryKey: ['help-requests', studentsIds],
        queryFn: async () => {
            if (studentsIds.length === 0) return [];
            return trackingService.fetchHelpRequests(studentsIds);
        },
        enabled: studentsIds.length > 0,
    });

    const { data: userPrefs } = useQuery({
        queryKey: ['user-preferences'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const indices = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
            const skips = await trackingService.loadUserPreference(user.id, 'suivi_rotation_skips');
            return { indices: indices || {}, skips: skips || {}, userId: user.id };
        },
    });

    // --- Local UI State ---
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
    const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [helpersCache, setHelpersCache] = useState<Record<string, StudentBasicInfo[]>>({});
    const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
    const [pendingValidation, setPendingValidation] = useState<{
        req: ProgressionWithDetails;
        action: 'non_valide' | 'status_quo' | 'valide';
        initialScore: number;
        adjustment: number;
        finalScore: number;
    } | null>(null);

    // --- Mutations ---

    const savePrefMutation = useMutation({
        mutationFn: async ({ key, value }: { key: string, value: any }) => {
            if (!userPrefs?.userId) return;
            await trackingService.saveUserPreference(userPrefs.userId, key, value);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
        }
    });

    // --- Actions ---

    const handleGroupChange = async (newGroupId: string) => {
        if (newGroupId && newGroupId !== groupId) {
            if (userPrefs?.userId) {
                await userService.updateLastSelectedGroup(userPrefs.userId, newGroupId);
            }
            navigate(`/mobile-suivi/${newGroupId}`);
        }
    };

    const handleExpandHelp = async (requestId: string, activityId: string | undefined) => {
        if (!activityId) return;

        if (expandedRequestId === requestId) {
            setExpandedRequestId(null);
            return;
        }
        setExpandedRequestId(requestId);

        if (helpersCache[requestId]) return;

        try {
            const helpers = await trackingService.findHelpers(activityId, studentsIds);
            const randomHelpers = helpers.sort(() => 0.5 - Math.random()).slice(0, 3);
            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAutoSuivi = async () => {
        if (!fullStudents.length || isAutoGenerating || !groupId || !userPrefs) return;
        setIsAutoGenerating(true);

        try {
            const currentGroupSkips = userPrefs.skips[groupId] || {};
            const eligiblePool = fullStudents.filter(s => !(currentGroupSkips[s.id] > 0));
            const targets = eligiblePool.length > 0 ? eligiblePool : fullStudents;

            const candidates = targets.map(s => {
                const baseImp = (s as any).importance_suivi !== null ? (s as any).importance_suivi : 50;
                const weight = baseImp * (1 + Math.random());
                return { ...s, score: Math.random() * weight };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            const selectedIds = new Set(candidates.map(c => c.id));
            const newRotationSkips = { ...userPrefs.skips };

            fullStudents.forEach(s => {
                if (selectedIds.has(s.id)) {
                    newRotationSkips[groupId] = { ...(newRotationSkips[groupId] || {}), [s.id]: 2 };
                } else {
                    const currentVal = newRotationSkips[groupId]?.[s.id] || 0;
                    if (currentVal > 0) {
                        newRotationSkips[groupId] = { ...newRotationSkips[groupId], [s.id]: currentVal - 1 };
                    }
                }
            });

            await savePrefMutation.mutateAsync({ key: 'suivi_rotation_skips', value: newRotationSkips });

            const newProgressions = candidates.map(student => ({
                eleve_id: student.id,
                activite_id: null,
                etat: 'besoin_d_aide',
                is_suivi: true,
                user_id: userPrefs.userId,
                updated_at: new Date().toISOString()
            }));

            await trackingService.createProgressions(newProgressions as any);
            toast.success("3 élèves ajoutés");
            queryClient.invalidateQueries({ queryKey: ['help-requests'] });

        } catch (err) {
            toast.error("Erreur lors de la génération");
            console.error(err);
        } finally {
            setIsAutoGenerating(false);
        }
    };

    const initiateStatusUpdate = (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => {
        let indexAdjustment = 0;
        let currentVal = 50;

        if (req.activite?.Module?.SousBranche?.branche_id && req.eleve_id && userPrefs) {
            const branchId = req.activite.Module.SousBranche.branche_id;
            const eleveId = req.eleve_id;
            const studentData = userPrefs.indices[eleveId] || {};
            currentVal = Number(studentData[branchId] ?? 50);
        }

        if (action === 'non_valide') {
            indexAdjustment = 5;
        } else if (action === 'valide') {
            indexAdjustment = -2;
        }

        const newVal = Math.max(0, Math.min(100, currentVal + indexAdjustment));

        setPendingValidation({
            req,
            action,
            initialScore: currentVal,
            adjustment: indexAdjustment,
            finalScore: newVal
        });
    };

    const confirmStatusUpdate = async () => {
        if (!pendingValidation) return;
        const { req, action } = pendingValidation;

        setPendingValidation(null);
        await handleStatusUpdate(req, action);
    };

    const cancelStatusUpdate = () => {
        setPendingValidation(null);
    };

    const handleStatusUpdate = async (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => {
        try {
            let newStatus = '';
            let indexAdjustment = 0;

            if (action === 'non_valide') {
                newStatus = 'a_commencer';
                indexAdjustment = 5;
            } else if (action === 'status_quo') {
                newStatus = 'a_commencer';
            } else if (action === 'valide') {
                newStatus = 'termine';
                indexAdjustment = -2;
            }

            if (indexAdjustment !== 0 && req.activite?.Module?.SousBranche?.branche_id && req.eleve_id && userPrefs) {
                const branchId = req.activite.Module.SousBranche.branche_id;
                const eleveId = req.eleve_id;
                const studentData = userPrefs.indices[eleveId] || {};
                const currentVal = Number(studentData[branchId] ?? 50);
                const newVal = Math.max(0, Math.min(100, currentVal + indexAdjustment));

                const newIndices = {
                    ...userPrefs.indices,
                    [eleveId]: { ...studentData, [branchId]: newVal }
                };
                await savePrefMutation.mutateAsync({ key: 'eleve_profil_competences', value: newIndices });
            }

            if (!isOnline) {
                let payload: any = { etat: newStatus, updated_at: new Date().toISOString() };
                if (req.is_suivi) payload.is_suivi = false;

                addToQueue({
                    type: 'SUPABASE_CALL', table: 'Progression', method: 'update',
                    payload, match: { id: req.id },
                    contextDescription: `Maj statut ${req.eleve?.prenom}`
                });
                toast.success("Action sauvegardée (Hors ligne)");
            } else {
                await trackingService.updateProgressionStatus(req.id, newStatus, req.is_suivi || false);
                toast.success("Mis à jour");
            }
            queryClient.invalidateQueries({ queryKey: ['help-requests'] });

        } catch (err) {
            toast.error("Erreur de mise à jour");
        }
    };

    const handleClear = async (req: ProgressionWithDetails) => {
        try {
            if (!isOnline) {
                if (req.is_suivi) {
                    addToQueue({
                        type: 'SUPABASE_CALL', table: 'Progression', method: 'delete', match: { id: req.id }, payload: null,
                        contextDescription: `Suppression suivi ${req.eleve?.prenom}`
                    });
                } else {
                    addToQueue({
                        type: 'SUPABASE_CALL', table: 'Progression', method: 'update',
                        payload: { etat: 'a_commencer', updated_at: new Date().toISOString() },
                        match: { id: req.id },
                        contextDescription: `Reset statut ${req.eleve?.prenom}`
                    });
                }
                toast.success("Action sauvegardée (Hors ligne)");
            } else {
                if (req.is_suivi) {
                    await trackingService.deleteProgression(req.id);
                } else {
                    await trackingService.updateProgressionStatus(req.id, 'a_commencer');
                }
                toast.success("Retiré");
            }
            queryClient.invalidateQueries({ queryKey: ['help-requests'] });
        } catch (err) {
            toast.error("Erreur");
        }
    };

    // --- Derived Logic ---
    const uniqueStudents = useMemo(() => {
        const map = new Map<string, any>();
        helpRequests.forEach(req => {
            if (req.eleve && req.eleve_id && !map.has(req.eleve_id)) {
                map.set(req.eleve_id, req.eleve);
            }
        });
        return Array.from(map.values()).sort((a, b) => {
            const orderA = a.Niveau?.ordre ?? 999;
            const orderB = b.Niveau?.ordre ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.prenom || '').localeCompare(b.prenom || '');
        });
    }, [helpRequests]);

    const uniqueModules = useMemo(() => {
        const map = new Map<string, any>();
        helpRequests.forEach(req => {
            if (req.activite?.Module && !map.has(req.activite.Module.id)) {
                map.set(req.activite.Module.id, req.activite.Module);
            }
        });
        return Array.from(map.values()).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    }, [helpRequests]);

    const displayedRequests = useMemo(() => {
        return helpRequests.filter(req => {
            const matchStudent = selectedStudentFilter ? req.eleve_id === selectedStudentFilter : true;
            const matchModule = selectedModuleFilter ? req.activite?.Module?.id === selectedModuleFilter : true;
            const matchStatus = selectedStatusFilter === 'all' ? true : req.etat === selectedStatusFilter;
            return matchStudent && matchModule && matchStatus;
        });
    }, [helpRequests, selectedStudentFilter, selectedModuleFilter, selectedStatusFilter]);

    return {
        states: {
            groupId,
            groups,
            groupName: groupInfo?.nom || '',
            helpRequests: displayedRequests,
            uniqueStudents,
            uniqueModules,
            selectedStudentFilter,
            selectedModuleFilter,
            selectedStatusFilter,
            loading,
            expandedRequestId,
            helpersCache,
            isAutoGenerating,
            isOnline,
            pendingValidation
        },
        actions: {
            handleGroupChange,
            handleExpandHelp,
            handleStatusUpdate: initiateStatusUpdate,
            confirmStatusUpdate,
            cancelStatusUpdate,
            handleClear,
            handleAutoSuivi,
            setSelectedStudentFilter: (id: string | null) => {
                setSelectedStudentFilter(id);
                if (id) setSelectedModuleFilter(null);
            },
            setSelectedModuleFilter: (id: string | null) => {
                setSelectedModuleFilter(id);
                if (id) setSelectedStudentFilter(null);
            },
            setSelectedStatusFilter
        }
    };
}

export default useMobileTracking;
