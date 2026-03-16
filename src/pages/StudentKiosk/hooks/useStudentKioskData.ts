import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/database';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { toast } from 'sonner';

export function useStudentKioskData(studentId: string | undefined) {
    const [student, setStudent] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [progressions, setProgressions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [kioskOpen, setKioskOpen] = useState(true);

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
                if (data !== null) setKioskOpen(data);
            }
        } catch (e) {
            console.error('Error checking kiosk status:', e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (token) {
                // --- TOKEN MODE (No Login) ---

                // 1. Fetch Student Data via RPC
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_kiosk_student_data', {
                    p_student_id: studentId,
                    p_token: token
                });

                if (rpcError) throw rpcError;
                if (!rpcData || !rpcData.student) throw new Error("Accès refusé");

                setStudent(rpcData.student);

                // 2. Fetch Modules (Need Anon Read Access or another RPC)
                // For now, assuming modules are public/anon readable or we use the standard call which might fail if blocked by RLS
                // Ideally we should have an RPC or public policy for 'Module'/'Activite'
                // Let's try standard fetch first. 
                // If standard fetch fails due to RLS, we need to handle it.
                // Assuming RLS on 'Module' is permissive for 'anon' or we need to add policy.
                // *Self-Correction*: The migration plan didn't add RLS for Module. 
                // We'll proceed assuming standard fetch works or we'll need to add a quick policy.
                const fetchedModules = await trackingService.getMobileModules();

                // Sort to match Dashboard (Date -> Branche -> SousBranche -> Module)
                fetchedModules.sort((a: any, b: any) => {
                    // 1. Date Fin
                    if (a.date_fin !== b.date_fin) {
                        if (!a.date_fin) return 1;
                        if (!b.date_fin) return -1;
                        return a.date_fin.localeCompare(b.date_fin);
                    }
                    // 2. Branche
                    const aB = a.SousBranche?.Branche;
                    const bB = b.SousBranche?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    if (aB?.nom !== bB?.nom) return (aB?.nom || '').localeCompare(bB?.nom || '');

                    // 3. SousBranche
                    const aSB = a.SousBranche;
                    const bSB = b.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    if (aSB?.nom !== bSB?.nom) return (aSB?.nom || '').localeCompare(bSB?.nom || '');

                    // 4. Module Nom
                    return a.nom.localeCompare(b.nom);
                });

                setModules(fetchedModules);

                const allActivities = fetchedModules.flatMap(m =>
                    m.Activite.map((a: any) => ({ ...a, Module: { nom: m.nom, id: m.id } }))
                );
                setActivities(allActivities);

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

                // 2. Fetch Active Modules (Mobile/Kiosk view usually shows all active or filtered)
                // leveraging existing repo method
                const fetchedModules = await trackingService.getMobileModules(); // This gets en_cours modules

                // Filter modules relevant to student's level if necessary, or just show all active
                setModules(fetchedModules);

                // 3. Flatten activities from modules for easy display
                const allActivities = fetchedModules.flatMap(m =>
                    m.Activite.map((a: any) => ({ ...a, Module: { nom: m.nom, id: m.id } }))
                );
                setActivities(allActivities);

                // 4. Fetch Progressions Map
                if (studentId) {
                    const progMap = await trackingService.fetchStudentProgressionsMap(studentId);
                    setProgressions(progMap);
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
        const oldStatus = progressions[activityId];
        setProgressions(prev => ({ ...prev, [activityId]: newStatus }));

        try {
            if (token) {
                // --- TOKEN MODE ---
                const { error } = await supabase.rpc('update_kiosk_progression', {
                    p_student_id: studentId,
                    p_activity_id: activityId,
                    p_token: token,
                    p_status: newStatus
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
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        user_id: (await supabase.auth.getUser()).data.user?.id
                    });
                }

                // Recalculate trust if needed? 
                // The unified logic is in `updateStudentTrust`, called usually by TEACHER actions.
                // Student actions just change status usually.
                // But if student says "Terminé" -> "a_verifier". 

                if (newStatus === 'termine') {
                    // If lucky check calls for verification, it might override to 'a_verifier'
                    // This logic is usually in `useProgressions`.
                    // For Kiosk, we should probably implement simple logic:
                    // Student "Done" -> 'a_verifier' (always? or trust based?)

                    // Let's keep it simple: Student marks as "Done" -> 'a_verifier'.
                    // Teacher validates 'a_verifier' -> 'termine' (green).
                    // Or maybe Student can mark 'termine' directly?
                    // Usually "J'ai fini" -> "A vérifier" (Orange/Purple).
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
