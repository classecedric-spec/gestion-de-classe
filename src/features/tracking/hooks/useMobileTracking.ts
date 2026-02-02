import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/database';
import { toast } from 'sonner';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { trackingService, ProgressionWithDetails, StudentBasicInfo } from '../services/trackingService';
import { groupService } from '../../groups/services/groupService';
import { userService } from '../../users/services/userService';
import { Tables } from '../../../types/supabase';

export function useMobileTracking() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { isOnline, addToQueue } = useOfflineSync();

    // Data State
    const [helpRequests, setHelpRequests] = useState<ProgressionWithDetails[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [groupName, setGroupName] = useState<string>('');
    const [groups, setGroups] = useState<{ id: string; nom: string }[]>([]);

    // Students State
    const [studentsIds, setStudentsIds] = useState<string[]>([]);
    const [fullStudents, setFullStudents] = useState<Tables<'Eleve'>[]>([]);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
    const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);

    // Helpers & Cache
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [helpersCache, setHelpersCache] = useState<Record<string, StudentBasicInfo[]>>({});

    // Auto-Suivi Logic State
    const [rotationSkips, setRotationSkips] = useState<Record<string, Record<string, number>>>({});
    const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);

    // Manual Level Indices (User Prefs)
    const [manualIndices, setManualIndices] = useState<Record<string, Record<string, number>>>({});
    const [isIndicesLoaded, setIsIndicesLoaded] = useState<boolean>(false);

    // Validation Debug Logic
    const [pendingValidation, setPendingValidation] = useState<{
        req: ProgressionWithDetails;
        action: 'non_valide' | 'status_quo' | 'valide';
        initialScore: number;
        adjustment: number;
        finalScore: number;
    } | null>(null);

    // --- Initialization ---

    useEffect(() => {
        fetchGroups();
        if (groupId) {
            initGroupData();
        }
    }, [groupId]);

    const fetchGroups = async () => {
        const data = await groupService.getGroups();
        if (data) setGroups(data);
    };

    const initGroupData = async () => {
        if (!groupId) return;
        try {
            // 1. Group Name
            const groupData = await trackingService.fetchGroupInfo(groupId);
            if (groupData) setGroupName(groupData.nom);

            // 2. Students
            const studentsData = await trackingService.fetchStudentsInGroup(groupId);
            setStudentsIds(studentsData.ids);
            setFullStudents(studentsData.full);

            // 3. User Prefs
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const loadedIndices = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
                if (loadedIndices) setManualIndices(loadedIndices);
                setIsIndicesLoaded(true);

                const loadedSkips = await trackingService.loadUserPreference(user.id, 'suivi_rotation_skips');
                if (loadedSkips) setRotationSkips(loadedSkips);
            }
        } catch (err) {
            console.error("Error initializing group data", err);
            toast.error("Erreur de chargement du groupe");
        }
    };

    // --- Realtime & Polling ---

    useEffect(() => {
        if (studentsIds.length > 0) {
            fetchRequests();

            const channel = supabase
                .channel('mobile_suivi_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'Progression' },
                    () => fetchRequests()
                )
                .subscribe();

            const interval = setInterval(fetchRequests, 60000);

            return () => {
                supabase.removeChannel(channel);
                clearInterval(interval);
            };
        }
    }, [studentsIds]);

    // --- Debounced Save for manual indices ---
    useEffect(() => {
        if (!isIndicesLoaded) return;
        const timer = setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await trackingService.saveUserPreference(user.id, 'eleve_profil_competences', manualIndices);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [manualIndices, isIndicesLoaded]);

    // --- Actions ---

    const fetchRequests = async () => {
        // Try Cache first
        if (!navigator.onLine) {
            try {
                const cached = localStorage.getItem(`suivi_cache_requests_${groupId}`);
                if (cached) {
                    setHelpRequests(JSON.parse(cached));
                    setLoading(false);
                }
            } catch (e) { }
            return;
        }

        try {
            const requests = await trackingService.fetchHelpRequests(studentsIds);
            setHelpRequests(requests);
            setLoading(false);
            localStorage.setItem(`suivi_cache_requests_${groupId}`, JSON.stringify(requests));
        } catch (err) {
            // Silent fail on polling usually
        }
    };

    const handleGroupChange = async (newGroupId: string) => {
        if (newGroupId && newGroupId !== groupId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await userService.updateLastSelectedGroup(user.id, newGroupId);
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
            // Random 3
            const randomHelpers = helpers.sort(() => 0.5 - Math.random()).slice(0, 3);
            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAutoSuivi = async () => {
        if (!fullStudents.length || isAutoGenerating || !groupId) return;
        setIsAutoGenerating(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Simplified Rotation Logic
            const currentGroupSkips = rotationSkips[groupId] || {};
            const eligiblePool = fullStudents.filter(s => !(currentGroupSkips[s.id] > 0));
            const targets = eligiblePool.length > 0 ? eligiblePool : fullStudents;

            const candidates = targets.map(s => {
                const baseImp = (s as any).importance_suivi !== null ? (s as any).importance_suivi : 50;
                const weight = baseImp * (1 + Math.random());
                return { ...s, score: Math.random() * weight };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            // Update Skips
            const selectedIds = new Set(candidates.map(c => c.id));
            const newRotationSkips = { ...rotationSkips };

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

            setRotationSkips(newRotationSkips);
            await trackingService.saveUserPreference(user.id, 'suivi_rotation_skips', newRotationSkips);


            // Create progressions
            const newProgressions = candidates.map(student => ({
                eleve_id: student.id,
                activite_id: null,
                etat: 'besoin_d_aide',
                is_suivi: true,
                user_id: user.id,
                updated_at: new Date().toISOString()
            }));

            await trackingService.createProgressions(newProgressions as any); // Cast as any if insert type is strict
            toast.success("3 élèves ajoutés");
            fetchRequests();

        } catch (err) {
            toast.error("Erreur lors de la génération");
            console.error(err);
        } finally {
            setIsAutoGenerating(false);
        }
    };

    // Calculate pending changes and open modal
    const initiateStatusUpdate = (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => {
        let indexAdjustment = 0;
        let currentVal = 50;

        // Try getting current probability
        if (req.activite?.Module?.SousBranche?.branche_id && req.eleve_id) {
            const branchId = req.activite.Module.SousBranche.branche_id;
            const eleveId = req.eleve_id;
            const studentData = manualIndices[eleveId] || {};
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

        setPendingValidation(null); // Close Modal immediately
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

            // Adjust Index Logic
            if (indexAdjustment !== 0 && req.activite?.Module?.SousBranche?.branche_id && req.eleve_id) {
                const branchId = req.activite.Module.SousBranche.branche_id;
                const eleveId = req.eleve_id; // Capture locally
                setManualIndices(prev => {
                    const studentData = prev[eleveId] || {};
                    const currentVal = Number(studentData[branchId] ?? 50);
                    const newVal = Math.max(0, Math.min(100, currentVal + indexAdjustment));
                    return {
                        ...prev,
                        [eleveId]: { ...studentData, [branchId]: newVal }
                    };
                });
            }

            // Optimistic Update: Remove immediately from UI
            setHelpRequests(prev => prev.filter(r => r.id !== req.id));
            setExpandedRequestId(null);

            // Offline or Online update
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
                fetchRequests(); // Sync with server consistency
            }

        } catch (err) {
            toast.error("Erreur de mise à jour");
            fetchRequests(); // Restore state/Consistency on error
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
                setHelpRequests(prev => prev.filter(r => r.id !== req.id));
                toast.success("Action sauvegardée (Hors ligne)");
            } else {
                if (req.is_suivi) {
                    await trackingService.deleteProgression(req.id);
                } else {
                    await trackingService.updateProgressionStatus(req.id, 'a_commencer');
                }
                toast.success("Retiré");
                fetchRequests();
            }
        } catch (err) {
            toast.error("Erreur");
        }
    };

    // Derived Logic
    const uniqueStudents = useMemo(() => {
        const map = new Map<string, any>();
        helpRequests.forEach(req => {
            if (req.eleve && req.eleve_id && !map.has(req.eleve_id)) {
                map.set(req.eleve_id, req.eleve);
            }
        });
        return Array.from(map.values()).sort((a, b) => {
            // Sort by Level Order first
            const orderA = a.Niveau?.ordre ?? 999;
            const orderB = b.Niveau?.ordre ?? 999;
            if (orderA !== orderB) return orderA - orderB;

            // Then by First Name alphabetical
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

    const displayedRequests = helpRequests.filter(req => {
        const matchStudent = selectedStudentFilter ? req.eleve_id === selectedStudentFilter : true;
        const matchModule = selectedModuleFilter ? req.activite?.Module?.id === selectedModuleFilter : true;
        const matchStatus = selectedStatusFilter === 'all' ? true : req.etat === selectedStatusFilter;
        return matchStudent && matchModule && matchStatus;
    });

    return {
        states: {
            groupId,
            groups,
            groupName,
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
            handleStatusUpdate: initiateStatusUpdate, // Override with initiate
            confirmStatusUpdate,
            cancelStatusUpdate,
            handleClear,
            handleAutoSuivi,
            setSelectedStudentFilter: (id: string | null) => {
                setSelectedStudentFilter(id);
                if (id) setSelectedModuleFilter(null); // Mutual exclusion
            },
            setSelectedModuleFilter: (id: string | null) => {
                setSelectedModuleFilter(id);
                if (id) setSelectedStudentFilter(null); // Mutual exclusion
            },
            setSelectedStatusFilter
        }
    };
}

export default useMobileTracking;
