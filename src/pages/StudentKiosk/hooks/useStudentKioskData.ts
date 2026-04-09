import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/database';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { toast } from 'sonner';
import { calculateLuckyStatus } from '../../../lib/helpers/mobileEncodingHelpers';

export function useStudentKioskData(studentId: string | undefined) {
    const [student, setStudent] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [progressions, setProgressions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [kioskOpen, setKioskOpen] = useState(true);
    
    // Lucky Check preferences
    const [manualIndices, setManualIndices] = useState<Record<string, any>>({});
    const [defaultLuckyIndex, setDefaultLuckyIndex] = useState<number>(50);

    const location = useLocation();
    const token = new URLSearchParams(location.search).get('token');

    useEffect(() => {
        if (studentId) {
            checkKioskStatus();
            fetchData();
        }
    }, [studentId, token]);

    const checkKioskStatus = async () => {
        // DEBUG: Trace studentID
        console.log("Checking Kiosk Status for:", studentId);

        if (!studentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
            console.warn("Invalid Student ID for Kiosk check:", studentId);
            return;
        }
        try {
            console.log("Calling get_kiosk_status RPC...");
            const { data, error } = await supabase.rpc('get_kiosk_status', { p_student_id: studentId });
            if (error) {
                console.error("RPC Error get_kiosk_status:", JSON.stringify(error, null, 2));
            } else {
                console.log("Kiosk Status result:", data);
                const kioskValue = Array.isArray(data) ? data[0] : data;
                if (kioskValue !== null) setKioskOpen(kioskValue);
            }
        } catch (e) {
            console.error('Error checking kiosk status:', e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let targetTeacherId: string | null = null;

            if (token) {
                // --- TOKEN MODE (No Login) ---

                // 1. Fetch Student Data via RPC
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_kiosk_student_data', {
                    p_student_id: studentId,
                    p_token: token
                });

                if (rpcError) throw rpcError;
                
                const studentData = Array.isArray(rpcData) ? rpcData[0]?.student : rpcData?.student;
                if (!studentData) throw new Error("Accès refusé");

                targetTeacherId = studentData?.user_id ?? null;

                setStudent(studentData);

                // 2. Fetch Modules & Activities via Secure RPC
                const { data: modulesData, error: modulesError } = await supabase.rpc('get_kiosk_modules_activities', {
                    p_student_id: studentId,
                    p_token: token
                });

                if (modulesError) throw modulesError;
                
                const fetchedModules = (modulesData || []) as any[];

                // Sort (Date -> Branche -> SousBranche -> Module)
                fetchedModules.sort((a: any, b: any) => {
                    if (a.date_fin !== b.date_fin) {
                        if (!a.date_fin) return 1;
                        if (!b.date_fin) return -1;
                        return a.date_fin.localeCompare(b.date_fin);
                    }
                    const aB = a.SousBranche?.Branche;
                    const bB = b.SousBranche?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    const aSB = a.SousBranche;
                    const bSB = b.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    return a.nom.localeCompare(b.nom);
                });

                if (JSON.stringify(fetchedModules) !== JSON.stringify(modules)) {
                    setModules(fetchedModules);
                }

                const allActivities = fetchedModules.flatMap(m =>
                    (m.Activite || []).map((a: any) => ({ 
                        ...a, 
                        Module: { nom: m.nom, id: m.id },
                        branchId: m.SousBranche?.Branche?.id || null
                    }))
                );
                
                if (JSON.stringify(allActivities) !== JSON.stringify(activities)) {
                    setActivities(allActivities);
                }

                // 3. Progressions (Also likely updated via RPC or we need fetch capability)
                // If we can't read table directly, we're blind status-wise.
                // Since user requested "Without ANY login", we likely can't rely on 'anon' reading everything freely.
                // We need an RPC like `get_kiosk_progressions`? 
                // OR we enable RLS for anon on Progression (dangerous? only for their own?).
                // Let's use standard fetch for now and assume the project has basic 'public' read or we patch it.

                // 3. Progressions via Secure RPC
                const { data: progData, error: progError } = await supabase.rpc('get_kiosk_progressions', {
                    p_student_id: studentId,
                    p_token: token
                });

                if (progError) throw progError;

                const progMap: Record<string, string> = {};
                if (progData) {
                    (progData as any[]).forEach(p => {
                        progMap[p.activite_id] = p.etat;
                    });
                }
                setProgressions(progMap);

            } else {
                // --- AUTH MODE (Teacher Session) ---
                // 1. Fetch Student Details
                const { data: studentData, error } = await supabase
                    .from('Eleve')
                    .select(`
                        *,
                        EleveGroupe!inner(groupe_id),
                        Niveau(id, nom)
                    `)
                    .eq('id', studentId)
                    .single();

                if (error) throw error;
                setStudent(studentData);
                targetTeacherId = studentData?.user_id ?? null;

                // 2. Fetch Active Modules
                const fetchedModules = await trackingService.getMobileModules();
                setModules(fetchedModules);

                // 3. Flatten activities from modules for easy display
                const allActivities = fetchedModules.flatMap(m =>
                    m.Activite.map((a: any) => ({ 
                        ...a, 
                        Module: { nom: m.nom, id: m.id },
                        branchId: m.SousBranche?.Branche?.id || null
                    }))
                );
                setActivities(allActivities);

                // 4. Fetch Progressions Map directly from the Progression table
                const { data: progData, error: progError } = await supabase
                    .from('Progression')
                    .select('activite_id, etat')
                    .eq('eleve_id', studentId);

                if (progError) throw progError;

                const progMap: Record<string, string> = {};
                if (progData) {
                    (progData as any[]).forEach(p => {
                        progMap[p.activite_id] = p.etat;
                    });
                }
                setProgressions(progMap);
            }

            // 4. Fetch Lucky Check Preferences

            if (targetTeacherId) {
                try {
                    const { data: prefData } = await supabase
                        .from('UserPreference')
                        .select('key, value')
                        .eq('user_id', targetTeacherId)
                        .in('key', ['eleve_profil_competences', 'default_lucky_check_index']);
                    
                    if (prefData) {
                        const indicesPref = prefData.find(p => p.key === 'eleve_profil_competences');
                        if (indicesPref) setManualIndices(indicesPref.value as any);

                        const defaultIdxPref = prefData.find(p => p.key === 'default_lucky_check_index');
                        if (defaultIdxPref) setDefaultLuckyIndex(Number(defaultIdxPref.value));
                    }
                } catch (e) {
                    console.warn('Could not load Lucky Check preferences:', e);
                }
            }

        } catch (err) {
            console.error('Error fetching kiosk data:', err);
            toast.error("Erreur d'accès (Vérifiez le scan ou la connexion)");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (activityId: string, newStatus: string) => {
        if (!studentId) return;

        // Optimistic UI
        let statusToSave = newStatus;
        if (newStatus === 'termine') {
            const activity = activities.find(a => a.id === activityId);
            const lucky = calculateLuckyStatus({
                studentId: studentId!,
                branchId: activity?.branchId || null,
                studentName: `${student?.prenom} ${student?.nom}`,
                activityTitle: activity?.titre || 'Activité',
                studentGlobalIndex: student?.importance_suivi,
                manualIndices,
                defaultLuckyIndex
            });
            statusToSave = lucky.status;
        }

        const oldStatus = progressions[activityId];
        setProgressions(prev => ({ ...prev, [activityId]: statusToSave }));

        try {
            if (token) {
                // --- TOKEN MODE ---
                const { error } = await supabase.rpc('update_kiosk_progression', {
                    p_student_id: studentId,
                    p_activity_id: activityId,
                    p_token: token,
                    p_status: statusToSave
                });

                if (error) throw error;

            } else {
                // --- AUTH MODE ---
                // If returning to 'a_commencer', we might be deleting or updating
                // Reuse repository logic
                if (newStatus === 'a_commencer') {
                    // Determine if we delete (if it was just opened) or update
                    // For Kiosk simplicity: if 'besoin_d_aide' or 'a_verifier', we can set to 'a_commencer'
                    // Actually trackingService.updateProgressionStatus handles update.
                    // But usually we create a new progression if it handles 'create'? 
                    // trackingService.updateProgressionStatus updates EXISTING record.

                    // We need to know if ID exists.
                    // The map only holds status.
                    // We should probably fetch full progression objects or handle upsert.

                    // Let's use upsert to be safe? 
                    // Repository has `upsertProgression`.

                    const { data: existing } = await supabase
                        .from('Progression')
                        .select('id')
                        .eq('eleve_id', studentId)
                        .eq('activite_id', activityId)
                        .maybeSingle();

                    if (existing) {
                        await trackingService.updateProgressionStatus(existing.id, newStatus, false);
                    }
                } else {
                    // Upsert (create or update)
                    await trackingService.upsertProgression({
                        eleve_id: studentId,
                        activite_id: activityId,
                        etat: statusToSave,
                        updated_at: new Date().toISOString()
                    });
                }

                // Recalculate trust if needed? 
                // The unified logic is in `updateStudentTrust`, called usually by TEACHER actions.
                // Student actions just change status usually.
                // But if student says "Terminé" -> "a_verifier". 

                if (statusToSave === 'a_verifier') {
                    toast.info("C'est noté ! Ton prof va vérifier ton travail.");
                } else if (statusToSave === 'termine') {
                    toast.success("Bravo ! Travail validé.");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Impossible de sauvegarder");
            setProgressions(prev => ({ ...prev, [activityId]: oldStatus }));
        }
    };

    return {
        student,
        modules,
        activities,
        progressions,
        loading,
        updateStatus,
        kioskOpen,
        refresh: fetchData
    };
}
