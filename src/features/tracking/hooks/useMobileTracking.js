import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { trackingService } from '../services/trackingService';

export function useMobileTracking() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { isOnline, addToQueue } = useOfflineSync();

    // Data State
    const [helpRequests, setHelpRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupName, setGroupName] = useState('');
    const [groups, setGroups] = useState([]);

    // Students State
    const [studentsIds, setStudentsIds] = useState([]);
    const [fullStudents, setFullStudents] = useState([]);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

    // Helpers & Cache
    const [expandedRequestId, setExpandedRequestId] = useState(null);
    const [helpersCache, setHelpersCache] = useState({});

    // Auto-Suivi Logic State
    const [rotationSkips, setRotationSkips] = useState({});
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);

    // Manual Level Indices (User Prefs)
    const [manualIndices, setManualIndices] = useState({});
    const [isIndicesLoaded, setIsIndicesLoaded] = useState(false);

    // --- Initialization ---

    useEffect(() => {
        fetchGroups();
        if (groupId) {
            initGroupData();
        }
    }, [groupId]);

    const fetchGroups = async () => {
        const { data } = await supabase.from('Groupe').select('id, nom').order('nom');
        if (data) setGroups(data);
    };

    const initGroupData = async () => {
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

    // --- Debounced Save for Manual Indices ---
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

    const handleGroupChange = async (newGroupId) => {
        if (newGroupId && newGroupId !== groupId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('CompteUtilisateur').update({ last_selected_group_id: newGroupId }).eq('id', user.id);
            }
            navigate(`/mobile-suivi/${newGroupId}`);
        }
    };

    const handleExpandHelp = async (requestId, activityId) => {
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
        if (!fullStudents.length || isAutoGenerating) return;
        setIsAutoGenerating(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Simplified Rotation Logic
            const currentGroupSkips = rotationSkips[groupId] || {};
            const eligiblePool = fullStudents.filter(s => !(currentGroupSkips[s.id] > 0));
            const targets = eligiblePool.length > 0 ? eligiblePool : fullStudents;

            const candidates = targets.map(s => {
                const baseImp = s.importance_suivi !== null ? s.importance_suivi : 50;
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

            await trackingService.createProgressions(newProgressions);
            toast.success("3 élèves ajoutés");
            fetchRequests();

        } catch (err) {
            toast.error("Erreur lors de la génération");
            console.error(err);
        } finally {
            setIsAutoGenerating(false);
        }
    };

    const handleStatusUpdate = async (req, action) => {
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
            if (indexAdjustment !== 0 && req.activite?.Module?.SousBranche?.branche_id) {
                const branchId = req.activite.Module.SousBranche.branche_id;
                setManualIndices(prev => {
                    const studentData = prev[req.eleve_id] || {};
                    const currentVal = Number(studentData[branchId] ?? 50);
                    const newVal = Math.max(0, Math.min(100, currentVal + indexAdjustment));
                    return {
                        ...prev,
                        [req.eleve_id]: { ...studentData, [branchId]: newVal }
                    };
                });
            }

            // Offline or Online update
            if (!isOnline) {
                let payload = { etat: newStatus, updated_at: new Date().toISOString() };
                if (req.is_suivi) payload.is_suivi = false;

                addToQueue({
                    type: 'SUPABASE_CALL', table: 'Progression', method: 'update',
                    payload, match: { id: req.id },
                    contextDescription: `Maj statut ${req.eleve?.prenom}`
                });
                // Optimistic
                setHelpRequests(prev => prev.filter(r => r.id !== req.id));
                toast.success("Action sauvegardée (Hors ligne)");
            } else {
                await trackingService.updateProgressionStatus(req.id, newStatus, req.is_suivi);
                toast.success("Mis à jour");
                setExpandedRequestId(null);
                fetchRequests();
            }

        } catch (err) {
            toast.error("Erreur de mise à jour");
        }
    };

    const handleClear = async (req) => {
        try {
            if (!isOnline) {
                if (req.is_suivi) {
                    addToQueue({
                        type: 'SUPABASE_CALL', table: 'Progression', method: 'delete', match: { id: req.id },
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
        const map = new Map();
        helpRequests.forEach(req => {
            if (req.eleve && !map.has(req.eleve_id)) {
                map.set(req.eleve_id, req.eleve);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
    }, [helpRequests]);

    const displayedRequests = helpRequests.filter(req => {
        const matchStudent = selectedStudentFilter ? req.eleve_id === selectedStudentFilter : true;
        const matchStatus = selectedStatusFilter === 'all' ? true : req.etat === selectedStatusFilter;
        return matchStudent && matchStatus;
    });

    return {
        states: {
            groupId,
            groups,
            groupName,
            helpRequests: displayedRequests,
            uniqueStudents,
            selectedStudentFilter,
            selectedStatusFilter,
            loading,
            expandedRequestId,
            helpersCache,
            isAutoGenerating,
            isOnline
        },
        actions: {
            handleGroupChange,
            handleExpandHelp,
            handleStatusUpdate,
            handleClear,
            handleAutoSuivi,
            setSelectedStudentFilter,
            setSelectedStatusFilter
        }
    };
}
