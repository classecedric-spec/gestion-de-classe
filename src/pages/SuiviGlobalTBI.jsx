import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import {
    Users, BookOpen, Check, AlertCircle, Clock,
    ShieldCheck, ChevronLeft, ChevronDown, Home, User, ArrowLeft, Play, Pause, RotateCcw,
    Plus, Trash2, X, Settings2
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { fetchWithCache } from '../lib/offline';

/**
 * Suivi Global TBI - Optimisé pour Tableau Blanc Interactif
 * Résolution: 960x540 pixels, Mode Paysage
 * Layout: 3 colonnes (40% - 40% - 20%)
 *   - Col 1: Navigation (Élèves → Modules → Activités)
 *   - Col 2: Demandes d'aide
 *   - Col 3: Suivi adulte + Timer
 */
const SuiviGlobalTBI = () => {
    const { isOnline, addToQueue } = useOfflineSync();

    // --- STATE ---
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({});

    // Navigation state for Column 1
    const [view, setView] = useState('students'); // 'students' | 'modules' | 'activities'

    // Help Requests (Column 2)
    const [helpRequests, setHelpRequests] = useState([]);

    // Adult Tracking (Column 3)
    const [allAdults, setAllAdults] = useState([]);
    const [activeAdults, setActiveAdults] = useState([]); // Array of adult objects
    const [adultActivities, setAdultActivities] = useState([]);
    const [availableActivityTypes, setAvailableActivityTypes] = useState([]);
    const [showTaskSelectorFor, setShowTaskSelectorFor] = useState(null); // adultId

    // Timer (Column 3)
    const [timerMinutes, setTimerMinutes] = useState(5);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showTimerConfig, setShowTimerConfig] = useState(false);

    const [currentTime, setCurrentTime] = useState(new Date());

    // --- TIME UPDATE ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // --- TIMER LOGIC ---
    useEffect(() => {
        let interval;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timerActive && timeLeft === 0) {
            setTimerActive(false);
            playTimerSound();
            toast.success("Timer terminé !");
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    const playTimerSound = () => {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 2);
    };

    const startTimer = () => {
        const totalSeconds = (timerMinutes * 60) + timerSeconds;
        if (totalSeconds > 0) {
            setTimeLeft(totalSeconds);
            setTimerActive(true);
            setShowTimerConfig(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchGroups();
        fetchAllAdults();
        fetchActivityTypes();
        fetchAdultTracking();
    }, []);

    const fetchGroups = async () => {
        await fetchWithCache(
            'groups',
            async () => {
                const { data, error } = await supabase.from('Groupe').select('*').order('ordre');
                if (error) throw error;
                return data || [];
            },
            (data) => {
                setGroups(data);
                if (data?.length > 0 && !selectedGroupId) {
                    setSelectedGroupId(data[0].id);
                }
            },
            (error, isCached) => {
                if (isCached) toast.info("Mode hors-ligne : Groupes chargés du cache");
                else toast.error("Erreur chargement groupes");
            }
        );
    };

    const fetchAllAdults = async () => {
        await fetchWithCache(
            'all_adults',
            async () => {
                const { data, error } = await supabase.from('Adulte').select('*').order('nom');
                if (error) throw error;
                return data || [];
            },
            setAllAdults
        );
    };

    const fetchActivityTypes = async () => {
        await fetchWithCache(
            'activity_types_adult',
            async () => {
                const { data, error } = await supabase.from('TypeActiviteAdulte').select('*').order('label');
                if (error) throw error;
                return data || [];
            },
            setAvailableActivityTypes
        );
    };

    const fetchAdultTracking = async () => {
        await fetchWithCache(
            'adult_tracking_today',
            async () => {
                const today = new Date().toISOString().split('T')[0];
                const { data, error } = await supabase
                    .from('SuiviAdulte')
                    .select(`
                        *,
                        Adulte (id, nom, prenom),
                        TypeActiviteAdulte (id, label)
                    `)
                    .gte('created_at', today)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            },
            setAdultActivities
        );
    };

    // --- FETCH ON GROUP SELECTION ---
    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
            setSelectedStudent(null);
            setSelectedModule(null);
            setActivities([]);
            setView('students');
        }
    }, [selectedGroupId]);

    useEffect(() => {
        if (students.length > 0) {
            fetchHelpRequests();
        }
    }, [students]);

    const fetchStudents = async (groupId) => {
        await fetchWithCache(
            `students_${groupId}`,
            async () => {
                const { data: links } = await supabase
                    .from('EleveGroupe')
                    .select('eleve_id')
                    .eq('groupe_id', groupId);

                const eleveIds = links?.map(l => l.eleve_id) || [];
                if (eleveIds.length > 0) {
                    const { data } = await supabase
                        .from('Eleve')
                        .select('*, Niveau(ordre, nom)')
                        .in('id', eleveIds);

                    if (!data) return [];

                    const sorted = data.sort((a, b) => {
                        const levelA = a.Niveau?.ordre || 0;
                        const levelB = b.Niveau?.ordre || 0;
                        if (levelA !== levelB) return levelA - levelB;
                        return (a.prenom || '').localeCompare(b.prenom || '');
                    });
                    return sorted;
                }
                return [];
            },
            setStudents
        );
    };

    const fetchModules = async (studentId) => {
        await fetchWithCache(
            `modules_active_${studentId}`,
            async () => {
                const { data } = await supabase
                    .from('Module')
                    .select(`
                        *,
                        SousBranche (nom, ordre, Branche(nom, ordre)),
                        Activite (
                            id,
                            ActiviteNiveau (niveau_id),
                            Progression (etat, eleve_id)
                        )
                    `)
                    .eq('statut', 'en_cours');
                return data || [];
            },
            (data) => {
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id;

                const modulesWithStats = (data || []).map(m => {
                    const validActivities = m.Activite?.filter(act => {
                        if (!studentLevelId) return true;
                        const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                        return levels.length > 0 && levels.includes(studentLevelId);
                    }) || [];

                    const total = validActivities.length;
                    const completed = validActivities.filter(act =>
                        act.Progression?.some(p => p.eleve_id === studentId && (p.etat === 'termine' || p.etat === 'a_verifier'))
                    ).length;

                    return { ...m, total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
                }).filter(m => m.total > 0 && m.completed < m.total);

                const sorted = modulesWithStats.sort((a, b) => {
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

                setModules(sorted);
            }
        );
    };

    const fetchActivities = async (moduleId, studentId) => {
        await fetchWithCache(
            `activities_${moduleId}_${studentId}`,
            async () => {
                const { data: acts } = await supabase
                    .from('Activite')
                    .select(`*, ActiviteNiveau (niveau_id)`)
                    .eq('module_id', moduleId)
                    .order('ordre');

                if (!acts) return { activities: [], progressions: [] };

                const { data: progs } = await supabase
                    .from('Progression')
                    .select('activite_id, etat')
                    .eq('eleve_id', studentId)
                    .in('activite_id', acts.map(a => a.id));

                return { activities: acts, progressions: progs || [] };
            },
            (data) => {
                const { activities: acts, progressions: progs } = data;
                const student = students.find(s => s.id === studentId);
                const studentLevelId = student?.niveau_id;

                const filtered = (acts || []).filter(act => {
                    const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                    return levels.length > 0 && levels.includes(studentLevelId);
                });

                if (filtered.length > 0) {
                    const progMap = {};
                    progs?.forEach(p => { progMap[p.activite_id] = p.etat; });
                    setProgressions(progMap);
                } else {
                    setProgressions({});
                }
                setActivities(filtered);
            }
        );
    };

    const fetchHelpRequests = async () => {
        if (students.length === 0) return;
        const studentIds = students.map(s => s.id);

        const { data } = await supabase
            .from('Progression')
            .select(`
                id, etat, is_suivi,
                eleve:Eleve(id, prenom, nom, photo_base64),
                activite:Activite(id, titre, Module(statut))
            `)
            .in('etat', ['besoin_d_aide', 'a_verifier'])
            .in('eleve_id', studentIds)
            .order('updated_at', { ascending: true });

        const validRequests = (data || []).filter(req => {
            if (req.is_suivi) return true;
            return req.activite?.Module?.statut === 'en_cours';
        });

        setHelpRequests(validRequests);
    };

    const fetchAdultActivities = async (adultId) => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('SuiviAdulte')
            .select(`
                *,
                TypeActiviteAdulte (id, label)
            `)
            .eq('adulte_id', adultId)
            .gte('created_at', today)
            .order('created_at', { ascending: false });

        setAdultActivities(data || []);
    };

    const handleStudentClick = (student) => {
        setSelectedStudent(student);
        fetchModules(student.id);
        setView('modules');
    };

    const handleModuleClick = (module) => {
        if (selectedModule?.id === module.id) {
            // Close if already open
            setSelectedModule(null);
            setActivities([]);
        } else {
            // Open new module
            setSelectedModule(module);
            fetchActivities(module.id, selectedStudent.id);
        }
    };

    const handleBackToStudents = () => {
        setSelectedStudent(null);
        setSelectedModule(null);
        setActivities([]);
        setView('students');
    };

    const handleBackToModules = () => {
        setSelectedModule(null);
        setActivities([]);
        setView('modules');
    };

    const handleStatusClick = async (activityId, currentStatus) => {
        if (!selectedStudent) return;

        let nextStatus = 'termine';
        if (currentStatus === 'a_commencer' || !currentStatus) nextStatus = 'besoin_d_aide';
        else if (currentStatus === 'besoin_d_aide') nextStatus = 'ajustement';
        else if (currentStatus === 'ajustement') nextStatus = 'termine';
        else if (currentStatus === 'termine' || currentStatus === 'a_verifier') nextStatus = 'a_commencer';

        // Optimistic UI update
        setProgressions(prev => ({ ...prev, [activityId]: nextStatus }));

        if (!isOnline) {
            addToQueue({
                type: 'SUPABASE_CALL',
                table: 'Progression',
                method: 'upsert',
                payload: {
                    eleve_id: selectedStudent.id,
                    activite_id: activityId,
                    etat: nextStatus,
                    updated_at: new Date().toISOString()
                },
                match: null, // upsert handles match via PK
                contextDescription: `Maj statut ${selectedStudent.prenom}`
            });
            return;
        }

        const { error } = await supabase
            .from('Progression')
            .upsert({
                eleve_id: selectedStudent.id,
                activite_id: activityId,
                etat: nextStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'eleve_id,activite_id' });

        if (error) {
            toast.error("Erreur");
            setProgressions(prev => ({ ...prev, [activityId]: currentStatus }));
        } else {
            fetchHelpRequests();
        }
    };

    const handleHelpStatusClick = async (requestId) => {
        const { error } = await supabase
            .from('Progression')
            .update({ etat: 'termine', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (!error) fetchHelpRequests();
    };

    const handleAddAdultToView = (adultId) => {
        if (!adultId) return;
        const adult = allAdults.find(a => a.id === adultId);
        if (adult && !activeAdults.find(a => a.id === adultId)) {
            setActiveAdults([...activeAdults, adult]);
        }
    };

    const handleRemoveAdultFromView = (adultId) => {
        setActiveAdults(activeAdults.filter(a => a.id !== adultId));
    };

    const handleAddTaskEntry = async (adulteId, typeActiviteId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id; // Must exist

            if (!isOnline) {
                // We generate a temp ID for optimistic UI if needed, but here we just toast
                // Actually, let's just queue it.
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'insert',
                    payload: {
                        adulte_id: adulteId,
                        activite_id: typeActiviteId,
                        user_id: userId
                    },
                    contextDescription: `Ajout tâche adulte`
                });

                // Optimistic refresh implies we can't see it immediately unless we mock it locally.
                // For simplicity, just toast default behavior.
                // Or better: manual implementation of optimistic update for adult tracking?
                // Let's just queue for now.
                setShowTaskSelectorFor(null);
                return;
            }

            const { error } = await supabase
                .from('SuiviAdulte')
                .insert([{
                    adulte_id: adulteId,
                    activite_id: typeActiviteId,
                    user_id: userId
                }]);

            if (error) throw error;
            setShowTaskSelectorFor(null);
            fetchAdultTracking();
            toast.success("Tâche ajoutée");
        } catch (error) {
            toast.error("Erreur: " + error.message);
        }
    };

    const handleDeleteTaskEntry = async (id) => {
        try {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'delete',
                    payload: null,
                    match: { id },
                    contextDescription: "Suppression tâche"
                });
                // Optimistic hide
                setAdultActivities(prev => prev.filter(p => p.id !== id));
                toast.success("Suppression mise en file d'attente");
                return;
            }

            const { error } = await supabase
                .from('SuiviAdulte')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchAdultTracking();
            toast.success("Retiré");
        } catch (error) {
            toast.error("Erreur");
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'termine': return 'bg-success text-white';
            case 'a_verifier': return 'bg-violet-500 text-white';
            case 'besoin_d_aide': return 'bg-gray-400 text-white';
            case 'ajustement': return 'bg-[#F59E0B] text-black';
            case 'a_domicile': return 'bg-danger text-white';
            default: return 'bg-white/10 text-grey-medium border border-white/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'termine': return <Check size={14} />;
            case 'a_verifier': return <ShieldCheck size={14} />;
            case 'besoin_d_aide': return <AlertCircle size={14} />;
            case 'ajustement': return <Settings2 size={14} />;
            case 'a_domicile': return <Home size={14} />;
            default: return null;
        }
    };

    return (
        <div className="h-screen w-screen bg-background flex flex-col overflow-hidden" style={{ maxWidth: '960px', maxHeight: '540px' }}>
            {/* HEADER */}
            <div className="bg-surface/80 border-b border-white/10 px-2 py-1 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Users className="text-primary" size={12} />
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="bg-background border border-white/10 text-white rounded-md py-0.5 px-2 appearance-none text-[10px] font-bold"
                    >
                        <option value="">Groupe...</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.nom}</option>
                        ))}
                    </select>
                </div>

                {selectedStudent && (
                    <div className="text-[11px] font-bold text-primary">
                        {selectedStudent.prenom} {selectedStudent.nom}
                    </div>
                )}

                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-md">
                    <Clock size={10} className="text-primary" />
                    <span className="text-[11px] font-black text-white font-mono">
                        {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* MAIN - 3 Columns (40% - 40% - 20%) */}
            <div className="flex-1 flex overflow-hidden">
                {/* COL 1: Navigation (40%) */}
                <div className="bg-surface border-r border-white/10 flex flex-col overflow-hidden" style={{ width: '40%' }}>
                    {view === 'students' && (
                        <>
                            <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                                    Élèves ({students.length})
                                </span>
                            </div>
                            <div className="flex-1 overflow-hidden p-1">
                                <div
                                    className="grid gap-1 h-full content-start justify-center"
                                    style={{
                                        gridTemplateColumns: `repeat(${students.length <= 6 ? 3 :
                                            students.length <= 12 ? 4 :
                                                students.length <= 20 ? 5 :
                                                    students.length <= 28 ? 6 :
                                                        students.length <= 32 ? 8 : 8
                                            }, 1fr)`
                                    }}
                                >
                                    {students.map(student => {
                                        const photoSize = students.length <= 6 ? '70px' :
                                            students.length <= 12 ? '60px' :
                                                students.length <= 20 ? '54px' :
                                                    students.length <= 28 ? '48px' : '42px';

                                        const fontSize = students.length <= 6 ? '10px' :
                                            students.length <= 12 ? '9px' : '8px';

                                        return (
                                            <button
                                                key={student.id}
                                                onClick={() => handleStudentClick(student)}
                                                className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-white/5 transition-all w-full"
                                            >
                                                <div
                                                    className="rounded-full overflow-hidden bg-white/10 shrink-0"
                                                    style={{ width: photoSize, height: photoSize }}
                                                >
                                                    {student.photo_base64 ? (
                                                        <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-primary" style={{ fontSize: `calc(${photoSize} * 0.3)` }}>
                                                            {getInitials(student)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span
                                                    className="font-bold text-white text-center leading-tight line-clamp-1 w-full"
                                                    style={{ fontSize }}
                                                >
                                                    {student.prenom}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'modules' && (
                        <>
                            <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center justify-between">
                                <button
                                    onClick={handleBackToStudents}
                                    className="flex items-center gap-1 text-primary hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={12} />
                                    <span className="text-[8px] font-bold">Retour</span>
                                </button>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Modules</span>
                            </div>
                            <div className="p-2">
                                {selectedStudent && (
                                    <div className="mb-2 p-2 bg-white/5 rounded-lg">
                                        <div className="text-[14px] font-bold text-white leading-tight">{selectedStudent.prenom} {selectedStudent.nom}</div>
                                        <div className="text-[10px] text-grey-medium mt-0.5">{selectedStudent.Niveau?.nom}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                                {modules.map(module => {
                                    const isExpanded = selectedModule?.id === module.id;
                                    return (
                                        <div key={module.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                            {/* Module Header */}
                                            <button
                                                onClick={() => handleModuleClick(module)}
                                                className="w-full p-2 text-left hover:bg-white/5 transition-all"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className={clsx(
                                                        "text-[10px] font-bold line-clamp-1 leading-tight flex-1",
                                                        isExpanded ? "text-primary" : "text-white"
                                                    )}>
                                                        {module.nom}
                                                    </div>
                                                    <ChevronDown
                                                        size={12}
                                                        className={clsx(
                                                            "transition-transform ml-1 shrink-0",
                                                            isExpanded ? "rotate-180 text-primary" : "text-grey-medium"
                                                        )}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-success" style={{ width: `${module.percent}%` }} />
                                                    </div>
                                                    <span className="text-[8px] text-grey-medium">{module.completed}/{module.total}</span>
                                                </div>
                                            </button>

                                            {/* Expanded Activities */}
                                            {isExpanded && (
                                                <div className="px-2 pb-2 space-y-1 border-t border-white/5 pt-1">
                                                    {activities.length === 0 ? (
                                                        <div className="text-[8px] text-grey-medium text-center py-2">Chargement...</div>
                                                    ) : (
                                                        activities.map(activity => {
                                                            const status = progressions[activity.id] || 'a_commencer';
                                                            return (
                                                                <div key={activity.id} className="p-1.5 bg-white/[0.03] rounded-md border border-white/5">
                                                                    <div className="text-[9px] font-semibold text-white mb-1 leading-tight">
                                                                        {activity.titre}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        {/* Bouton À Commencer */}
                                                                        <button
                                                                            onClick={() => handleStatusClick(activity.id, 'a_commencer')}
                                                                            className={clsx(
                                                                                "flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border",
                                                                                status === 'a_commencer'
                                                                                    ? "bg-primary text-black border-primary"
                                                                                    : "bg-black/20 border-white/5 text-grey-medium hover:border-primary/40"
                                                                            )}
                                                                        >
                                                                            A.C.
                                                                        </button>

                                                                        {/* Bouton Aide */}
                                                                        <button
                                                                            onClick={() => handleStatusClick(activity.id, 'besoin_d_aide')}
                                                                            className={clsx(
                                                                                "flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border",
                                                                                status === 'besoin_d_aide'
                                                                                    ? "bg-gray-400 text-white border-gray-400"
                                                                                    : "bg-black/20 border-white/5 text-grey-medium hover:border-gray-400/40"
                                                                            )}
                                                                        >
                                                                            Aide
                                                                        </button>

                                                                        {/* Bouton Terminé/Vérif */}
                                                                        <button
                                                                            onClick={() => handleStatusClick(activity.id, 'termine')}
                                                                            className={clsx(
                                                                                "flex-[1.5] py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-0.5",
                                                                                (status === 'termine' || status === 'a_verifier')
                                                                                    ? (status === 'a_verifier'
                                                                                        ? "bg-violet-500 text-white border-violet-500"
                                                                                        : "bg-success text-white border-success")
                                                                                    : "bg-black/20 border-white/5 text-grey-medium hover:border-success/40"
                                                                            )}
                                                                        >
                                                                            {status === 'a_verifier' ? (
                                                                                <>
                                                                                    <ShieldCheck size={8} />
                                                                                    <span>Verif</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Check size={8} />
                                                                                    <span>OK</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}


                </div>

                {/* COL 2: Help Requests (40%) */}
                <div className="bg-surface/50 border-r border-white/10 flex flex-col overflow-hidden" style={{ width: '40%' }}>
                    <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                            Demandes d'aide ({helpRequests.length})
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1">
                        {helpRequests.map(request => (
                            <div
                                key={request.id}
                                className="mb-1 bg-white/5 rounded-lg p-2 border border-white/10"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {request.eleve?.photo_base64 ? (
                                            <img src={request.eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[8px] font-bold text-primary">
                                                {getInitials({ prenom: request.eleve?.prenom, nom: request.eleve?.nom })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-white truncate">
                                            {request.eleve?.prenom} {request.eleve?.nom}
                                        </div>
                                        <div className="text-[8px] text-grey-medium truncate">
                                            {request.activite?.titre || "Suivi personnalisé"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleHelpStatusClick(request.id)}
                                        className={clsx(
                                            "px-2 py-1 rounded text-[9px] font-bold shrink-0 hover:opacity-80",
                                            request.etat === 'besoin_d_aide' ? "bg-gray-400 text-white" : "bg-violet-500 text-white"
                                        )}
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COL 3: Adult + Timer (20%) */}
                <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
                    {/* Task Selector Overlay */}
                    {showTaskSelectorFor && (
                        <div className="absolute inset-0 z-50 bg-background/95 p-2 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-primary italic">Choisir une tâche</span>
                                <button onClick={() => setShowTaskSelectorFor(null)} className="p-1 hover:bg-white/10 rounded">
                                    <X size={14} className="text-white" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1 content-start">
                                {availableActivityTypes.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleAddTaskEntry(showTaskSelectorFor, type.id)}
                                        className="p-2 bg-white/5 border border-white/10 rounded hover:bg-primary/20 hover:border-primary/40 transition-all text-left"
                                    >
                                        <div className="text-[9px] font-bold text-white leading-tight">{type.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Adult Selection */}
                    <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Adultes</span>
                    </div>
                    <div className="p-1 shrink-0 border-b border-white/5">
                        <select
                            value=""
                            onChange={(e) => handleAddAdultToView(e.target.value)}
                            className="w-full bg-surface border border-white/10 text-white rounded-md py-1 px-2 text-[9px] font-bold"
                        >
                            <option value="">+ Ajouter un adulte...</option>
                            {allAdults.map(adult => (
                                <option key={adult.id} value={adult.id}>
                                    {adult.prenom} {adult.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Active Adults List */}
                    <div className="flex-1 overflow-y-auto p-1 space-y-2">
                        {activeAdults.map(adult => {
                            const thisAdultActivities = adultActivities.filter(aa => aa.adulte_id === adult.id);
                            return (
                                <div key={adult.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                    {/* Adult Header */}
                                    <div className="p-1.5 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-bold text-white truncate">{adult.prenom}</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setShowTaskSelectorFor(adult.id)}
                                                className="p-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                                            >
                                                <Plus size={10} />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveAdultFromView(adult.id)}
                                                className="p-1 hover:bg-white/10 text-grey-medium rounded"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Adult Task List */}
                                    <div className="p-1 space-y-1">
                                        {thisAdultActivities.map(activity => (
                                            <div key={activity.id} className="group flex items-center justify-between gap-1 p-1 bg-black/20 rounded border border-white/5">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[8px] font-bold text-primary truncate leading-tight">
                                                        {activity.TypeActiviteAdulte?.label}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteTaskEntry(activity.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-danger hover:bg-danger/10 rounded transition-opacity"
                                                >
                                                    <Trash2 size={8} />
                                                </button>
                                            </div>
                                        ))}
                                        {thisAdultActivities.length === 0 && (
                                            <div className="text-[7px] text-grey-medium text-center py-1">Pas de tâches</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {activeAdults.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-8">
                                <User size={24} className="text-grey-medium mb-1" />
                                <span className="text-[9px] font-bold text-grey-medium">Aucun adulte sélectionné</span>
                            </div>
                        )}
                    </div>

                    {/* Timer Section */}
                    <div className="border-t border-white/10 p-2 bg-surface/50 shrink-0">
                        {showTimerConfig ? (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={timerMinutes}
                                        onChange={(e) => setTimerMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                        className="flex-1 bg-background border border-white/10 text-white rounded px-1 py-0.5 text-[10px] text-center"
                                        placeholder="Min"
                                    />
                                    <span className="text-white text-[10px] self-center">:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={timerSeconds}
                                        onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                        className="flex-1 bg-background border border-white/10 text-white rounded px-1 py-0.5 text-[10px] text-center"
                                        placeholder="Sec"
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={startTimer}
                                        className="flex-1 bg-primary text-black rounded py-1 text-[9px] font-bold hover:bg-primary/90"
                                    >
                                        Démarrer
                                    </button>
                                    <button
                                        onClick={() => setShowTimerConfig(false)}
                                        className="px-2 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ) : timerActive ? (
                            <div className="space-y-1">
                                <div className="text-center text-[18px] font-black text-primary font-mono leading-none py-1">
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setTimerActive(false)}
                                        className="flex-1 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20 flex items-center justify-center gap-1"
                                    >
                                        <Pause size={10} /> Pause
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTimerActive(false);
                                            setTimeLeft(0);
                                        }}
                                        className="px-2 bg-white/10 text-white rounded py-1 text-[9px] font-bold hover:bg-white/20"
                                    >
                                        <RotateCcw size={10} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowTimerConfig(true)}
                                className="w-full bg-primary/20 border border-primary/30 text-primary rounded py-1.5 text-[10px] font-bold hover:bg-primary/30 flex items-center justify-center gap-1"
                            >
                                <Clock size={12} /> Timer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuiviGlobalTBI;
