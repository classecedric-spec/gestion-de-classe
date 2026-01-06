import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import {
    Users, BookOpen, Check, AlertCircle, Clock, Loader2,
    ShieldCheck, RotateCcw, ChevronDown, Home
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const SuiviGlobalTablet = () => {
    // --- STATE ---
    const [isLandscape, setIsLandscape] = useState(false);
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({});
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- ORIENTATION DETECTION ---
    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // --- TIME UPDATE ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchGroups();
    }, []);

    // --- DATA FETCHING ---
    const fetchGroups = async () => {
        const { data } = await supabase.from('Groupe').select('*').order('nom');
        setGroups(data || []);
    };

    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
            setSelectedStudent(null);
            setSelectedModule(null);
            setActivities([]);
        }
    }, [selectedGroupId]);

    useEffect(() => {
        if (selectedStudent) {
            fetchModules(selectedStudent.id);
            setSelectedModule(null);
            setActivities([]);
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedModule && selectedStudent) {
            fetchActivities(selectedModule.id, selectedStudent.id);
        }
    }, [selectedModule, selectedStudent]);

    const fetchStudents = async (groupId) => {
        setLoading(true);
        try {
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

                const sorted = (data || []).sort((a, b) => {
                    const levelA = a.Niveau?.ordre || 0;
                    const levelB = b.Niveau?.ordre || 0;
                    if (levelA !== levelB) return levelA - levelB;
                    return (a.prenom || '').localeCompare(b.prenom || '');
                });
                setStudents(sorted);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async (studentId) => {
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

        // Sort: Date fin -> Branch -> SubBranch -> Name
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
    };

    const fetchActivities = async (moduleId, studentId) => {
        const { data: acts } = await supabase
            .from('Activite')
            .select(`*, ActiviteNiveau (niveau_id), Module (SousBranche (Branche (id)))`)
            .eq('module_id', moduleId)
            .order('ordre');

        const student = students.find(s => s.id === studentId);
        const studentLevelId = student?.niveau_id;

        const filtered = (acts || []).filter(act => {
            const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
            return levels.length > 0 && levels.includes(studentLevelId);
        });

        const { data: progs } = await supabase
            .from('Progression')
            .select('activite_id, etat')
            .eq('eleve_id', studentId)
            .in('activite_id', filtered.map(a => a.id));

        const progMap = {};
        progs?.forEach(p => { progMap[p.activite_id] = p.etat; });

        setActivities(filtered);
        setProgressions(progMap);
    };

    // --- STATUS CLICK HANDLER ---
    const handleStatusClick = async (activityId, currentStatus) => {
        if (!selectedStudent) return;

        let nextStatus = 'termine';
        if (currentStatus === 'a_commencer' || !currentStatus) nextStatus = 'besoin_d_aide';
        else if (currentStatus === 'besoin_d_aide') nextStatus = 'termine';
        else if (currentStatus === 'termine' || currentStatus === 'a_verifier') nextStatus = 'a_commencer';

        // Optimistic update
        setProgressions(prev => ({ ...prev, [activityId]: nextStatus }));

        const { error } = await supabase
            .from('Progression')
            .upsert({
                eleve_id: selectedStudent.id,
                activite_id: activityId,
                etat: nextStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'eleve_id,activite_id' });

        if (error) {
            toast.error("Erreur de sauvegarde");
            setProgressions(prev => ({ ...prev, [activityId]: currentStatus }));
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'termine': return 'bg-success text-white';
            case 'a_verifier': return 'bg-violet-500 text-white';
            case 'besoin_d_aide': return 'bg-gray-400 text-white';
            case 'a_domicile': return 'bg-danger text-white';
            default: return 'bg-white/10 text-grey-medium';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'termine': return <Check size={20} />;
            case 'a_verifier': return <ShieldCheck size={20} />;
            case 'besoin_d_aide': return <AlertCircle size={20} />;
            case 'a_domicile': return <Home size={20} />;
            default: return null;
        }
    };

    // --- LANDSCAPE ALERT ---
    if (isLandscape) {
        return (
            <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-8 z-50">
                <RotateCcw size={80} className="text-primary mb-6 animate-pulse" />
                <h1 className="text-2xl font-bold text-white text-center mb-4">
                    Mode Portrait Requis
                </h1>
                <p className="text-grey-medium text-center text-lg">
                    Veuillez tourner votre tablette en mode portrait pour utiliser cette interface.
                </p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
            {/* HEADER - Compact */}
            <div className="bg-surface border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
                {/* Group Selector */}
                <div className="relative flex-1 max-w-[200px]">
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full bg-background border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-8 appearance-none text-sm font-bold"
                    >
                        <option value="">Groupe...</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.nom}</option>
                        ))}
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-medium" size={14} />
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl">
                    <Clock size={16} className="text-primary" />
                    <span className="text-xl font-black text-white font-mono">
                        {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* MAIN CONTENT - 3 Columns in Portrait */}
            <div className="flex-1 flex overflow-hidden">
                {/* Column 1: Students */}
                <div className="w-[140px] bg-surface border-r border-white/10 overflow-y-auto">
                    <div className="p-2 border-b border-white/10 bg-surface sticky top-0 z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Élèves</span>
                    </div>
                    <div className="p-1">
                        {students.map(student => (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className={clsx(
                                    "w-full flex items-center gap-2 p-2 rounded-lg transition-all mb-1",
                                    selectedStudent?.id === student.id
                                        ? "bg-primary text-black"
                                        : "hover:bg-white/5 text-white"
                                )}
                            >
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                                    selectedStudent?.id === student.id ? "bg-black/20" : "bg-white/10"
                                )}>
                                    {student.photo_base64 ? (
                                        <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-bold">{getInitials(student)}</span>
                                    )}
                                </div>
                                <span className="text-xs font-bold truncate">{student.prenom}</span>
                            </button>
                        ))}
                        {students.length === 0 && selectedGroupId && (
                            <p className="text-xs text-grey-medium p-2">Aucun élève</p>
                        )}
                    </div>
                </div>

                {/* Column 2: Modules */}
                <div className="w-[140px] bg-surface/50 border-r border-white/10 overflow-y-auto">
                    <div className="p-2 border-b border-white/10 bg-surface sticky top-0 z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Modules</span>
                    </div>
                    <div className="p-1">
                        {modules.map(module => (
                            <button
                                key={module.id}
                                onClick={() => setSelectedModule(module)}
                                className={clsx(
                                    "w-full p-2 rounded-lg transition-all mb-1 text-left",
                                    selectedModule?.id === module.id
                                        ? "bg-primary text-black"
                                        : "hover:bg-white/5 text-white"
                                )}
                            >
                                <span className="text-xs font-bold line-clamp-2">{module.nom}</span>
                                <div className="flex items-center gap-1 mt-1">
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-success"
                                            style={{ width: `${module.percent}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-grey-medium">{module.completed}/{module.total}</span>
                                </div>
                            </button>
                        ))}
                        {modules.length === 0 && selectedStudent && (
                            <p className="text-xs text-grey-medium p-2">Aucun module en cours</p>
                        )}
                    </div>
                </div>

                {/* Column 3: Activities */}
                <div className="flex-1 bg-background overflow-y-auto">
                    <div className="p-2 border-b border-white/10 bg-surface sticky top-0 z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                            Activités {selectedModule ? `- ${selectedModule.nom}` : ''}
                        </span>
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-2">
                        {activities.map(activity => {
                            const status = progressions[activity.id];
                            return (
                                <button
                                    key={activity.id}
                                    onClick={() => handleStatusClick(activity.id, status)}
                                    className={clsx(
                                        "p-3 rounded-xl transition-all active:scale-95 flex items-center gap-3 min-h-[60px]",
                                        getStatusStyle(status),
                                        !status && "border border-white/10"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                                        {getStatusIcon(status)}
                                    </div>
                                    <span className="text-sm font-bold text-left line-clamp-2">{activity.titre}</span>
                                </button>
                            );
                        })}
                        {activities.length === 0 && selectedModule && (
                            <p className="text-grey-medium col-span-2 text-center py-8">
                                Sélectionnez un module pour voir les activités
                            </p>
                        )}
                        {!selectedModule && selectedStudent && (
                            <p className="text-grey-medium col-span-2 text-center py-8">
                                Sélectionnez un module
                            </p>
                        )}
                        {!selectedStudent && (
                            <p className="text-grey-medium col-span-2 text-center py-8">
                                Sélectionnez un élève puis un module
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuiviGlobalTablet;
