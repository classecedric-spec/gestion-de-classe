import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getInitials, getStatusColorClasses } from '../lib/utils';
import { Users, BookOpen, Calendar, Check, AlertCircle, Clock, Search, ChevronDown, Filter } from 'lucide-react';
import clsx from 'clsx';

const AvancementAteliers = () => {
    // --- STATE ---
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const [modules, setModules] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState('');

    // Date de fin filter/selector
    const [selectedDateFin, setSelectedDateFin] = useState('');
    const [dateOperator, setDateOperator] = useState('eq'); // 'eq', 'lt', 'gt'

    const [students, setStudents] = useState([]);
    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({}); // Map: `${studentId}-${activityId}` -> status

    const [loading, setLoading] = useState(false);

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchGroups();
        fetchModules();
    }, []);

    // --- DATA FETCHING ---
    const fetchGroups = async () => {
        const { data } = await supabase.from('Groupe').select('*').order('nom');
        setGroups(data || []);
    };

    const fetchModules = async () => {
        const { data } = await supabase.from('Module').select('*').eq('statut', 'en_cours').order('nom');
        setModules(data || []);
    };

    // Effect: Load students when Group changes
    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
        } else {
            setStudents([]);
        }
    }, [selectedGroupId]);

    const fetchStudents = async (groupId) => {
        setLoading(true);
        try {
            // Fetch students in the group
            const { data: eleveIdsData } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            const eleveIds = eleveIdsData?.map(e => e.eleve_id) || [];

            if (eleveIds.length > 0) {
                const { data } = await supabase
                    .from('Eleve')
                    .select('*')
                    .in('id', eleveIds)
                    .order('nom');
                setStudents(data || []);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to filter modules based on date operator
    const isModuleInDateRange = (m) => {
        if (!selectedDateFin) return true;

        // Handle null dates if necessary, but assuming date_fin exists for 'en_cours' usually
        if (!m.date_fin) return false;

        const mDate = new Date(m.date_fin);
        const sDate = new Date(selectedDateFin);

        // Create pure date objects for comparison (ignoring time)
        const mTime = new Date(mDate.getFullYear(), mDate.getMonth(), mDate.getDate()).getTime();
        const sTime = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();

        if (dateOperator === 'lt') return mTime < sTime;
        if (dateOperator === 'lte') return mTime <= sTime; // Pour ou avant le
        if (dateOperator === 'gt') return mTime > sTime;
        return mTime === sTime; // 'eq'
    };

    // Effect: Load activities and progressions when Module or Students change
    useEffect(() => {
        if (selectedModuleId) {
            fetchActivitiesAndProgress([selectedModuleId]);
        } else if (selectedDateFin) {
            // No specific module selected, but date is selected -> Select all matching modules
            const modulesForDate = modules.filter(isModuleInDateRange);
            const moduleIds = modulesForDate.map(m => m.id);

            // Only fetch if we have matching modules, otherwise clear
            if (moduleIds.length > 0) {
                fetchActivitiesAndProgress(moduleIds);
            } else {
                setActivities([]);
                setProgressions({});
            }
        } else {
            setActivities([]);
            setProgressions({});
        }
    }, [selectedModuleId, selectedDateFin, dateOperator, modules, students]); // Added dateOperator dep

    const fetchActivitiesAndProgress = async (moduleIds) => {
        setLoading(true);
        try {
            // 1. Fetch Activities
            const { data: acts } = await supabase
                .from('Activite')
                .select('*, Module(nom)') // Fetch Module name for grouping/display
                .in('module_id', moduleIds)
                .order('module_id', { ascending: true }) // Sort by Module first (arbitrary but groups them)
                .order('ordre', { ascending: true }); // Then by Activity Order

            // Note: If we really want to sort modules by name or other critera, we might need client-side sort
            // But let's assume module_id grouping is sufficient, or we sort acts client side:
            const sortedActs = (acts || []).sort((a, b) => {
                // Sort by Module Name first if we have multiple modules
                if (a.Module?.nom !== b.Module?.nom) {
                    return (a.Module?.nom || '').localeCompare(b.Module?.nom || '');
                }
                return (a.ordre || 0) - (b.ordre || 0);
            });

            setActivities(sortedActs);

            // 2. Fetch Progressions if we have students and activities
            if (students.length > 0 && sortedActs.length > 0) {
                const studentIds = students.map(s => s.id);
                const actIds = sortedActs.map(a => a.id);

                const { data: progs } = await supabase
                    .from('Progression')
                    .select('eleve_id, activite_id, etat')
                    .in('eleve_id', studentIds)
                    .in('activite_id', actIds);

                const progMap = {};
                progs?.forEach(p => {
                    progMap[`${p.eleve_id}-${p.activite_id}`] = p.etat;
                });
                setProgressions(progMap);
            } else {
                setProgressions({});
            }
        } catch (error) {
            console.error('Error fetching activities/progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'termine': return <Check size={14} />;
            case 'besoin_d_aide': return <AlertCircle size={14} />;
            case 'en_cours': return <Clock size={14} />;
            default: return null;
        }
    };


    return (
        <div className="flex flex-col h-full bg-background p-6 space-y-6 overflow-hidden">
            {/* HERADER */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BookOpen className="text-primary" />
                    Avancement des Ateliers
                </h1>
            </div>

            {/* FILTERS BAR */}
            <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border border-white/5 shadow-lg">

                {/* 1. Group Selector */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Groupe
                    </label>
                    <div className="relative">
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">Sélectionner un groupe...</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.nom}</option>
                            ))}
                        </select>
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 2. Operator Selector */}
                <div className="w-[160px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Critère Date
                    </label>
                    <div className="relative">
                        <select
                            value={dateOperator}
                            onChange={(e) => {
                                setDateOperator(e.target.value);
                                setSelectedModuleId(''); // Reset module selection
                            }}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-3 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="lt">Avant le</option>
                            <option value="lte">Pour ou avant</option>
                            <option value="eq">Pour le</option>
                            <option value="gt">Après le</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 3. Date Selector */}
                <div className="min-w-[200px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Date de fin
                    </label>
                    <div className="relative">
                        <select
                            value={selectedDateFin}
                            onChange={(e) => {
                                setSelectedDateFin(e.target.value);
                                setSelectedModuleId(''); // Reset module selection on date change
                            }}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">Toutes les dates</option>
                            {[...new Set(modules.map(m => m.date_fin).filter(d => d))].sort().map(date => (
                                <option key={date} value={date}>
                                    {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 3. Module Selector (Filtered by Date if selected) */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Module
                    </label>
                    <div className="relative">
                        <select
                            value={selectedModuleId}
                            onChange={(e) => setSelectedModuleId(e.target.value)}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">
                                {selectedDateFin
                                    ? `Tous les modules (${modules.filter(isModuleInDateRange).length})`
                                    : "Sélectionner un module..."}
                            </option>
                            {modules
                                .filter(isModuleInDateRange)
                                .map(m => (
                                    <option key={m.id} value={m.id}>{m.nom}</option>
                                ))
                            }
                        </select>
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* MAIN TABLE CONTENT */}
            <div className="flex-1 bg-surface rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
                {/* SCROLLABLE AREA */}
                <div className="overflow-auto flex-1 custom-scrollbar">
                    {!selectedGroupId || (!selectedModuleId && !selectedDateFin) ? (
                        <div className="h-full flex flex-col items-center justify-center text-grey-medium gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <Search size={32} opacity={0.5} />
                            </div>
                            <p>Veuillez sélectionner un groupe et une date (ou un module) pour voir l'avancement.</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-grey-medium">
                            <p>Aucun élève dans ce groupe.</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse min-w-max">
                            <thead className="sticky top-0 z-20 bg-surface shadow-sm">
                                <tr>
                                    {/* Sticky First Column Header (Student Name) */}
                                    <th className="sticky left-0 z-30 bg-surface p-4 text-left border-b border-border/10 min-w-[200px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Élève</span>
                                    </th>
                                    {/* Activity Headers with Module Grouping indication if multiple modules */}
                                    {activities.map((act, idx) => (
                                        <th key={act.id} className="p-4 border-b border-border/10 min-w-[120px] max-w-[150px] align-bottom pb-6 relative group/th">
                                            {/* Module Name Tooltip/Label if strict grouping needed, for now just simplistic layout */}
                                            {(!selectedModuleId && selectedDateFin) && (
                                                <div className="absolute top-0 left-0 w-full text-[9px] text-grey-medium/50 text-center uppercase tracking-widest pt-1 px-1 truncate">
                                                    {act.Module?.nom}
                                                </div>
                                            )}

                                            <div className="flex flex-col items-center gap-2 mt-4">
                                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-grey-medium border border-white/10 group-hover/th:bg-primary/20 group-hover/th:text-primary group-hover/th:border-primary/50 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-[10px] font-medium text-grey-light uppercase tracking-wide text-center leading-tight line-clamp-2" title={`${act.Module?.nom} - ${act.titre}`}>
                                                    {act.titre}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="group hover:bg-white/5 transition-colors">
                                        {/* Sticky Student Name Column */}
                                        <td className="sticky left-0 z-10 bg-surface group-hover:bg-surface-light p-3 border-b border-white/5 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                                    {student.photo_base64 ? (
                                                        <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-primary">{getInitials(student)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-white truncate max-w-[150px]">
                                                        {student.prenom} {student.nom}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status Cells */}
                                        {activities.map(act => {
                                            const status = progressions[`${student.id}-${act.id}`]; // undefined, 'a_commencer', 'en_cours', 'besoin_d_aide', 'termine'
                                            // Provide visual feedback for status
                                            // We could also make this clickable later
                                            return (
                                                <td key={act.id} className="p-2 border-b border-white/5 text-center bg-transparent relative">
                                                    <div className={clsx(
                                                        "w-full h-10 rounded-lg flex items-center justify-center border transition-all",
                                                        getStatusColorClasses(status)
                                                    )}>
                                                        {getStatusIcon(status) || <span className="w-1.5 h-1.5 rounded-full bg-white/10" />}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvancementAteliers;
