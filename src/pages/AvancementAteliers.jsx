import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { checkOverdueActivities } from '../lib/overdueLogic';
import { getInitials, getStatusColorClasses } from '../lib/utils';
import { BookOpen, Calendar, ChevronDown, Clock, Search, FileText, Loader2, Users, Check, AlertCircle, Home, GitBranch, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import AvancementPDF from '../components/AvancementPDF';

const AvancementAteliers = () => {
    // --- STATE ---
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const [modules, setModules] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState('');

    // Branch filter (optional)
    const [branches, setBranches] = useState([]);
    const [selectedBrancheId, setSelectedBrancheId] = useState('');

    // Date de fin filter/selector
    const [selectedDateFin, setSelectedDateFin] = useState('');
    const [dateOperator, setDateOperator] = useState('eq'); // 'eq', 'lt', 'gt'

    const [students, setStudents] = useState([]);
    const [activities, setActivities] = useState([]);
    const [progressions, setProgressions] = useState({}); // Map: `${ studentId } -${ activityId } ` -> status

    const [loading, setLoading] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [studentIndices, setStudentIndices] = useState({}); // { studentId: { branchId: value } }

    // --- INITIAL LOAD ---
    useEffect(() => {
        const loadInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Ensure overdue activities are marked as 'a_domicile' before view
                await checkOverdueActivities(session.user.id);
            }
            fetchGroups();
            fetchBranches();
            fetchModules();
        };

        loadInitialData();
    }, []);

    // --- DATA FETCHING ---
    const fetchGroups = async () => {
        const { data } = await supabase.from('Groupe').select('*').order('nom');
        setGroups(data || []);
    };

    const fetchModules = async () => {
        const { data } = await supabase
            .from('Module')
            .select('*, SousBranche(id, nom, ordre, Branche(id, nom, ordre))')
            .eq('statut', 'en_cours');

        const sorted = (data || []).sort((a, b) => {
            // 1. Date de fin (nulls at the end)
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

            // 4. Alphabetical (Orthographe)
            return a.nom.localeCompare(b.nom);
        });

        setModules(sorted);
    };

    const fetchBranches = async () => {
        const { data } = await supabase.from('Branche').select('*').order('ordre');
        setBranches(data || []);
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
                    .select('*, Niveau(ordre, nom)')
                    .in('id', eleveIds);

                // Sort: Niveau order -> Prenom -> Nom
                const sortedStudents = (data || []).sort((a, b) => {
                    const levelA = a.Niveau?.ordre || 0;
                    const levelB = b.Niveau?.ordre || 0;
                    if (levelA !== levelB) return levelA - levelB;

                    const prenomA = (a.prenom || '').toLowerCase();
                    const prenomB = (b.prenom || '').toLowerCase();
                    if (prenomA !== prenomB) return prenomA.localeCompare(prenomB);

                    return (a.nom || '').localeCompare(b.nom || '');
                });

                setStudents(sortedStudents);
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

    // Helper to filter modules based on selected branch
    const isModuleInBranch = (m) => {
        if (!selectedBrancheId) return true; // No branch filter
        return m.SousBranche?.Branche?.id === selectedBrancheId;
    };

    // Combined filter for modules
    const getFilteredModules = () => {
        return modules.filter(m => isModuleInDateRange(m) && isModuleInBranch(m));
    };

    // Effect: Load activities and progressions when Module or Students change
    useEffect(() => {
        if (selectedModuleId) {
            fetchActivitiesAndProgress([selectedModuleId]);
        } else if (selectedDateFin || selectedBrancheId) {
            // No specific module selected, but date or branch is selected -> Select all matching modules
            const filteredModules = getFilteredModules();
            const moduleIds = filteredModules.map(m => m.id);

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
    }, [selectedModuleId, selectedDateFin, dateOperator, selectedBrancheId, modules, students]);

    const fetchActivitiesAndProgress = async (moduleIds) => {
        setLoading(true);
        try {
            // 1. Fetch Activities with full Module context for sorting
            const { data: acts } = await supabase
                .from('Activite')
                .select(`
    *,
    Module(
        id,
        nom,
        date_fin,
        SousBranche(
            id,
            nom,
            ordre,
            Branche(
                id,
                nom,
                ordre
            )
        )
    ),
    ActiviteNiveau(niveau_id)
        `)
                .in('module_id', moduleIds);

            // 2. Complex sort: Module criteria then Activity order
            const sortedActs = (acts || []).sort((a, b) => {
                const modA = a.Module;
                const modB = b.Module;

                if (modA?.id !== modB?.id) {
                    // 2.1 Date de fin
                    if (modA?.date_fin !== modB?.date_fin) {
                        if (!modA?.date_fin) return 1;
                        if (!modB?.date_fin) return -1;
                        return modA.date_fin.localeCompare(modB.date_fin);
                    }

                    // 2.2 Branche
                    const aB = modA?.SousBranche?.Branche;
                    const bB = modB?.SousBranche?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    if (aB?.nom !== bB?.nom) return (aB?.nom || '').localeCompare(bB?.nom || '');

                    // 2.3 Sous-Branche
                    const aSB = modA?.SousBranche;
                    const bSB = modB?.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    if (aSB?.nom !== bSB?.nom) return (aSB?.nom || '').localeCompare(bSB?.nom || '');

                    // 2.4 Module Name
                    const aNom = modA?.nom || '';
                    const bNom = modB?.nom || '';
                    if (aNom !== bNom) return aNom.localeCompare(bNom);
                }

                // Within same module, sort by activity order
                return (a.ordre || 0) - (b.ordre || 0);
            });

            // 2. Fetch Progressions if we have students and activities
            if (students.length > 0 && sortedActs.length > 0) {
                const studentIds = students.map(s => s.id);
                const actIds = sortedActs.map(a => a.id);

                const { data: progs } = await supabase
                    .from('Progression')
                    .select('eleve_id, activite_id, etat')
                    .in('eleve_id', studentIds)
                    .in('activite_id', actIds);

                // Filter Logic: Keep activities relevant to ANY student in the group
                // If activity has NO levels defined, we assume it's strict (hidden).
                // We check if the activity's levels intersect with the group's student levels.
                const groupLevelIds = new Set(students.map(s => s.niveau_id).filter(Boolean));

                const filteredActs = sortedActs.filter(a => {
                    const actLevels = a.ActiviteNiveau?.map(an => an.niveau_id) || [];
                    if (actLevels.length === 0) return false; // Strict: if no levels, hide
                    return actLevels.some(id => groupLevelIds.has(id));
                });

                setActivities(filteredActs);

                const progMap = {};
                progs?.forEach(p => {
                    progMap[`${p.eleve_id}-${p.activite_id}`] = p.etat;
                });
                setProgressions(progMap);
            } else {
                setActivities([]);
                setProgressions({});
            }
        } catch (error) {
            console.error('Error fetching activities/progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusClick = async (student, activity) => {
        // Level Restriction Check
        const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];
        // Strict matching: If activity has no levels or student doesn't match, block it.
        // Assuming if activityLevels is empty = strictly restricted (as per Suivi logic).
        // If your logic is "Empty = Open to all", change this condition.
        // Based on SuiviPedagogique: "if (activityLevels.length === 0) return false;"
        const isAllowed = activityLevels.length > 0 && student.niveau_id && activityLevels.includes(student.niveau_id);

        if (!isAllowed) {
            // Optional: toast.info("Activité non disponible pour ce niveau");
            return;
        }

        const currentStatus = progressions[`${student.id}-${activity.id}`] || 'a_commencer';
        let nextStatus = 'termine';

        // Cycle: a_commencer -> besoin_d_aide -> termine -> a_commencer
        if (currentStatus === 'a_commencer') nextStatus = 'besoin_d_aide';
        else if (currentStatus === 'besoin_d_aide') nextStatus = 'termine';
        else if (currentStatus === 'termine' || currentStatus === 'a_verifier') nextStatus = 'a_commencer';

        // Auto-Verification Logic
        if (nextStatus === 'termine') {
            const branchId = activity.Module?.SousBranche?.Branche?.id;
            const studentIndex = studentIndices[student.id]?.[branchId] ?? 50; // Default 50
            const roll = Math.random() * 100;

            // If roll is LESS than index, trigger verification
            // High index = High chance of verif? User said: "Si ce nombre est inférieur a l'indice... ajouté d'office"
            // So if Index is 80, Rolls 0-79 trigger it (80% chance).
            // Logic: High Index = Need more monitoring. Correct.

            if (roll < studentIndex) {
                nextStatus = 'a_verifier';
                toast("Verif. requise (Auto)", { description: "L'élève a été ajouté à la liste de vérification." });
            }
        }

        // Optimistic Update
        const key = `${student.id}-${activity.id}`;
        setProgressions(prev => ({ ...prev, [key]: nextStatus }));

        // DB Update
        const { error } = await supabase
            .from('Progression')
            .upsert({
                eleve_id: student.id,
                activite_id: activity.id,
                etat: nextStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'eleve_id, activite_id' });

        if (error) {
            console.error("Error updating status:", error);
            toast.error("Erreur de sauvegarde");
            setProgressions(prev => ({ ...prev, [key]: currentStatus })); // Revert
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'termine': return <Check size={14} />;
            case 'besoin_d_aide': return <AlertCircle size={14} />;
            case 'a_verifier': return <ShieldCheck size={14} />;
            case 'a_domicile': return <Home size={14} />;
            case 'a_commencer': return <div className="w-1.5 h-1.5 rounded-full bg-white/30" />;
            default: return null;
        }
    };

    const getStatusColorClasses = (status) => {
        switch (status) {
            case 'termine': return "bg-success border-success text-white";
            case 'besoin_d_aide': return "bg-[#A0A8AD] border-[#A0A8AD] text-white";
            case 'a_verifier': return "bg-[#8B5CF6] border-[#8B5CF6] text-white"; // Violet
            case 'a_domicile': return "bg-danger border-danger text-white";
            case 'a_commencer': return "bg-white/5 border-white/10 text-grey-medium hover:bg-white/10";
            default: return "bg-transparent border-transparent text-transparent"; // Completely invisible for undefined/null
        }
    };

    // --- UI HELPERS ---
    const moduleSpans = React.useMemo(() => {
        const spans = [];
        if (activities.length === 0) return spans;

        let currentModuleId = null;
        let currentSpan = { id: null, nom: '', count: 0 };

        activities.forEach(act => {
            const modId = act.Module?.id;
            const modNom = act.Module?.nom;

            if (modId !== currentModuleId) {
                if (currentSpan.count > 0) {
                    spans.push(currentSpan);
                }
                currentModuleId = modId;
                currentSpan = { id: modId, nom: modNom, count: 1 };
            } else {
                currentSpan.count++;
            }
        });

        if (currentSpan.count > 0) {
            spans.push(currentSpan);
        }

        return spans;
    }, [activities]);

    // Map of last activity ID for each module to draw separator line
    const lastActivityIds = React.useMemo(() => {
        const lastIds = new Set();
        // Identify the very last activity of the currently displayed list
        const gridLastActivityId = activities.length > 0 ? activities[activities.length - 1].id : null;

        moduleSpans.forEach(span => {
            // Find the last activity for this module
            const moduleActivities = activities.filter(a => a.Module?.id === span.id);
            if (moduleActivities.length > 0) {
                const lastId = moduleActivities[moduleActivities.length - 1].id;
                // Only add separator if it's NOT the last activity of the entire grid
                if (lastId !== gridLastActivityId) {
                    lastIds.add(lastId);
                }
            }
        });
        return lastIds;
    }, [moduleSpans, activities]);

    const handleGeneratePDF = async () => {
        if (students.length === 0 || activities.length === 0) {
            alert('Veuillez sélectionner un groupe et un module/date avec des données.');
            return;
        }

        const selectedGroup = groups.find(g => g.id === selectedGroupId);
        const selectedModule = modules.find(m => m.id === selectedModuleId);
        const filename = `Avancement_${selectedGroup?.nom || 'Groupe'}_${new Date().toISOString().split('T')[0]}.pdf`;

        let fileHandle = null;

        // 1. Try to open Save Dialog immediately (User Gesture context)
        if (window.showSaveFilePicker) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
            } catch (err) {
                // If user cancelled, stop everything
                if (err.name === 'AbortError') return;
                // Otherwise continue and try fallback later
                console.warn('File picker failed, falling back to download', err);
            }
        }

        setGeneratingPDF(true);
        try {
            const blob = await pdf(
                <AvancementPDF
                    students={students}
                    activities={activities}
                    progressions={progressions}
                    groupName={selectedGroup?.nom}
                    moduleName={selectedModule?.nom}
                    branchName={branches.find(b => b.id === selectedBrancheId)?.nom}
                    date={selectedDateFin}
                    dateOperator={dateOperator}
                />
            ).toBlob();

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                saveAs(blob, filename);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF.');
        } finally {
            setGeneratingPDF(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-background p-6 space-y-6 overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BookOpen className="text-primary" />
                    Avancement des Ateliers
                </h1>

                {/* PDF Export Button */}
                <button
                    onClick={handleGeneratePDF}
                    disabled={generatingPDF || students.length === 0 || activities.length === 0}
                    className={clsx(
                        "px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg",
                        students.length === 0 || activities.length === 0
                            ? "bg-white/5 text-grey-medium cursor-not-allowed"
                            : "bg-primary hover:bg-primary/90 text-black hover:scale-105"
                    )}
                >
                    {generatingPDF ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <FileText size={18} />
                    )}
                    <span className="text-sm uppercase tracking-wider">
                        {generatingPDF ? 'Génération...' : 'Exporter PDF'}
                    </span>
                </button>
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

                {/* 4. Branch Selector (Optional) */}
                <div className="min-w-[180px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Branche <span className="text-grey-dark">(facultatif)</span>
                    </label>
                    <div className="relative">
                        <select
                            value={selectedBrancheId}
                            onChange={(e) => {
                                setSelectedBrancheId(e.target.value);
                                setSelectedModuleId(''); // Reset module when branch changes
                            }}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">Toutes les branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.nom}</option>
                            ))}
                        </select>
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 5. Module Selector (Filtered by Date and Branch if selected) */}
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
                                {(selectedDateFin || selectedBrancheId)
                                    ? `Tous les modules(${getFilteredModules().length})`
                                    : "Sélectionner un module..."}
                            </option>
                            {getFilteredModules().map(m => (
                                <option key={m.id} value={m.id}>{m.nom}</option>
                            ))}
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
                        <table className="w-max border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20 bg-surface shadow-sm">
                                {/* Row 1: Module Capsules (Only if we have multiple modules or not a single module selection) */}
                                {
                                    moduleSpans.length > 0 && (
                                        <tr className="border-b border-white/10">
                                            <th className="sticky left-0 top-0 z-40 bg-surface border-r border-white/10 h-12 min-w-[150px]"></th>
                                            {moduleSpans.map((span, sIdx) => (
                                                <th
                                                    key={`${span.id}-${sIdx}`}
                                                    colSpan={span.count}
                                                    className="sticky top-0 z-30 p-2 bg-surface"
                                                >
                                                    <div className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap mx-1">
                                                        {span.nom}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    )
                                }
                                <tr className="border-b border-white/10">
                                    {/* Sticky First Column Header (Student Name) */}
                                    <th className="sticky left-0 top-[48px] z-30 bg-surface p-4 text-left min-w-[150px] border-r border-white/10 border-b border-white/10 h-full">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Élève</span>
                                    </th>
                                    {/* Activity Headers */}
                                    {activities.map((act) => (
                                        <th key={act.id} className={clsx(
                                            "sticky top-[48px] z-20 p-0 min-w-[52px] align-bottom pb-2 relative group/th bg-surface vertical-header border-b border-white/10",
                                            lastActivityIds.has(act.id) && "border-r border-white/10"
                                        )}>
                                            <div className="flex flex-col items-center justify-end h-[100px] w-full">
                                                <span className="text-[10px] font-medium text-grey-light uppercase tracking-wide leading-tight [writing-mode:vertical-rl] rotate-180 whitespace-nowrap" title={act.titre}>
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
                                        <td className="sticky left-0 z-10 bg-surface group-hover:bg-surface-light p-3 min-w-[150px] border-r border-white/10 border-t border-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                                    {student.photo_base64 ? (
                                                        <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-primary">{getInitials(student)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-white whitespace-nowrap" title={`${student.prenom} ${student.nom} `}>
                                                        {student.prenom} {student.nom?.[0]}.
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Activity Cells */}
                                        {activities.map((act) => {
                                            const status = progressions[`${student.id}-${act.id}`];
                                            const activityLevels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                                            const isAllowed = activityLevels.length > 0 && student.niveau_id && activityLevels.includes(student.niveau_id);

                                            // Determine visual status: use actual status, or 'a_commencer' if allowed but empty
                                            const displayStatus = status || (isAllowed ? 'a_commencer' : null);

                                            return (
                                                <td
                                                    key={`${student.id}-${act.id}`}
                                                    onClick={() => handleStatusClick(student, act)}
                                                    className={clsx(
                                                        "p-0 border-t border-white/10 relative group/cell transition-colors min-w-[52px]",
                                                        isAllowed ? "cursor-pointer hover:bg-white/5" : "cursor-default",
                                                        lastActivityIds.has(act.id) && "border-r border-white/10"
                                                    )}
                                                >
                                                    <div className="w-full h-[52px] flex items-center justify-center">
                                                        {isAllowed ? (
                                                            <div className={clsx(
                                                                "w-10 h-10 flex items-center justify-center transition-all rounded-lg",
                                                                getStatusColorClasses(displayStatus),
                                                                !displayStatus && "opacity-0"
                                                            )}>
                                                                {getStatusIcon(displayStatus)}
                                                            </div>
                                                        ) : (
                                                            // Not Applicable: Grey Square
                                                            <div className="w-full h-full bg-white/5"></div>
                                                        )}
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

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-6 px-4 py-3 bg-white/5 rounded-xl border border-white/10 w-fit mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-success flex items-center justify-center text-white">
                            <Check size={10} />
                        </div>
                        <span className="text-xs font-medium text-grey-light">Terminé</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#A0A8AD] flex items-center justify-center text-white">
                            <AlertCircle size={10} />
                        </div>
                        <span className="text-xs font-medium text-grey-light">Besoin d'aide</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-danger flex items-center justify-center text-white">
                            <Home size={10} />
                        </div>
                        <span className="text-xs font-medium text-grey-light">À domicile (Retard)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#8B5CF6] flex items-center justify-center text-white">
                            <ShieldCheck size={10} />
                        </div>
                        <span className="text-xs font-medium text-grey-light">À Vérifier</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvancementAteliers;
