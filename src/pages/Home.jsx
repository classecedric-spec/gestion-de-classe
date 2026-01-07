import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchStudentPdfData } from '../lib/pdfUtils';
import { User, Users, GraduationCap, LayoutList, FileText, CheckSquare, ChevronDown, Clock, Search, Loader2, TrendingUp, Calendar, AlertCircle, CheckCircle2, MoreHorizontal, ChevronRight, Filter, Settings2, Activity } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb } from 'pdf-lib';
import StudentTrackingPDFModern from '../components/StudentTrackingPDFModern';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { getInitials, formatDateFR } from '../lib/utils';

const Home = () => {
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [currentTab, setCurrentTab] = useState('overview'); // 'overview', 'students', 'analytics', 'tools'
    const [dashboardData, setDashboardData] = useState({
        stats: {
            totalStudents: 0,
            attendanceRate: 0,
            progressionRate: 0,
            monthlyActions: 0
        },
        birthdays: [],
        recentActivity: [],
        priorityStudents: [],
        immobileStudents: [],
        progressionDistribution: [],
        branchStats: [],
        suggestions: [],
        yesterdayAbsentees: []
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const abortRef = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleEsc = (e) => {
            if (isGenerating && e.key === 'Escape') {
                handleCancelGeneration();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isGenerating]);

    const handleCancelGeneration = () => {
        if (isGenerating) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    setLoadingStats(true);
                    // Fetch Students with Levels
                    const { data: studentsData, error: studentsError } = await supabase
                        .from('Eleve')
                        .select('*, Niveau(nom, ordre), Classe(nom)')
                        .eq('titulaire_id', user.id);

                    if (!studentsError) setStudents(studentsData || []);

                    // Fetch Groups
                    const { data: groupsData, error: groupsError } = await supabase
                        .from('Groupe')
                        .select('*')
                        .order('nom');

                    if (!groupsError) {
                        setGroups(groupsData || []);
                        if (groupsData?.length > 0) setSelectedGroup(groupsData[0]);
                    }

                    // --- Dashboard Specific Data ---
                    await fetchDashboardDetails(user.id, studentsData || []);
                }
            } catch (err) {
            } finally {
                setLoading(false);
                setLoadingStats(false);
            }
        };

        fetchData();
    }, []);

    const fetchDashboardDetails = async (userId, allStudents) => {
        const today = new Date().toISOString().split('T')[0];
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastWeekISO = lastWeek.toISOString();

        try {
            // 1. Attendance Today
            const { data: attendanceData } = await supabase
                .from('Attendance')
                .select('status')
                .eq('date', today)
                .in('eleve_id', allStudents.map(s => s.id));

            const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
            const attendanceRate = allStudents.length > 0 ? Math.round((presentCount / allStudents.length) * 100) : 0;

            // 2. Recent Activity (last 5)
            const { data: recentActivity } = await supabase
                .from('Progression')
                .select('*, Eleve(prenom, nom, photo_base64), Activite(titre)')
                .in('eleve_id', allStudents.map(s => s.id))
                .order('updated_at', { ascending: false })
                .limit(5);

            // 3. Monthly Actions & Progression Rate
            const firstOfMonth = new Date();
            firstOfMonth.setDate(1);
            const { data: monthlyData } = await supabase
                .from('Progression')
                .select('id')
                .in('eleve_id', allStudents.map(s => s.id))
                .gte('updated_at', firstOfMonth.toISOString());

            // Global Progression (terminé vs total expected roughly)
            const { data: progressionAll } = await supabase
                .from('Progression')
                .select('etat')
                .in('eleve_id', allStudents.map(s => s.id));

            const totalDone = progressionAll?.filter(p => p.etat === 'termine' || p.etat === 'a_verifier').length || 0;
            // estimate total activities per year/level? Let's say per student 50 activities for now as dynamic base
            const progressionRate = allStudents.length > 0 ? Math.round((totalDone / (allStudents.length * 60)) * 100) : 0;

            // 4. Birthdays
            const currentMonth = new Date().getMonth() + 1;
            const birthdays = allStudents.filter(s => {
                if (!s.date_naissance) return false;
                const d = new Date(s.date_naissance);
                return (d.getMonth() + 1) === currentMonth;
            }).sort((a, b) => new Date(a.date_naissance).getDate() - new Date(b.date_naissance).getDate());

            // 5. Immobile Students (No activity in last 7 days)
            // Get last update for each student
            const immobileStudents = allStudents.filter(s => {
                const studentActivity = progressionAll?.filter(p => p.eleve_id === s.id);
                if (!studentActivity || studentActivity.length === 0) return true;
                const lastUpdate = new Date(Math.max(...studentActivity.map(p => new Date(p.updated_at))));
                return lastUpdate < lastWeek;
            });

            // 6. Distribution
            const states = { termine: 0, a_verifier: 0, en_cours: 0, besoin_d_aide: 0 };
            progressionAll?.forEach(p => { if (states[p.etat] !== undefined) states[p.etat]++; });
            const distribution = Object.entries(states).map(([name, value]) => ({ name, value }));

            // 7. Branch Distribution
            const { data: branchData } = await supabase
                .from('Progression')
                .select('Activite(Module(SousBranche(Branche(nom)))))')
                .in('eleve_id', allStudents.map(s => s.id))
                .not('etat', 'eq', 'non_commence');

            const branchCounts = {};
            branchData?.forEach(p => {
                const bNom = p.Activite?.Module?.SousBranche?.Branche?.nom || "Inconnu";
                branchCounts[bNom] = (branchCounts[bNom] || 0) + 1;
            });
            const branchStats = Object.entries(branchCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            // 8. Suggestions Logic
            const suggestions = [];
            // Suggestion 1: High potential for validation (students with many 'en_cours')
            const enCoursStudents = allStudents.map(s => {
                const count = progressionAll?.filter(p => p.eleve_id === s.id && p.etat === 'en_cours').length || 0;
                return { ...s, enCoursCount: count };
            }).filter(s => s.enCoursCount > 3).sort((a, b) => b.enCoursCount - a.enCoursCount).slice(0, 3);

            enCoursStudents.forEach(s => {
                suggestions.push({
                    type: 'presentation',
                    title: `Présentation à valider: ${s.prenom}`,
                    desc: `${s.enCoursCount} activités en cours. Un petit coup de pouce ?`,
                    student: s
                });
            });

            // Suggestion 2: Subject Focus
            if (branchStats.length > 2) {
                const leastActive = branchStats[branchStats.length - 1];
                suggestions.push({
                    type: 'focus',
                    title: `Focus: ${leastActive.name}`,
                    desc: `C'est le domaine le moins travaillé actuellement.`,
                    color: 'text-amber-500'
                });
            }

            // 9. Yesterday's Absentees
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayISO = yesterday.toISOString().split('T')[0];

            const { data: yesterdayData } = await supabase
                .from('Attendance')
                .select('eleve_id, status')
                .eq('date', yesterdayISO)
                .eq('status', 'absent')
                .in('eleve_id', allStudents.map(s => s.id));

            const absentIds = yesterdayData?.map(a => a.eleve_id) || [];
            const absentees = allStudents.filter(s => absentIds.includes(s.id));

            setDashboardData({
                stats: {
                    totalStudents: allStudents.length,
                    attendanceRate,
                    progressionRate: Math.min(100, progressionRate),
                    monthlyActions: monthlyData?.length || 0
                },
                birthdays,
                recentActivity: recentActivity || [],
                priorityStudents: allStudents.filter(s => (s.importance_suivi || 0) > 70),
                immobileStudents: immobileStudents.slice(0, 10),
                progressionDistribution: distribution,
                branchStats: branchStats.slice(0, 6),
                suggestions: suggestions.slice(0, 4),
                yesterdayAbsentees: absentees
            });

        } catch (err) {
            console.error("Error fetching dashboard details:", err);
        }
    };

    const handleGenerateGroupTodoList = async () => {
        if (!selectedGroup) return;

        const ecoMode = true; // Always Eco Mode for Home Quick Access
        const filename = `Listes_Travail_${selectedGroup.nom.replace(/\s+/g, '_')}_ECO.pdf`;
        let fileHandle = null;

        // 1. Try to open Save Dialog immediately
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
                if (err.name === 'AbortError') return;
            }
        }

        setIsGenerating(true);
        abortRef.current = false;
        setProgress(5);
        setProgressText('Récupération des données...');

        try {
            if (abortRef.current) throw new Error('ABORTED');

            // 2. Fetch students in group
            const { data: links } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', selectedGroup.id);

            const studentIds = links?.map(l => l.eleve_id) || [];
            if (studentIds.length === 0) {
                alert("Aucun élève dans ce groupe.");
                setIsGenerating(false);
                return;
            }

            // Fetch students with their level info
            const { data: studentsInGroup } = await supabase
                .from('Eleve')
                .select('id, prenom, nom, niveau_id, Niveau(nom, ordre)')
                .in('id', studentIds);

            // Sort students: Niveau (ordre) -> Prénom -> Nom
            studentsInGroup.sort((a, b) => {
                const levelA = a.Niveau?.ordre || 999;
                const levelB = b.Niveau?.ordre || 999;
                if (levelA !== levelB) return levelA - levelB;

                const prenomCompare = (a.prenom || '').localeCompare(b.prenom || '');
                if (prenomCompare !== 0) return prenomCompare;

                return (a.nom || '').localeCompare(b.nom || '');
            });

            setProgress(10);
            setProgressText('Génération des données par élève...');

            // 3. Fetch PDF data for each student using shared function (SAME as individual PDF)
            const bulkData = [];
            let studentIndex = 0;

            for (const student of studentsInGroup) {
                if (abortRef.current) throw new Error('ABORTED');

                studentIndex++;
                const percentage = 10 + Math.round((studentIndex / studentsInGroup.length) * 30);
                setProgress(percentage);
                setProgressText(`Récupération: ${student.prenom} ${student.nom}...`);

                // Use the SAME function as individual PDF generation
                const pdfData = await fetchStudentPdfData(student.id, student.niveau_id);

                if (pdfData && pdfData.modules.length > 0) {
                    bulkData.push({
                        studentName: `${student.prenom} ${student.nom}`,
                        modules: pdfData.modules,
                        printDate: new Date().toLocaleDateString('fr-FR')
                    });
                }
            }

            if (bulkData.length === 0) {
                alert("Aucun travail à faire trouvé pour ce groupe.");
                setIsGenerating(false);
                return;
            }

            setProgress(10);
            setProgressText('Préparation de la fusion...');
            const mergedPdf = await PDFDocument.create();

            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 10 + Math.round((processed / bulkData.length) * 70);
                setProgress(percentage);
                setProgressText(`Génération : ${studentData.studentName}...`);

                const blob = await pdf(<StudentTrackingPDFModern data={studentData} />).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            // Eco Mode Assembly
            setProgress(82);
            setProgressText('Mise en page LIVRET A5...');
            const bookletPdf = await PDFDocument.create();
            const mergedPdfBytes = await mergedPdf.save();
            const srcDoc = await PDFDocument.load(mergedPdfBytes);
            const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());
            const pageCount = embeddedPages.length;

            for (let i = 0; i < pageCount; i += 2) {
                if (abortRef.current) throw new Error('ABORTED');
                const assemblyPercentage = 82 + Math.round((i / pageCount) * 13);
                setProgress(assemblyPercentage);
                setProgressText(`Assemblage page ${Math.floor(i / 2) + 1}...`);

                const page = bookletPdf.addPage([841.89, 595.28]); // A4 Landscape
                const leftPage = embeddedPages[i];
                page.drawPage(leftPage, { x: 0, y: 0, width: 420.945, height: 595.28 });

                if (i + 1 < pageCount) {
                    const rightPage = embeddedPages[i + 1];
                    page.drawPage(rightPage, { x: 420.945, y: 0, width: 420.945, height: 595.28 });
                }
                page.drawLine({
                    start: { x: 420.945, y: 0 },
                    end: { x: 420.945, y: 595.28 },
                    thickness: 1,
                    color: rgb(0, 0, 0),
                });
            }

            const finalPdfBlob = new Blob([await bookletPdf.save()], { type: 'application/pdf' });

            setProgress(95);
            setProgressText('Sauvegarde...');

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                saveAs(finalPdfBlob, filename);
            }

            setProgress(100);
            setProgressText('Terminé !');
            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
                setProgressText('');
            }, 2000);

        } catch (error) {
            if (error.message !== 'ABORTED') {
                alert("Erreur lors de la génération du PDF.");
            }
        } finally {
            if (!abortRef.current) setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // --- Students Tab Logic ---


    const filteredStudents = students.filter(s =>
        (s.prenom + ' ' + s.nom).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const studentsByLevel = filteredStudents.reduce((acc, student) => {
        const levelName = student.Niveau?.nom || 'Sans Niveau';
        const levelOrder = student.Niveau?.ordre || 999;
        if (!acc[levelName]) acc[levelName] = { students: [], order: levelOrder };
        acc[levelName].students.push(student);
        return acc;
    }, {});

    const sortedLevels = Object.entries(studentsByLevel).sort((a, b) => a[1].order - b[1].order);
    sortedLevels.forEach(([, data]) => {
        data.students.sort((a, b) => a.prenom.localeCompare(b.prenom));
    });

    const handleStudentClick = (student) => {
        navigate('/dashboard/user/students', {
            state: {
                selectedStudentId: student.id,
                initialTab: 'suivi'
            }
        });
    };

    // --- Helper Components ---
    const KPICard = ({ title, value, icon: Icon, color, trend }) => (
        <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-2 rounded-xl", color)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                        <TrendingUp size={12} /> {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-black text-text-main">{value}</p>
            </div>
        </div>
    );

    const ProgressionChart = ({ data }) => {
        const max = Math.max(...data.map(d => d.value), 1);
        return (
            <div className="flex items-end justify-between h-32 gap-2 px-2">
                {data.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full relative flex flex-col justify-end h-full">
                            <div
                                className={clsx(
                                    "w-full rounded-t-lg transition-all duration-500 hover:brightness-110",
                                    item.name === 'termine' ? 'bg-success' :
                                        item.name === 'a_verifier' ? 'bg-primary' :
                                            item.name === 'en_cours' ? 'bg-warning' : 'bg-danger'
                                )}
                                style={{ height: `${(item.value / max) * 100}%` }}
                            >
                                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-text-main text-background text-[10px] font-black px-2 py-1 rounded">
                                    {item.value}
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-grey-medium uppercase tracking-tighter truncate w-full text-center">
                            {item.name.replace('_', ' ')}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-black text-text-main uppercase tracking-tight">Dashboard</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-grey-medium text-sm">
                            {user ? `Bonjour ${user.email.split('@')[0]}` : 'Bienvenue dans votre espace de gestion.'}
                        </p>
                        {currentTab === 'students' && (
                            <div className="relative flex-1 max-w-sm hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-dark" size={14} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un élève..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-surface border border-white/5 rounded-xl pl-10 pr-4 py-1.5 text-xs text-text-main focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="neu-selector-container flex p-1 rounded-xl">
                    {[
                        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutList },
                        { id: 'students', label: 'Élèves', icon: Users },
                        { id: 'analytics', label: 'Analyses', icon: Activity },
                        { id: 'tools', label: 'Outils', icon: Settings2 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentTab(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                currentTab === tab.id ? "bg-primary text-text-dark shadow-lg shadow-primary/20" : "text-grey-medium hover:text-white"
                            )}
                        >
                            <tab.icon size={14} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {
                loadingStats ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4 text-grey-medium">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="font-bold uppercase tracking-widest text-xs">Préparation des données...</p>
                    </div>
                ) : (
                    <>
                        {currentTab === 'overview' && (
                            <div className="space-y-6">
                                {/* KPI Widgets */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <KPICard title="Élèves" value={dashboardData.stats.totalStudents} icon={Users} color="bg-blue-500" />
                                    <KPICard title="Présence" value={`${dashboardData.stats.attendanceRate}%`} icon={CheckCircle2} color="bg-emerald-500" />
                                    <KPICard title="Progression" value={`${dashboardData.stats.progressionRate}%`} icon={TrendingUp} color="bg-amber-500" trend="+2%" />
                                    <KPICard title="Activités (Mois)" value={dashboardData.stats.monthlyActions} icon={Activity} color="bg-rose-500" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left: Today's Feed */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <section className="bg-surface p-6 rounded-2xl border border-white/5">
                                            <div className="flex items-center justify-between mb-6">
                                                <h2 className="text-lg font-bold text-text-main flex items-center gap-3">
                                                    <Clock className="text-primary w-5 h-5" /> Activités Récentes
                                                </h2>
                                                <button onClick={() => navigate('/dashboard/user/suivi-global')} className="text-[10px] font-black uppercase tracking-tighter text-grey-medium hover:text-primary transition-colors">Voir Tout</button>
                                            </div>

                                            <div className="space-y-3">
                                                {dashboardData.recentActivity.map((act) => (
                                                    <div key={act.id} className="group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all">
                                                        <div className="w-10 h-10 rounded-full bg-background border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                            {act.Eleve?.photo_base64 ? (
                                                                <img src={act.Eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs font-black text-primary uppercase">{getInitials(act.Eleve)}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-text-main truncate">
                                                                {act.Eleve?.prenom} {act.Eleve?.nom}
                                                            </p>
                                                            <p className="text-xs text-grey-medium truncate">
                                                                {act.Activite?.titre} • <span className={clsx(
                                                                    "font-bold uppercase tracking-tighter text-[10px]",
                                                                    act.etat === 'termine' ? 'text-success' : 'text-primary'
                                                                )}>{act.etat.replace('_', ' ')}</span>
                                                            </p>
                                                        </div>
                                                        <div className="text-[10px] text-grey-dark font-mono">
                                                            {new Date(act.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <section className="bg-surface p-6 rounded-2xl border border-white/5">
                                                <h2 className="text-lg font-bold text-text-main flex items-center gap-3 mb-6">
                                                    <AlertCircle className="text-warning w-5 h-5" /> Priorités Suivi
                                                </h2>
                                                <div className="space-y-4">
                                                    {dashboardData.priorityStudents.length > 0 ? (
                                                        dashboardData.priorityStudents.map(s => (
                                                            <div key={s.id} onClick={() => handleStudentClick(s)} className="flex items-center justify-between group cursor-pointer">
                                                                <span className="text-sm font-bold text-text-secondary group-hover:text-primary transition-colors">{s.prenom} {s.nom}</span>
                                                                <div className="w-10 h-2 bg-grey-dark/20 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-danger" style={{ width: `${s.importance_suivi}%` }} />
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-grey-dark italic">Aucun élève prioritaire.</p>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="bg-surface p-6 rounded-2xl border border-white/5">
                                                <h2 className="text-lg font-bold text-text-main flex items-center gap-3 mb-6">
                                                    <Calendar className="text-primary w-5 h-5" /> Anniversaires
                                                </h2>
                                                <div className="space-y-4">
                                                    {dashboardData.birthdays.length > 0 ? (
                                                        dashboardData.birthdays.map(s => (
                                                            <div key={s.id} className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                                                                    <Calendar size={14} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-text-main truncate">{s.prenom}</p>
                                                                    <p className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">{formatDateFR(s.date_naissance, { day: '2-digit', month: 'long' })}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-grey-dark italic">Pas d'anniversaires ce mois-ci.</p>
                                                    )}
                                                </div>
                                            </section>

                                            {dashboardData.yesterdayAbsentees.length > 0 && (
                                                <section className="bg-surface p-6 rounded-2xl border border-white/5">
                                                    <h2 className="text-lg font-bold text-text-main flex items-center gap-3 mb-6">
                                                        <Users className="text-danger w-5 h-5" /> Absentéisme Hier
                                                    </h2>
                                                    <div className="flex flex-wrap gap-2">
                                                        {dashboardData.yesterdayAbsentees.map(s => (
                                                            <span key={s.id} onClick={() => handleStudentClick(s)} className="px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-[10px] font-black uppercase cursor-pointer hover:bg-danger/20 transition-all">
                                                                {s.prenom}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Quick Actions & Tools */}
                                    <div className="space-y-6">
                                        <section className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-2xl border border-primary/10">
                                            <h2 className="text-lg font-bold text-text-main mb-6">Assistant Pédagogique</h2>
                                            <div className="space-y-3">
                                                {dashboardData.suggestions.map((sug, i) => (
                                                    <div key={i} className="bg-surface/50 p-4 rounded-xl border border-white/5 space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={clsx(
                                                                "w-7 h-7 rounded-lg flex items-center justify-center",
                                                                sug.type === 'presentation' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-500'
                                                            )}>
                                                                <TrendingUp size={14} />
                                                            </div>
                                                            <span className="text-sm font-bold text-text-main">{sug.title}</span>
                                                        </div>
                                                        <p className="text-xs text-grey-medium pl-10">{sug.desc}</p>
                                                        {sug.student && (
                                                            <div className="pl-10">
                                                                <button
                                                                    onClick={() => handleStudentClick(sug.student)}
                                                                    className="text-[10px] font-black uppercase text-primary hover:underline"
                                                                >
                                                                    Ouvrir le suivi
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {dashboardData.suggestions.length === 0 && (
                                                    <p className="text-xs text-grey-dark italic text-center py-4">Pas de suggestions particulières.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="p-6 rounded-2xl border border-white/5 bg-surface">
                                            <h2 className="text-lg font-bold text-text-main mb-6">Actions Rapides</h2>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { label: 'Faire l\'appel', icon: CheckSquare, path: '/dashboard/user/presence', color: 'bg-emerald-500' },
                                                    { label: 'Suivi Global', icon: LayoutList, path: '/dashboard/user/suivi-global', color: 'bg-primary' },
                                                    { label: 'Gestion Classes', icon: GraduationCap, path: '/dashboard/user/classes', color: 'bg-amber-500' }
                                                ].map(action => (
                                                    <button
                                                        key={action.label}
                                                        onClick={() => navigate(action.path)}
                                                        className="flex items-center gap-4 p-4 bg-surface/50 hover:bg-surface border border-white/5 rounded-xl transition-all active:scale-[0.98]"
                                                    >
                                                        <div className={clsx("p-2 rounded-lg text-white", action.color)}>
                                                            <action.icon size={16} />
                                                        </div>
                                                        <span className="text-sm font-black uppercase tracking-tighter text-text-main">{action.label}</span>
                                                        <ChevronRight className="ml-auto text-grey-dark" size={14} />
                                                    </button>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="bg-surface p-6 rounded-2xl border border-white/5">
                                            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                                <FileText size={18} className="text-primary" /> Rapports
                                            </h2>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-grey-medium uppercase tracking-widest ml-1">Groupe Sélectionné</label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedGroup?.id || ''}
                                                            onChange={(e) => setSelectedGroup(groups.find(g => g.id === e.target.value))}
                                                            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-text-main font-bold focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                                                        >
                                                            {groups.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={14} />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleGenerateGroupTodoList}
                                                    disabled={!selectedGroup || isGenerating}
                                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-text-main border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                                    Générer Listes de Travail
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentTab === 'analytics' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <section className="bg-surface p-8 rounded-2xl border border-white/5">
                                        <h2 className="text-xl font-bold text-text-main mb-8 flex items-center gap-3">
                                            <TrendingUp className="text-success" /> Distribution Progression
                                        </h2>
                                        <ProgressionChart data={dashboardData.progressionDistribution} />
                                        <div className="mt-8 grid grid-cols-2 gap-4">
                                            {dashboardData.progressionDistribution.map(item => (
                                                <div key={item.name} className="flex items-center gap-2">
                                                    <div className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        item.name === 'termine' ? 'bg-success' :
                                                            item.name === 'a_verifier' ? 'bg-primary' :
                                                                item.name === 'en_cours' ? 'bg-warning' : 'bg-danger'
                                                    )} />
                                                    <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">{item.name.replace('_', ' ')}</span>
                                                    <span className="text-xs font-black text-text-main ml-auto">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="bg-surface p-8 rounded-2xl border border-white/5">
                                        <h2 className="text-xl font-bold text-text-main mb-8 flex items-center gap-3">
                                            <LayoutList className="text-primary" /> Équilibre des Domaines
                                        </h2>
                                        <div className="space-y-6">
                                            {dashboardData.branchStats.map(branch => (
                                                <div key={branch.name} className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-xs font-bold text-text-secondary truncate pr-4">{branch.name}</span>
                                                        <span className="text-[10px] font-black text-grey-medium">{branch.count} actions</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary/40 rounded-full"
                                                            style={{ width: `${(branch.count / Math.max(...dashboardData.branchStats.map(b => b.count))) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {dashboardData.branchStats.length === 0 && (
                                                <p className="text-xs text-grey-dark italic text-center py-12">Aucune donnée disponible.</p>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                <section className="bg-surface p-8 rounded-2xl border border-white/5">
                                    <h2 className="text-xl font-bold text-text-main mb-8 flex items-center gap-3">
                                        <AlertCircle className="text-danger" /> Élèves Stagnants
                                    </h2>
                                    <p className="text-xs text-grey-medium mb-6">Aucune activité enregistrée au cours des 7 derniers jours.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {dashboardData.immobileStudents.length > 0 ? (
                                            dashboardData.immobileStudents.map(s => (
                                                <div key={s.id} onClick={() => handleStudentClick(s)} className="flex items-center gap-4 p-3 bg-background/50 hover:bg-white/5 border border-white/5 rounded-2xl transition-all cursor-pointer">
                                                    <div className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center font-black text-[10px]">
                                                        {getInitials(s)}
                                                    </div>
                                                    <span className="text-sm font-bold text-text-main truncate">{s.prenom} {s.nom}</span>
                                                    <ChevronRight size={14} className="ml-auto text-grey-dark" />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-grey-dark gap-2">
                                                <CheckCircle2 className="text-success w-8 h-8" />
                                                <p className="text-xs font-bold uppercase tracking-widest">Tous les élèves sont actifs !</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}

                        {currentTab === 'students' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                                        <Users className="text-primary" /> Vos Élèves
                                    </h2>
                                    <div className="flex items-center gap-4">
                                        <div className="relative md:hidden">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-dark" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Chercher..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-32 bg-surface border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-main outline-none"
                                            />
                                        </div>
                                        <div className="text-[10px] font-black text-grey-medium uppercase tracking-[0.2em]">
                                            {filteredStudents.length} / {students.length}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-12">
                                    {sortedLevels.map(([levelName, { students }]) => (
                                        <div key={levelName} className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-grey-medium border border-white/5 uppercase tracking-widest">
                                                    {levelName}
                                                </span>
                                                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                                {students.map(student => (
                                                    <div
                                                        key={student.id}
                                                        onClick={() => handleStudentClick(student)}
                                                        className="group relative bg-surface hover:bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-row items-center gap-4 transition-all hover:translate-x-1 hover:shadow-lg cursor-pointer"
                                                    >
                                                        <div className="relative shrink-0 w-12 h-12">
                                                            <div className="w-full h-full rounded-full bg-background border-2 border-white/5 p-0.5 overflow-hidden group-hover:border-primary/50 transition-colors">
                                                                {student.photo_base64 ? (
                                                                    <img
                                                                        src={student.photo_base64}
                                                                        alt=""
                                                                        className="w-full h-full object-cover rounded-full"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-primary">
                                                                        <span className="text-xs font-black">{getInitials(student)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-sm text-text-main truncate">
                                                                {student.prenom}
                                                            </h3>
                                                            <p className="text-[9px] font-black text-grey-medium uppercase tracking-tighter truncate">
                                                                {student.Classe?.nom}
                                                            </p>
                                                        </div>

                                                        <ChevronRight className="w-4 h-4 text-grey-dark group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {sortedLevels.length === 0 && (
                                        <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-3xl text-grey-medium bg-surface/30">
                                            <Users className="w-12 h-12 opacity-10" />
                                            <p className="font-black text-xs uppercase tracking-widest">Aucun élève trouvé.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentTab === 'tools' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <section className="bg-surface p-8 rounded-3xl border border-white/5 space-y-8">
                                    <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                                        <Settings2 className="text-primary" /> Configuration
                                    </h2>
                                    <div className="space-y-4">
                                        <button onClick={() => navigate('/dashboard/user/settings')} className="w-full flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                                            <span className="text-sm font-bold text-text-main">Préférences App</span>
                                            <ChevronRight size={16} className="text-grey-dark" />
                                        </button>
                                        <button onClick={() => navigate('/dashboard/user/presence')} className="w-full flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                                            <span className="text-sm font-bold text-text-main">Config Présences</span>
                                            <ChevronRight size={16} className="text-grey-dark" />
                                        </button>
                                    </div>
                                </section>

                                <section className="md:col-span-2 bg-gradient-to-br from-surface to-background p-8 rounded-3xl border border-white/5">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                                            <FileText className="text-warning" /> Centre de téléchargement
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                                    <Users size={18} />
                                                </div>
                                                <h3 className="font-bold text-text-main">Listes par Groupe</h3>
                                            </div>
                                            <p className="text-xs text-grey-medium leading-relaxed italic">Générez un livret A5 contenant les listes de travail pour chaque élève du groupe sélectionné.</p>
                                            <button
                                                onClick={handleGenerateGroupTodoList}
                                                disabled={!selectedGroup || isGenerating}
                                                className="w-full py-3 bg-primary text-text-dark rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                            >
                                                {isGenerating ? "Génération..." : "Lancer l'impression"}
                                            </button>
                                        </div>
                                        {/* Additional tools can be added here */}
                                    </div>
                                </section>
                            </div>
                        )}
                    </>
                )
            }
        </div>
    );
};

export default Home;
