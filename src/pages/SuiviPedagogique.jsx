import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getInitials, calculateAge } from '../lib/utils';
import { Users, BookOpen, Activity, Check, AlertCircle, Clock, Loader2, Play, RotateCcw, Filter, Settings2, Eye, EyeOff, X, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const SuiviPedagogique = () => {
    // --- STATE ---
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [showGroupSelector, setShowGroupSelector] = useState(true);
    const [showPendingOnly, setShowPendingOnly] = useState(true);

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false);

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
    const [itemToDelete, setItemToDelete] = useState(null); // For delete confirmation popup

    // --- LAYOUT MODE ---
    const [isEditMode, setIsEditMode] = useState(false);

    // --- RESIZABLE LAYOUT STATE ---
    const containerRef = useRef(null);

    // Column widths (3 dividers between 4 columns)
    const [columnWidths, setColumnWidths] = useState([240, 240, 240]); // First 3 columns, 4th takes remaining space
    const activeColumnResize = useRef(null); // Which column divider is being dragged (0, 1, or 2)

    // Row heights for each column (independent horizontal splits)
    const [rowHeights, setRowHeights] = useState([300, 300, 300, 300]); // Height of top zone in each column
    const activeRowResize = useRef(null); // Which column's row is being resized (0, 1, 2, or 3)
    const columnRefs = useRef([null, null, null, null]); // Refs to each column for calculating row heights

    // --- RESIZE HANDLERS ---
    const handleColumnMouseDown = (columnIndex) => (e) => {
        activeColumnResize.current = columnIndex;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handleRowMouseDown = (columnIndex) => (e) => {
        activeRowResize.current = columnIndex;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            // Handle column resize
            if (activeColumnResize.current !== null && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                const colIndex = activeColumnResize.current;
                const totalWidth = containerRect.width;

                // Calculate cumulative width of all previous columns
                let previousWidth = 0;
                for (let i = 0; i < colIndex; i++) {
                    previousWidth += columnWidths[i] + 4; // +4 for divider width
                }

                const rawWidth = e.clientX - containerRect.left - previousWidth;

                // Limits: 10% to 70% of total width
                const minWidth = totalWidth * 0.1;
                const maxWidth = totalWidth * 0.7;

                setColumnWidths(prev => {
                    const updated = [...prev];
                    updated[colIndex] = Math.max(minWidth, Math.min(maxWidth, rawWidth));
                    return updated;
                });
            }

            // Handle row resize
            if (activeRowResize.current !== null) {
                const colIndex = activeRowResize.current;
                const colRef = columnRefs.current[colIndex];
                if (colRef) {
                    const colRect = colRef.getBoundingClientRect();
                    const rawHeight = e.clientY - colRect.top;

                    // Limits: 10% to 90% of column height
                    const minHeight = colRect.height * 0.1;
                    const maxHeight = colRect.height * 0.9;

                    setRowHeights(prev => {
                        const updated = [...prev];
                        updated[colIndex] = Math.max(minHeight, Math.min(maxHeight, rawHeight));
                        return updated;
                    });
                }
            }
        };

        const handleMouseUp = () => {
            activeColumnResize.current = null;
            activeRowResize.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [columnWidths, rowHeights, isEditMode]);

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchGroups();
        loadLayoutPreferences();
    }, []);

    const loadLayoutPreferences = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'suivi_pedagogique_layout')
            .maybeSingle();

        if (data?.value) {
            const val = data.value;
            if (val.columnWidths) setColumnWidths(val.columnWidths);
            if (val.rowHeights) setRowHeights(val.rowHeights);
            if (val.selectedGroupId) {
                setSelectedGroupId(val.selectedGroupId);
                setShowGroupSelector(false);
            }
            if (val.showPendingOnly !== undefined) setShowPendingOnly(val.showPendingOnly);
        }
        setIsPreferencesLoaded(true);
    };

    // --- SAVE PREFERENCES ---
    useEffect(() => {
        if (!isPreferencesLoaded) return;

        // Debounced save
        const timer = setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setIsSaving(true);
            const { error } = await supabase.from('UserPreference').upsert({
                user_id: user.id,
                key: 'suivi_pedagogique_layout',
                value: {
                    columnWidths,
                    rowHeights,
                    selectedGroupId,
                    showPendingOnly
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });

            if (!error) {
                setLastSaved(new Date());
                setTimeout(() => setIsSaving(false), 2000);
            } else {
                setIsSaving(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [columnWidths, rowHeights, selectedGroupId, showPendingOnly, isPreferencesLoaded]);

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
            fetchModules(selectedStudent.id);
            // Reset downstream
            setSelectedModule(null);
            setActivities([]);
            fetchStudentProgressions(selectedStudent.id);
        }
    }, [selectedStudent, showPendingOnly]);

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
                .select(`
                  *,
                  importance_suivi,
                  Classe (
                    nom,
                    ClasseAdulte (
                      role,
                      Adulte (id, nom, prenom)
                    )
                  ),
                  Niveau (nom),
                  EleveGroupe!inner(
                    groupe_id,
                    Groupe(id, nom)
                  )
                `)
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

    const fetchModules = async (studentId) => {
        if (!studentId) return;
        setLoadingModules(true);
        try {
            const { data, error } = await supabase
                .from('Module')
                .select(`
                    *,
                    SousBranche:sous_branche_id (
                        nom,
                        ordre,
                        Branche:branche_id (nom, ordre)
                    ),
                    Activite (
                        id,
                        Progression (etat, eleve_id)
                    )
                `)
                .eq('statut', 'en_cours');

            if (error) throw error;

            const modulesWithStats = (data || []).map(m => {
                const totalActivities = m.Activite?.length || 0;
                const completedActivities = m.Activite?.filter(act =>
                    act.Progression?.some(p => p.eleve_id === studentId && p.etat === 'termine')
                ).length || 0;

                return {
                    ...m,
                    totalActivities,
                    completedActivities,
                    percent: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
                };
            });

            const filteredByCompletion = modulesWithStats.filter(m => {
                // Si aucune activité, on le garde
                if (m.totalActivities === 0) return true;

                // Filter based on toggle
                if (showPendingOnly) {
                    return m.completedActivities < m.totalActivities;
                }
                return true;
            });

            const sortedModules = filteredByCompletion.sort((a, b) => {
                // 1. Date de fin (nulls à la fin)
                if (a.date_fin !== b.date_fin) {
                    if (!a.date_fin) return 1;
                    if (!b.date_fin) return -1;
                    return a.date_fin.localeCompare(b.date_fin);
                }

                // 2. Branche (ordre then nom)
                const aB = a.SousBranche?.Branche;
                const bB = b.SousBranche?.Branche;
                if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                if (aB?.nom !== bB?.nom) return (aB?.nom || '').localeCompare(bB?.nom || '');

                // 3. Sous-Branche (ordre then nom)
                const aSB = a.SousBranche;
                const bSB = b.SousBranche;
                if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                if (aSB?.nom !== bSB?.nom) return (aSB?.nom || '').localeCompare(bSB?.nom || '');

                // 4. Alphabétique (Orthographe)
                return a.nom.localeCompare(b.nom);
            });

            setModules(sortedModules);
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
                .select(`
                    *,
                    ActiviteMateriel (
                        TypeMateriel (
                            acronyme
                        )
                    )
                `)
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

    // --- POLLING SYNC (Backup for Realtime) ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (students.length > 0) {
                fetchHelpRequests();
            }
            if (selectedStudentRef.current) {
                fetchStudentProgressions(selectedStudentRef.current.id);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [students]);

    // --- HELP REQUESTS LOGIC ---
    // --- REALTIME SYNC ---
    const selectedStudentRef = useRef(selectedStudent);
    useEffect(() => {
        selectedStudentRef.current = selectedStudent;
    }, [selectedStudent]);

    useEffect(() => {
        if (students.length > 0) {
            fetchHelpRequests();

            const channel = supabase
                .channel('suivi_pedagogique_global')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'Progression' },
                    (payload) => {
                        // 1. Update Help Requests List (Always)
                        fetchHelpRequests();

                        // 2. Update Specific Student View if active (optimizes refreshes)
                        const currentSelected = selectedStudentRef.current;
                        const impactedId = payload.new?.eleve_id || payload.old?.eleve_id;

                        // If the update concerns the currently viewed student, refresh their flow
                        if (currentSelected && impactedId === currentSelected.id) {
                            fetchStudentProgressions(currentSelected.id);
                        }
                    }
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
                    is_suivi,
                    eleve:Eleve(id, prenom, nom, photo_base64),
                    activite:Activite(
                        id,
                        titre,
                        Module(
                            statut
                        ),
                        ActiviteMateriel (
                            TypeMateriel (
                                acronyme
                            )
                        )
                    )
                `)
                .in('etat', ['besoin_d_aide'])
                .in('eleve_id', studentIds)
                .order('updated_at', { ascending: true });

            if (error) console.error("Error fetching help requests", error);

            // Filter in JS: natural requests (is_suivi=false) must be in an 'en_cours' module.
            // Admin follow-ups (is_suivi=true) are always shown.
            const validRequests = (data || []).filter(req => {
                if (req.is_suivi) return true;
                return req.activite?.Module?.statut === 'en_cours';
            });

            setHelpRequests(validRequests);
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

    const handleAddStudentsForSuivi = async () => {
        if (!students.length) return;

        // 1. Pick 3 students weighted by importance_suivi
        // Weighted random: sort by (random * importance)
        const candidates = [...students].map(s => ({
            ...s,
            score: Math.random() * (s.importance_suivi || 1)
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        const { data: { user } } = await supabase.auth.getUser();

        for (const student of candidates) {
            const { error } = await supabase.from('Progression').insert({
                eleve_id: student.id,
                activite_id: null,
                etat: 'besoin_d_aide',
                is_suivi: true,
                user_id: user?.id,
                updated_at: new Date().toISOString()
            });
            if (error) {
                console.error("Insert error:", error);
            }
        }

        toast.success("3 élèves ajoutés au suivi personnalisé");
        fetchHelpRequests();
    };

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
            fetchHelpRequests();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleGroupSelect = (groupId) => {
        setSelectedGroupId(groupId);
        setShowGroupSelector(false);
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
        <>

            <div ref={containerRef} className="w-full h-full flex bg-background relative overflow-hidden">

                {/* FLOATING EDIT TOGGLE & STATUS */}
                <div className="fixed top-4 right-4 z-[60] flex flex-col items-end gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={clsx(
                            "px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all shadow-2xl backdrop-blur-xl",
                            isEditMode
                                ? "bg-primary text-black border-primary scale-105"
                                : "bg-surface/60 text-grey-medium border-white/10 hover:border-primary/50 hover:text-white"
                        )}
                    >
                        {isEditMode ? (
                            <Settings2 size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                        ) : (
                            <Settings2 size={18} />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isEditMode ? "Mode Édition" : "Ajuster Layout"}
                        </span>
                        {isEditMode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    {/* SAVING INDICATOR */}
                    <div className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md transition-all duration-500",
                        isSaving || lastSaved ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                    )}>
                        {isSaving ? (
                            <>
                                <Loader2 size={10} className="animate-spin text-primary" />
                                <span className="text-[9px] font-bold text-grey-medium uppercase tracking-tighter">Enregistrement...</span>
                            </>
                        ) : (
                            <>
                                <Check size={10} className="text-success" />
                                <span className="text-[9px] font-bold text-success uppercase tracking-tighter">Config. synchronisée</span>
                            </>
                        )}
                    </div>
                </div>

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

                {/* ========== COLUMN 1: STUDENTS (DRILL DOWN) ========== */}
                <div
                    ref={el => columnRefs.current[0] = el}
                    className="h-full bg-surface/10 flex flex-col transition-colors duration-300 shrink-0 relative"
                    style={{ width: columnWidths[0] }}
                >
                    {/* TOP ZONE 1A */}
                    <div
                        className="flex flex-col overflow-hidden shrink-0"
                        style={{ height: rowHeights[0] }}
                    >
                        {/* HEADER / BREADCRUMBS */}
                        <div className="flex flex-col border-b border-white/5 bg-surface/5 shrink-0">
                            {currentView === 'students' ? (
                                <div className="p-4 flex items-center justify-between h-[60px]">
                                    <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Élèves</span>
                                    <button
                                        onClick={() => setShowGroupSelector(true)}
                                        className="px-2 py-1 bg-white/5 hover:bg-primary/20 text-grey-medium hover:text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/10 hover:border-primary/30 transition-all flex items-center gap-1.5"
                                        title="Changer de groupe"
                                    >
                                        <Users size={12} />
                                        Changer
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col w-full animate-in slide-in-from-left-2 duration-300">
                                    {/* Context Info Area */}
                                    <div className="p-4 flex flex-col gap-4">
                                        {selectedStudent && (
                                            <div className="flex flex-col gap-3 animate-in fade-in duration-500">
                                                {/* Avatar & Identité */}
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shrink-0 bg-surface">
                                                        {selectedStudent.photo_base64 ? (
                                                            <img src={selectedStudent.photo_base64} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                                                                {getInitials(selectedStudent)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-xl font-bold text-white leading-tight truncate">
                                                            {selectedStudent.prenom}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {selectedModule && (
                                                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 animate-in slide-in-from-top-1">
                                                        <span className="text-[10px] uppercase tracking-widest font-black text-primary opacity-70 block mb-1">Module en cours</span>
                                                        <div className="text-sm font-bold text-white truncate leading-tight">
                                                            {selectedModule.nom}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation Area */}
                                    <div className="px-4 pb-3 pt-1 flex items-center justify-between">
                                        <button
                                            onClick={handleBack}
                                            className="text-xs text-grey-medium hover:text-white flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-white/5 -ml-2"
                                        >
                                            <span className="text-primary text-base">‹</span>
                                            <span className="font-medium">Retour</span>
                                        </button>

                                        <button
                                            onClick={() => setShowPendingOnly(!showPendingOnly)}
                                            className={clsx(
                                                "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all",
                                                showPendingOnly
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "bg-surface/30 border-white/5 text-grey-medium hover:text-white"
                                            )}
                                        >
                                            <Filter size={10} />
                                            {showPendingOnly ? "En cours" : "Tous"}
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
                                    (() => {
                                        const gap = 6;
                                        const padding = 16;
                                        const headerHeight = 60;
                                        const availableWidth = columnWidths[0] - padding;
                                        const availableHeight = rowHeights[0] - headerHeight - padding;
                                        const studentCount = Math.min(students.length, 80);

                                        if (studentCount === 0) return null;

                                        // Try all possible column configurations and find the one with largest bubble size
                                        let bestConfig = { cols: 1, rows: studentCount, bubbleSize: 30 };

                                        for (let cols = 1; cols <= studentCount; cols++) {
                                            const rows = Math.ceil(studentCount / cols);

                                            // Calculate max bubble size that fits in width
                                            const maxBubbleFromWidth = Math.floor((availableWidth - (cols - 1) * gap) / cols);

                                            // Calculate max bubble size that fits in height
                                            const maxBubbleFromHeight = Math.floor((availableHeight - (rows - 1) * gap) / rows);

                                            // Take the minimum to ensure it fits both ways
                                            const bubbleSize = Math.min(maxBubbleFromWidth, maxBubbleFromHeight);

                                            // Skip if bubbles would be too small or negative
                                            if (bubbleSize < 25) continue;

                                            // If this configuration gives bigger bubbles, use it
                                            if (bubbleSize > bestConfig.bubbleSize) {
                                                bestConfig = { cols, rows, bubbleSize };
                                            }
                                        }

                                        // Cap bubble size at 100px max for aesthetics
                                        const finalBubbleSize = Math.min(bestConfig.bubbleSize, 100);

                                        return (
                                            <div
                                                className="grid p-2 animate-in fade-in slide-in-from-left-4 duration-300 overflow-hidden"
                                                style={{
                                                    gridTemplateColumns: `repeat(${bestConfig.cols}, ${finalBubbleSize}px)`,
                                                    gridTemplateRows: `repeat(${bestConfig.rows}, ${finalBubbleSize}px)`,
                                                    gap: `${gap}px`,
                                                    justifyContent: 'center',
                                                    alignContent: 'center'
                                                }}
                                            >
                                                {students.slice(0, 80).map(student => (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => setSelectedStudent(student)}
                                                        className="rounded-full flex items-center justify-center border border-white/10 hover:border-primary/50 hover:scale-105 transition-all relative group overflow-hidden bg-surface shadow-lg"
                                                        style={{ width: finalBubbleSize, height: finalBubbleSize }}
                                                        title={`${student.prenom} ${student.nom}`}
                                                    >
                                                        {student.photo_base64 ? (
                                                            <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-primary">{getInitials(student)}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()
                                )
                            )}

                            {/* VIEW 2: MODULES LIST */}
                            {currentView === 'modules' && (
                                loadingModules ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {modules.map(module => {
                                            const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                                            return (
                                                <button
                                                    key={module.id}
                                                    onClick={() => setSelectedModule(module)}
                                                    className={clsx(
                                                        "w-full text-left px-3 py-2.5 rounded-xl border group transition-all",
                                                        isExpired
                                                            ? "bg-surface/30 border-danger/40 hover:border-danger/60"
                                                            : "bg-surface/30 border-white/5 hover:bg-surface/50 hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate mb-1.5">
                                                        {module.nom}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                            <div
                                                                className={clsx(
                                                                    "h-full transition-all duration-500 ease-out",
                                                                    isExpired ? "bg-danger" : "bg-success"
                                                                )}
                                                                style={{
                                                                    width: `${(module.Activite?.length > 0
                                                                        ? (module.Activite.filter(act => progressions[act.id] === 'termine').length / module.Activite.length) * 100
                                                                        : 0)}%`
                                                                }}
                                                            />
                                                        </div>
                                                        {module.date_fin && (
                                                            <div className={clsx(
                                                                "text-[10px] font-bold shrink-0",
                                                                isExpired ? "text-danger" : "text-white/50"
                                                            )}>
                                                                {new Date(module.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
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
                                                        <span className={clsx(
                                                            "text-sm font-medium leading-tight transition-colors",
                                                            currentStatus === 'termine' && "text-success font-bold",
                                                            currentStatus === 'besoin_d_aide' && "text-[#A0A8AD] font-bold",
                                                            currentStatus !== 'termine' && currentStatus !== 'besoin_d_aide' && "text-gray-200"
                                                        )}>
                                                            {activity.titre}
                                                            {activity.ActiviteMateriel && activity.ActiviteMateriel.length > 0 && (
                                                                <span className="ml-1 opacity-70 font-normal">
                                                                    [{activity.ActiviteMateriel.map(am => am.TypeMateriel?.acronyme).filter(Boolean).join(', ')}]
                                                                </span>
                                                            )}
                                                        </span>
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
                                                            A.C.
                                                        </button>

                                                        {/* Aide */}
                                                        <button
                                                            onClick={() => handleStatusClick(activity.id, 'besoin_d_aide')}
                                                            className={clsx(
                                                                "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border",
                                                                currentStatus === 'besoin_d_aide'
                                                                    ? "bg-[#A0A8AD] text-white border-[#A0A8AD] shadow-sm"
                                                                    : "bg-black/20 border-white/10 text-grey-medium hover:text-[#A0A8AD] hover:border-[#A0A8AD]/50"
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
                                                            Validé
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
                    </div>

                    {/* HORIZONTAL DIVIDER FOR COLUMN 1 */}
                    <div
                        onMouseDown={handleRowMouseDown(0)}
                        className={clsx(
                            "w-full h-1.5 bg-white/10 hover:bg-primary/50 cursor-row-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                            !isEditMode && "opacity-0 pointer-events-none"
                        )}
                        title="Glisser pour redimensionner"
                    >
                        <div className="w-12 h-0.5 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                    </div>

                    {/* BOTTOM ZONE 1B */}
                    <div className="flex-1 overflow-y-auto p-2 bg-surface/5">
                        {selectedStudent && (
                            <div className="p-4 border-t border-white/5 bg-surface/5">
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
                        {!selectedStudent && (
                            <div className="flex items-center justify-center h-full opacity-30">
                                <p className="text-xs text-grey-medium">Zone 1B</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMN DIVIDER 1 */}
                <div
                    onMouseDown={handleColumnMouseDown(0)}
                    className={clsx(
                        "w-1 h-full bg-white/10 hover:bg-primary/50 cursor-col-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                        !isEditMode && "opacity-0 pointer-events-none"
                    )}
                    title="Glisser pour redimensionner"
                >
                    <div className="w-0.5 h-8 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                </div>

                {/* ========== COLUMN 2: SUIVI PERSONNALISÉ ========== */}
                <div
                    ref={el => columnRefs.current[1] = el}
                    className="h-full bg-surface/5 flex flex-col shrink-0"
                    style={{ width: columnWidths[1] }}
                >
                    {/* TOP ZONE 2A: Suivi Personnalisé List */}
                    <div
                        className="flex flex-col overflow-hidden shrink-0"
                        style={{ height: rowHeights[1] }}
                    >
                        <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Suivi Personnalisé</span>
                            <span className="ml-auto bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {helpRequests.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {helpRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-grey-medium opacity-50 space-y-2">
                                    <Check size={24} />
                                    <p className="text-xs">Aucun suivi en cours</p>
                                </div>
                            ) : (
                                helpRequests.map(req => (
                                    <div key={req.id} className="relative group/card">
                                        {/* Delete Button - Only for Suivi items */}
                                        {req.is_suivi && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setItemToDelete(req); }}
                                                className="absolute -top-2 -right-2 z-10 p-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover/card:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                                title="Retirer du suivi"
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        )}

                                        <div
                                            onClick={() => !req.is_suivi && handleExpandHelp(req.id, req.activite?.id)}
                                            className={clsx(
                                                "p-3 bg-surface rounded-xl border border-white/5 shadow-sm transition-all animate-in slide-in-from-bottom-2 group select-none",
                                                !req.is_suivi ? "cursor-pointer hover:border-white/20 hover:bg-surface/60" : "cursor-default",
                                                expandedRequestId === req.id && "bg-surface-light border-primary/20 ring-1 ring-primary/10"
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
                                                    {!req.is_suivi && (
                                                        <p className="text-[10px] text-grey-medium truncate uppercase tracking-wide">
                                                            {req.activite?.titre || 'Activité inconnue'}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={clsx(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm",
                                                    req.is_suivi
                                                        ? "bg-primary text-black border border-primary"
                                                        : "bg-[#A0A8AD] text-white border border-[#A0A8AD]"
                                                )}>
                                                    {req.is_suivi ? 'Suivi' : 'Aide'}
                                                </div>
                                            </div>

                                            {/* EXPANDED CONTENT: HELPERS (Only for Aide) */}
                                            {expandedRequestId === req.id && !req.is_suivi && (
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
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* HORIZONTAL DIVIDER FOR COLUMN 2 */}
                    <div
                        onMouseDown={handleRowMouseDown(1)}
                        className={clsx(
                            "w-full h-1.5 bg-white/10 hover:bg-primary/50 cursor-row-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                            !isEditMode && "opacity-0 pointer-events-none"
                        )}
                        title="Glisser pour redimensionner"
                    >
                        <div className="w-12 h-0.5 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                    </div>

                    {/* BOTTOM ZONE 2B */}
                    <div className="flex-1 overflow-y-auto p-4 bg-surface/10 flex flex-col items-center justify-center gap-4">
                        <div className="text-center opacity-30">
                            <Activity size={32} className="mx-auto mb-2" />
                            <p className="text-xs text-grey-medium">Actions Suivi</p>
                        </div>
                        <button
                            onClick={handleAddStudentsForSuivi}
                            className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl border border-primary/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/5 active:scale-95 group"
                        >
                            <Users size={16} className="group-hover:scale-110 transition-transform" />
                            Ajouter des élèves au suivi
                        </button>
                    </div>
                </div>

                {/* COLUMN DIVIDER 2 */}
                <div
                    onMouseDown={handleColumnMouseDown(1)}
                    className={clsx(
                        "w-1 h-full bg-white/10 hover:bg-primary/50 cursor-col-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                        !isEditMode && "opacity-0 pointer-events-none"
                    )}
                    title="Glisser pour redimensionner"
                >
                    <div className="w-0.5 h-8 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                </div>

                {/* ========== COLUMN 3: FUTURE CONTENT ========== */}
                <div
                    ref={el => columnRefs.current[2] = el}
                    className="h-full bg-background flex flex-col shrink-0"
                    style={{ width: columnWidths[2] }}
                >
                    {/* TOP ZONE 3A */}
                    <div
                        className="flex flex-col overflow-hidden shrink-0 bg-surface/5"
                        style={{ height: rowHeights[2] }}
                    >
                        <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Zone 3A</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center overflow-auto">
                            <div className="text-center opacity-30">
                                <Activity size={32} className="mx-auto mb-2" />
                                <p className="text-xs text-grey-medium">Contenu futur</p>
                            </div>
                        </div>
                    </div>

                    {/* HORIZONTAL DIVIDER FOR COLUMN 3 */}
                    <div
                        onMouseDown={handleRowMouseDown(2)}
                        className={clsx(
                            "w-full h-1.5 bg-white/10 hover:bg-primary/50 cursor-row-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                            !isEditMode && "opacity-0 pointer-events-none"
                        )}
                        title="Glisser pour redimensionner"
                    >
                        <div className="w-12 h-0.5 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                    </div>

                    {/* BOTTOM ZONE 3B */}
                    <div className="flex-1 overflow-y-auto p-2 bg-surface/10 flex items-center justify-center">
                        <div className="text-center opacity-30">
                            <Activity size={32} className="mx-auto mb-2" />
                            <p className="text-xs text-grey-medium">Zone 3B</p>
                        </div>
                    </div>
                </div>

                {/* COLUMN DIVIDER 3 */}
                <div
                    onMouseDown={handleColumnMouseDown(2)}
                    className={clsx(
                        "w-1 h-full bg-white/10 hover:bg-primary/50 cursor-col-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                        !isEditMode && "opacity-0 pointer-events-none"
                    )}
                    title="Glisser pour redimensionner"
                >
                    <div className="w-0.5 h-8 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                </div>

                {/* ========== COLUMN 4: FUTURE CONTENT (TAKES REMAINING SPACE) ========== */}
                <div
                    ref={el => columnRefs.current[3] = el}
                    className="flex-1 h-full bg-background flex flex-col"
                >
                    {/* TOP ZONE 4A */}
                    <div
                        className="flex flex-col overflow-hidden shrink-0 bg-surface/5"
                        style={{ height: rowHeights[3] }}
                    >
                        <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Zone 4A</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center overflow-auto">
                            <div className="text-center opacity-30">
                                <Activity size={32} className="mx-auto mb-2" />
                                <p className="text-xs text-grey-medium">Contenu futur</p>
                            </div>
                        </div>
                    </div>

                    {/* HORIZONTAL DIVIDER FOR COLUMN 4 */}
                    <div
                        onMouseDown={handleRowMouseDown(3)}
                        className={clsx(
                            "w-full h-1.5 bg-white/10 hover:bg-primary/50 cursor-row-resize transition-all duration-300 shrink-0 group flex items-center justify-center",
                            !isEditMode && "opacity-0 pointer-events-none"
                        )}
                        title="Glisser pour redimensionner"
                    >
                        <div className="w-12 h-0.5 bg-white/20 group-hover:bg-primary rounded-full transition-colors" />
                    </div>

                    {/* BOTTOM ZONE 4B */}
                    <div className="flex-1 overflow-y-auto p-2 bg-surface/10 flex items-center justify-center">
                        <div className="text-center opacity-30">
                            <Activity size={32} className="mx-auto mb-2" />
                            <p className="text-xs text-grey-medium">Zone 4B</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                itemToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-text-main mb-2">Retirer du suivi ?</h2>
                            <p className="text-sm text-grey-medium mb-6">
                                Êtes-vous sûr de vouloir retirer <span className="text-white font-bold">{itemToDelete.eleve?.prenom} {itemToDelete.eleve?.nom}</span> de la liste de suivi ?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteSuivi}
                                    className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                                >
                                    Retirer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default SuiviPedagogique;
