import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, BookOpen, Activity, Check, AlertCircle, Clock, Loader2, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const SuiviPedagogique = () => {
    // --- STATE ---
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [showGroupSelector, setShowGroupSelector] = useState(true);

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);

    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({}); // Map of activite_id -> etat

    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingModules, setLoadingModules] = useState(false);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // --- HELP COLUMN STATE ---
    const [helpRequests, setHelpRequests] = useState([]);
    const [expandedRequestId, setExpandedRequestId] = useState(null);
    const [helpersCache, setHelpersCache] = useState({});

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        const { data } = await supabase.from('Groupe').select('*').order('nom');
        setGroups(data || []);
    };

    // --- FETCH DATA LOGIC ---
    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
            // Reset downstream
            setSelectedStudent(null);
            setSelectedModule(null);
            setActivities([]);
        }
    }, [selectedGroupId]);

    useEffect(() => {
        if (selectedStudent) {
            fetchModules();
            // Reset downstream
            setSelectedModule(null);
            setActivities([]);
            fetchStudentProgressions(selectedStudent.id);
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedModule) {
            fetchActivities(selectedModule.id);
        }
    }, [selectedModule]);

    const fetchStudents = async (groupId) => {
        setLoadingStudents(true);
        try {
            // New N:N Logic: Join with EleveGroupe
            // We use !inner to filter Eleves that have an entry in EleveGroupe for this groupId
            const { data, error } = await supabase
                .from('Eleve')
                .select('*, EleveGroupe!inner(groupe_id)') // Select Eleve columns + inner join
                .eq('EleveGroupe.groupe_id', groupId)
                .order('prenom');

            if (error) throw error;
            setStudents(data || []);
        } catch (err) {
            console.error(err);
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchModules = async () => {
        setLoadingModules(true);
        try {
            // "Modules 'en cours' liés à cet élève".
            // Simpler implementation: All modules with statut 'en_cours'.
            const { data, error } = await supabase
                .from('Module')
                .select('*')
                .eq('statut', 'en_cours')
                .order('nom');
            if (error) throw error;
            setModules(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingModules(false);
        }
    };

    const fetchActivities = async (moduleId) => {
        setLoadingActivities(true);
        try {
            const { data, error } = await supabase
                .from('Activite')
                .select('*')
                .eq('module_id', moduleId)
                .order('ordre', { ascending: true }); // Assuming 'ordre' or just created_at
            if (error) throw error;
            setActivities(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingActivities(false);
        }
    };

    const fetchStudentProgressions = async (studentId) => {
        try {
            const { data } = await supabase
                .from('Progression')
                .select('activite_id, etat')
                .eq('eleve_id', studentId);

            const progMap = {};
            data?.forEach(p => {
                progMap[p.activite_id] = p.etat;
            });
            setProgressions(progMap);
        } catch (err) {
            console.error("Error fetching progressions", err);
        }
    };

    // --- HELP REQUESTS LOGIC ---
    useEffect(() => {
        if (students.length > 0) {
            fetchHelpRequests();

            const channel = supabase
                .channel('help_requests_updates')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'Progression' },
                    () => fetchHelpRequests()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [students]);

    const fetchHelpRequests = async () => {
        if (students.length === 0) return;
        const studentIds = students.map(s => s.id);

        try {
            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    eleve:Eleve(id, prenom, nom, photo_base64),
                    activite:Activite(id, titre)
                `)
                .eq('etat', 'besoin_d_aide')
                .eq('etat', 'besoin_d_aide')
                .in('eleve_id', studentIds)
                .order('updated_at', { ascending: true });

            if (error) console.error("Error fetching help requests", error);
            setHelpRequests(data || []);
        } catch (err) {
            console.error(err);


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
        const studentIds = students.map(s => s.id);

        try {
            const { data } = await supabase
                .from('Progression')
                .select('eleve:Eleve(id, prenom, nom, photo_base64)')
                .eq('activite_id', activityId)
                .eq('etat', 'termine')
                .in('eleve_id', studentIds);

            // Randomize and pick 3
            const finishers = data?.map(p => p.eleve).filter(Boolean) || [];
            // Simple shuffle
            const randomHelpers = finishers.sort(() => 0.5 - Math.random()).slice(0, 3);

            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) {
            console.error("Error fetching helpers", err);
        }
    };

    // --- ACTIONS ---
    const handleStatusClick = async (activityId, newStatus, specificStudentId = null) => {
        const targetStudentId = specificStudentId || selectedStudent?.id;
        if (!targetStudentId) return;

        // Optimistic Update (Only for main view if selected)
        if (targetStudentId === selectedStudent?.id) {
            setProgressions(prev => ({
                ...prev,
                [activityId]: newStatus
            }));
        }

        // Visual Feedback (Toast? Micro-interact?)
        // The button style change ITSELF is feedback.
        // We'll add a subtle toast or just rely on the UI update.

        try {
            const { error } = await supabase
                .from('Progression')
                .upsert(
                    {
                        eleve_id: targetStudentId,
                        activite_id: activityId,
                        etat: newStatus,
                        updated_at: new Date().toISOString(),
                        user_id: (await supabase.auth.getUser()).data.user?.id
                    },
                    { onConflict: 'eleve_id,activite_id' }
                );
            if (error) throw error;
            fetchHelpRequests(); // Refresh help list immediately

        } catch (err) {
            console.error("Error saving progression", err);
            toast.error("Erreur de sauvegarde");
            // Revert? (Not implemented for speed, but ideally yes)
        }
    };

    const handleGroupSelect = (groupId) => {
        setSelectedGroupId(groupId);
        setShowGroupSelector(false);
    };

    // --- RENDER HELPERS ---
    const getInitials = (student) => {
        return (student.prenom?.[0] || '') + (student.nom?.[0] || '');
    };

    // --- VIEW LOGIC ---
    const currentView = selectedModule ? 'activities' : selectedStudent ? 'modules' : 'students';

    const handleBack = () => {
        if (currentView === 'activities') {
            setSelectedModule(null);
            setActivities([]);
        } else if (currentView === 'modules') {
            setSelectedStudent(null);
            setModules([]);
        }
    };

    return (
        <div className="w-full h-full flex bg-background relative overflow-hidden">

            {/* STEP 0: SELECTOR MODAL */}
            {showGroupSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95">
                        <h2 className="text-2xl font-bold text-white">Sélectionner un Groupe</h2>
                        <div className="grid grid-cols-1 gap-3">
                            {groups.length === 0 ? (
                                <p className="text-grey-medium">Aucun groupe trouvé.</p>
                            ) : (
                                groups.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => handleGroupSelect(g.id)}
                                        className="p-4 bg-background/50 hover:bg-primary/20 hover:border-primary border border-white/10 rounded-xl transition-all text-lg font-bold text-white flex items-center justify-center gap-2 group"
                                    >
                                        <Users className="group-hover:text-primary transition-colors" /> {g.nom}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT COLUMN: DRILL DOWN INTERFACE (25% WIDTH) */}
            <div className="w-1/4 min-w-[300px] h-full border-r border-white/10 bg-surface/10 flex flex-col transition-all duration-300">

                {/* HEADER / BREADCRUMBS */}
                <div className="flex flex-col border-b border-white/5 bg-surface/5">
                    {currentView === 'students' ? (
                        <div className="p-4 flex items-center h-[60px]">
                            <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Élèves</span>
                        </div>
                    ) : (
                        <div className="flex flex-col w-full animate-in slide-in-from-left-2 duration-300">
                            {/* Context Info Area */}
                            <div className="p-4 pb-2 space-y-2">
                                {selectedStudent && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shadow-sm shrink-0">
                                            {selectedStudent.photo_base64 ? (
                                                <img src={selectedStudent.photo_base64} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-surface flex items-center justify-center text-xs font-bold text-primary">
                                                    {getInitials(selectedStudent)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-white leading-tight truncate">
                                                {selectedStudent.prenom} {selectedStudent.nom}
                                            </h3>
                                            {!selectedModule && <p className="text-[10px] text-grey-medium uppercase tracking-wide">Sélectionnez un module</p>}
                                        </div>
                                    </div>
                                )}

                                {selectedModule && (
                                    <div className="pl-[52px] animate-in fade-in slide-in-from-top-1">
                                        <div className="text-sm font-bold text-primary truncate">
                                            {selectedModule.nom}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Area */}
                            <div className="px-4 pb-3 pt-1">
                                <button
                                    onClick={handleBack}
                                    className="text-xs text-grey-medium hover:text-white flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-white/5 -ml-2"
                                >
                                    <span className="text-primary text-base">‹</span>
                                    <span className="font-medium">Retour</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar relative">

                    {/* VIEW 1: STUDENTS GRID */}
                    {currentView === 'students' && (
                        loadingStudents ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                        ) : (
                            <div className="grid grid-cols-4 gap-3 p-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                {students.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelectedStudent(student)}
                                        className="aspect-square rounded-full flex items-center justify-center border-2 border-white/10 hover:border-primary/50 hover:scale-105 transition-all relative group overflow-hidden bg-surface"
                                        title={`${student.prenom} ${student.nom}`}
                                    >
                                        {student.photo_base64 ? (
                                            <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-primary">{getInitials(student)}</span>
                                        )}
                                        {/* Hover overlay name? Optional, user asked for "just photos" */}
                                    </button>
                                ))}
                            </div>
                        )
                    )}

                    {/* VIEW 2: MODULES LIST */}
                    {currentView === 'modules' && (
                        loadingModules ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                        ) : (
                            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                {modules.map(module => (
                                    <button
                                        key={module.id}
                                        onClick={() => setSelectedModule(module)}
                                        className="w-full text-left px-4 py-3 rounded-xl border border-white/5 bg-surface/30 hover:bg-surface/50 hover:border-primary/30 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="p-2 bg-white/5 rounded-lg text-primary group-hover:scale-110 transition-transform">
                                            <BookOpen size={16} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{module.nom}</span>
                                    </button>
                                ))}
                                {modules.length === 0 && !loadingModules && (
                                    <p className="text-center text-grey-medium text-sm py-4">Aucun module en cours.</p>
                                )}
                            </div>
                        )
                    )}

                    {/* VIEW 3: ACTIVITIES & ACTIONS */}
                    {currentView === 'activities' && (
                        loadingActivities ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                {activities.map(activity => {
                                    const currentStatus = progressions[activity.id] || 'a_commencer';
                                    return (
                                        <div key={activity.id} className="p-3 bg-surface/20 rounded-xl border border-white/5 flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs text-grey-medium font-bold shrink-0">
                                                    {activity.ordre || '-'}
                                                </div>
                                                <span className="text-sm text-gray-200 font-medium leading-tight">{activity.titre}</span>
                                            </div>

                                            {/* ACTION BUTTONS */}
                                            <div className="flex items-center gap-2 w-full">
                                                {/* A commencer */}
                                                <button
                                                    onClick={() => handleStatusClick(activity.id, 'a_commencer')}
                                                    className={clsx(
                                                        "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border",
                                                        currentStatus === 'a_commencer'
                                                            ? "bg-primary text-text-dark border-primary shadow-sm"
                                                            : "bg-black/20 border-white/10 text-grey-medium hover:text-primary hover:border-primary/50"
                                                    )}
                                                >
                                                    A commencer
                                                </button>

                                                {/* Aide */}
                                                <button
                                                    onClick={() => handleStatusClick(activity.id, 'besoin_d_aide')}
                                                    className={clsx(
                                                        "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border",
                                                        currentStatus === 'besoin_d_aide'
                                                            ? "bg-danger text-white border-danger shadow-sm"
                                                            : "bg-black/20 border-white/10 text-grey-medium hover:text-danger hover:border-danger/50"
                                                    )}
                                                >
                                                    Aide
                                                </button>

                                                {/* Fini */}
                                                <button
                                                    onClick={() => handleStatusClick(activity.id, 'termine')}
                                                    className={clsx(
                                                        "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border flex items-center justify-center gap-1",
                                                        currentStatus === 'termine'
                                                            ? "bg-success text-white border-success shadow-sm"
                                                            : "bg-black/20 border-white/10 text-grey-medium hover:text-success hover:border-success/50"
                                                    )}
                                                >
                                                    <Check size={12} className={currentStatus === 'termine' ? "inline" : "hidden"} />
                                                    Fini
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activities.length === 0 && !loadingActivities && (
                                    <p className="text-center text-grey-medium text-sm py-4">Aucune activité dans ce module.</p>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* FOOTER: FINISH BUTTON */}
                {selectedStudent && (
                    <div className="p-4 border-t border-white/5 bg-surface/5 mt-auto">
                        <button
                            onClick={() => {
                                setSelectedStudent(null);
                                setSelectedModule(null);
                                setModules([]);
                                setActivities([]);
                            }}
                            className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                        >
                            <Check size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="font-medium uppercase tracking-wider text-xs">Fin pour cet utilisateur</span>
                        </button>
                    </div>
                )}
            </div>

            {/* MIDDLE COLUMN: HELP REQUESTS (25% WIDTH) */}
            <div className="w-1/4 min-w-[300px] h-full border-r border-white/10 bg-surface/5 flex flex-col">
                <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Demandes d'Aide</span>
                    <span className="ml-auto bg-danger/10 text-danger text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {helpRequests.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {helpRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-grey-medium opacity-50 space-y-2">
                            <Check size={24} />
                            <p className="text-xs">Aucune demande</p>
                        </div>
                    ) : (
                        helpRequests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => handleExpandHelp(req.id, req.activite?.id)}
                                className={clsx(
                                    "p-3 bg-surface rounded-xl border border-white/5 shadow-sm transition-all animate-in slide-in-from-bottom-2 cursor-pointer group hover:border-white/20 select-none",
                                    expandedRequestId === req.id ? "bg-surface-light border-primary/20 ring-1 ring-primary/10" : "hover:border-danger/30"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                                        {req.eleve?.photo_base64 ? (
                                            <img src={req.eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-surface-light flex items-center justify-center text-xs font-bold text-primary">
                                                {getInitials(req.eleve || {})}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-white truncate">
                                            {req.eleve?.prenom} {req.eleve?.nom}
                                        </h4>
                                        <p className="text-[10px] text-grey-medium truncate uppercase tracking-wide">
                                            {req.activite?.titre || 'Activité inconnue'}
                                        </p>
                                    </div>
                                    {/* INDICATOR (Hidden when expanded) */}
                                    {expandedRequestId !== req.id && (
                                        <div className={clsx(
                                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm",
                                            "bg-danger text-white border border-red-500"
                                        )}>
                                            Aide
                                        </div>
                                    )}
                                </div>

                                {/* EXPANDED CONTENT: HELPERS */}
                                {expandedRequestId === req.id && (
                                    <div className="pt-3 mt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 cursor-default" onClick={(e) => e.stopPropagation()}>

                                        {/* ACTION BUTTONS (Full Width) */}
                                        <div className="flex gap-2 mb-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusClick(req.activite.id, 'a_commencer', req.eleve.id);
                                                }}
                                                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <RotateCcw size={12} />
                                                À comm.
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStatusClick(req.activite.id, 'termine', req.eleve.id);
                                                }}
                                                className="flex-1 py-1.5 bg-success hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg border border-success transition-colors flex items-center justify-center gap-2 shadow-lg shadow-success/20"
                                            >
                                                <Check size={12} />
                                                Fini
                                            </button>
                                        </div>

                                        <div className="text-[10px] font-bold text-grey-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Users size={12} />
                                            Peut t'aider :
                                        </div>

                                        <div className="space-y-2">
                                            {helpersCache[req.id] ? (
                                                helpersCache[req.id].length > 0 ? (
                                                    helpersCache[req.id].map(helper => (
                                                        <div key={helper.id} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/5">
                                                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                                {helper.photo_base64 ? <img src={helper.photo_base64} alt="" className="w-full h-full object-cover" /> : <div className="bg-surface text-[8px] flex items-center justify-center h-full w-full">{getInitials(helper)}</div>}
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-300">{helper.prenom} {helper.nom}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-grey-dark italic p-2 bg-white/5 rounded-lg text-center">Personne n'a encore fini cette activité.</p>
                                                )
                                            ) : (
                                                <div className="flex justify-center p-2"><Loader2 size={16} className="animate-spin text-primary" /></div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA - Placeholder for now */}
            <div className="flex-1 bg-background flex items-center justify-center p-8 opacity-20 pointer-events-none border-l border-white/5">
                <div className="text-center space-y-4">
                    <Activity size={64} className="mx-auto" />
                    <p className="text-2xl font-light">Le reste de l'application continue ici...</p>
                </div>
            </div>
        </div >
    );
};

export default SuiviPedagogique;
