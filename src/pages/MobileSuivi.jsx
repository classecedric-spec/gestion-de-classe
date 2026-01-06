import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import { ShieldCheck, Check, X, Users, Loader2, Smartphone, Activity } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const MobileSuivi = () => {
    const { groupId } = useParams();
    const [helpRequests, setHelpRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [expandedRequestId, setExpandedRequestId] = useState(null);
    const [helpersCache, setHelpersCache] = useState({});
    const [manualIndices, setManualIndices] = useState({});
    const [isIndicesLoaded, setIsIndicesLoaded] = useState(false);
    const [rotationSkips, setRotationSkips] = useState({});
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [fullStudents, setFullStudents] = useState([]);

    useEffect(() => {
        if (groupId) {
            fetchGroupInfo();
            fetchStudents();
            loadManualIndices();
            loadRotationSkips();
        }
    }, [groupId]);

    const loadManualIndices = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'eleve_profil_competences')
            .maybeSingle();

        if (data?.value) {
            setManualIndices(data.value);
        }
        setIsIndicesLoaded(true);
    };

    const loadRotationSkips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'suivi_rotation_skips')
            .maybeSingle();

        if (data?.value) {
            setRotationSkips(data.value);
        }
    };

    // Debounced save for manual indices
    useEffect(() => {
        if (!isIndicesLoaded) return;

        const timer = setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('UserPreference').upsert({
                user_id: user.id,
                key: 'eleve_profil_competences',
                value: manualIndices,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });
        }, 2000);

        return () => clearTimeout(timer);
    }, [manualIndices, isIndicesLoaded]);

    useEffect(() => {
        if (students.length > 0) {
            fetchHelpRequests();

            const channel = supabase
                .channel('mobile_suivi_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'Progression' },
                    () => {
                        fetchHelpRequests();
                    }
                )
                .subscribe();

            const interval = setInterval(fetchHelpRequests, 5000);

            return () => {
                supabase.removeChannel(channel);
                clearInterval(interval);
            };
        }
    }, [students]);

    const fetchGroupInfo = async () => {
        const { data } = await supabase.from('Groupe').select('nom').eq('id', groupId).single();
        if (data) setGroupName(data.nom);
    };

    const fetchStudents = async () => {
        try {
            const { data: egData } = await supabase
                .from('EleveGroupe')
                .select('eleve_id, Eleve(*)')
                .eq('groupe_id', groupId);

            if (egData) {
                setStudents(egData.map(d => d.eleve_id));
                setFullStudents(egData.map(d => d.Eleve).filter(Boolean));
            }
        } catch (err) {
        }
    };

    const handleAutoSuivi = async () => {
        if (!fullStudents.length || isAutoGenerating) return;
        setIsAutoGenerating(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Simple version of the rotation logic for mobile
            const currentGroupSkips = rotationSkips[groupId] || {};
            const eligiblePool = fullStudents.filter(s => !(currentGroupSkips[s.id] > 0));
            const targets = eligiblePool.length > 0 ? eligiblePool : fullStudents;

            const candidates = targets.map(s => {
                // Simplified weight: random * importance
                const baseImp = s.importance_suivi !== null ? s.importance_suivi : 50;
                const weight = baseImp * (1 + Math.random());
                return { ...s, score: Math.random() * weight };
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            const selectedIds = new Set(candidates.map(c => c.id));
            const newRotationSkips = { ...rotationSkips };

            // Update skips
            fullStudents.forEach(s => {
                if (selectedIds.has(s.id)) {
                    newRotationSkips[groupId] = {
                        ...(newRotationSkips[groupId] || {}),
                        [s.id]: 2
                    };
                } else {
                    const currentVal = newRotationSkips[groupId]?.[s.id] || 0;
                    if (currentVal > 0) {
                        newRotationSkips[groupId] = {
                            ...newRotationSkips[groupId],
                            [s.id]: currentVal - 1
                        };
                    }
                }
            });

            setRotationSkips(newRotationSkips);

            // Persist skips
            await supabase.from('UserPreference').upsert({
                user_id: user.id,
                key: 'suivi_rotation_skips',
                value: newRotationSkips,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });

            // Insert follow-ups
            for (const student of candidates) {
                await supabase.from('Progression').insert({
                    eleve_id: student.id,
                    activite_id: null,
                    etat: 'besoin_d_aide',
                    is_suivi: true,
                    user_id: user.id,
                    updated_at: new Date().toISOString()
                });
            }

            toast.success("3 élèves ajoutés");
            fetchHelpRequests();
        } catch (err) {
            toast.error("Erreur génération");
        } finally {
            setIsAutoGenerating(false);
        }
    };

    const fetchHelpRequests = async () => {
        if (students.length === 0) return;

        try {
            const { data } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    is_suivi,
                    eleve_id,
                    eleve:Eleve(id, prenom, nom, photo_base64),
                    activite:Activite(
                        id,
                        titre,
                        Module(
                            statut,
                            SousBranche(
                                branche_id
                            )
                        )
                    )
                `)
                .in('etat', ['besoin_d_aide', 'a_verifier'])
                .in('eleve_id', students)
                .order('updated_at', { ascending: true });

            const validRequests = (data || []).filter(req => {
                if (req.is_suivi) return true;
                return req.activite?.Module?.statut === 'en_cours';
            });

            setHelpRequests(validRequests);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const handleExpandHelp = async (requestId, activityId) => {
        if (expandedRequestId === requestId) {
            setExpandedRequestId(null);
            return;
        }

        setExpandedRequestId(requestId);

        // Check cache
        if (helpersCache[requestId]) return;
        if (students.length === 0) return;

        try {
            const { data } = await supabase
                .from('Progression')
                .select('eleve:Eleve(id, prenom, nom, photo_base64)')
                .eq('activite_id', activityId)
                .eq('etat', 'termine')
                .in('eleve_id', students);

            const finishers = data?.map(p => p.eleve).filter(Boolean) || [];
            const randomHelpers = finishers.sort(() => 0.5 - Math.random()).slice(0, 3);

            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) {
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
                indexAdjustment = 0;
            } else if (action === 'valide') {
                newStatus = 'termine';
                indexAdjustment = -2;
            }

            const branchId = req.activite?.Module?.SousBranche?.branche_id;
            const studentId = req.eleve_id;

            // Handle Index Adjustment
            if (indexAdjustment !== 0 && branchId && studentId) {
                setManualIndices(prev => {
                    const studentData = prev[studentId] || {};
                    const currentVal = Number(studentData[branchId] ?? 50);
                    const newVal = Math.max(0, Math.min(100, currentVal + indexAdjustment));

                    return {
                        ...prev,
                        [studentId]: {
                            ...studentData,
                            [branchId]: newVal
                        }
                    };
                });
            }

            // Update Database (Progression)
            if (req.is_suivi) {
                await supabase
                    .from('Progression')
                    .update({
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        is_suivi: false
                    })
                    .eq('id', req.id);
            } else {
                await supabase
                    .from('Progression')
                    .update({
                        etat: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', req.id);
            }

            const feedbackMap = {
                valide: "Validé (-2 index)",
                non_valide: "Refusé (+5 index)",
                status_quo: "À refaire (Index inchangé)"
            };

            toast.success(feedbackMap[action] || "Mis à jour");
            setExpandedRequestId(null);
            fetchHelpRequests();
        } catch (err) {
            toast.error("Erreur de mise à jour");
        }
    };

    const handleClear = async (req) => {
        try {
            if (req.is_suivi) {
                // Delete the progression for follow-up
                await supabase.from('Progression').delete().eq('id', req.id);
            } else {
                // Reset to a_commencer
                await supabase
                    .from('Progression')
                    .update({ etat: 'a_commencer', updated_at: new Date().toISOString() })
                    .eq('id', req.id);
            }
            toast.success("Retiré");
            fetchHelpRequests();
        } catch (err) {
            toast.error("Erreur");
        }
    };

    if (!groupId) {
        return (
            <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Smartphone size={48} className="text-primary mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Accès Mobile</h1>
                <p className="text-grey-medium">Veuillez ouvrir cette page depuis le Suivi Pédagogique.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-white flex flex-col font-sans select-none">
            {/* Mobile Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tighter text-primary leading-none">Suivi Mobile</h1>
                    <p className="text-[10px] text-grey-medium font-bold uppercase tracking-widest mt-1">{groupName || 'Chargement...'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAutoSuivi}
                        disabled={isAutoGenerating}
                        className={clsx(
                            "flex items-center gap-2 bg-primary text-black px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest",
                            isAutoGenerating && "opacity-50 animate-pulse"
                        )}
                    >
                        {isAutoGenerating ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                        Suivi Auto
                    </button>
                    <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-xs font-black text-primary">{helpRequests.length}</span>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 p-4 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">Synchronisation...</p>
                    </div>
                ) : helpRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                            <Check size={32} className="text-primary" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest">Rien à signaler</p>
                    </div>
                ) : (
                    helpRequests.map(req => (
                        <div
                            key={req.id}
                            onClick={() => handleExpandHelp(req.id, req.activite?.id)}
                            className={clsx(
                                "bg-surface border border-white/10 rounded-2xl p-4 shadow-xl active:scale-[0.98] transition-all relative group overflow-hidden",
                                expandedRequestId === req.id && "ring-2 ring-primary/50 border-primary/50"
                            )}
                        >
                            {/* Actions Right Column */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClear(req); }}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-danger text-white rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>

                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/5 shrink-0 bg-surface-light shadow-inner">
                                    {req.eleve?.photo_base64 ? (
                                        <img src={req.eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-primary">
                                            {getInitials(req.eleve)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h2 className="text-base font-black text-white truncate leading-tight">
                                            {req.eleve?.prenom} {req.eleve?.nom}
                                        </h2>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        {!req.is_suivi && (
                                            <p className="text-[11px] text-grey-medium font-bold uppercase tracking-tight line-clamp-1">
                                                {req.activite?.titre}
                                            </p>
                                        )}

                                        <div className={clsx(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit",
                                            req.is_suivi
                                                ? "bg-primary text-black"
                                                : (req.etat === 'a_verifier' ? "bg-[#8B5CF6] text-white" : "bg-[#A0A8AD] text-white")
                                        )}>
                                            {req.is_suivi && <Users size={10} />}
                                            {req.etat === 'a_verifier' && <ShieldCheck size={10} />}
                                            {req.is_suivi ? 'Suivi' : (req.etat === 'a_verifier' ? 'Vérif' : 'Aide')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Actions & Helpers */}
                            {expandedRequestId === req.id && (
                                <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300 space-y-4">

                                    {/* Action Buttons: Non Valide | Status Quo | Validé */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(req, 'non_valide'); }}
                                            className="py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-xl border border-danger/20 text-[10px] font-black uppercase tracking-tighter transition-all"
                                        >
                                            Non Valide
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(req, 'status_quo'); }}
                                            className="py-2.5 bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-tighter transition-all"
                                        >
                                            A refaire
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(req, 'valide'); }}
                                            className="py-2.5 bg-success hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-success/20 text-[10px] font-black uppercase tracking-tighter transition-all"
                                        >
                                            Validé
                                        </button>
                                    </div>

                                    {/* Helpers (Only for help requests) */}
                                    {req.etat === 'besoin_d_aide' && (
                                        <div className="pt-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users size={12} className="text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-grey-medium">Peut t'aider :</span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {helpersCache[req.id] ? (
                                                    helpersCache[req.id].length > 0 ? (
                                                        helpersCache[req.id].map(helper => (
                                                            <div key={helper.id} className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-xl border border-white/5 pr-3">
                                                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                                    {helper.photo_base64 ? (
                                                                        <img src={helper.photo_base64} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-surface-light flex items-center justify-center text-[8px] font-black text-primary uppercase">
                                                                            {getInitials(helper)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-grey-light truncate max-w-[100px]">
                                                                    {helper.prenom} {helper.nom}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-grey-dark italic py-1">Personne n'a encore fini cette activité.</p>
                                                    )
                                                ) : (
                                                    <div className="flex items-center gap-2 py-1">
                                                        <Loader2 size={12} className="animate-spin text-primary" />
                                                        <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">Recherche...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Status Footer */}
            <div className="p-6 bg-background/80 backdrop-blur-sm border-t border-white/5 text-center">
                <p className="text-[9px] font-bold text-grey-dark uppercase tracking-[0.2em]">Live Monitoring System</p>
            </div>
        </div>
    );
};

export default MobileSuivi;
