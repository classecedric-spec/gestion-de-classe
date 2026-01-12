import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../lib/photoCache';
import { fetchDelta, mergeDelta } from '../lib/deltaSync';
import { fetchStudentPdfData } from '../lib/pdfUtils';
import { User, Users, GraduationCap, LayoutList, FileText, CheckSquare, ChevronDown, Clock, Search, Loader2, TrendingUp, Calendar, AlertCircle, CheckCircle2, MoreHorizontal, ChevronRight, Filter, Settings2, Activity, Sun, Moon, Zap, Star, Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb } from 'pdf-lib';
import StudentTrackingPDFModern from '../components/StudentTrackingPDFModern';
import RandomPickerModal from '../components/RandomPickerModal';
import NoiseMeterModal from '../components/NoiseMeterModal';
import HomeworkTrackerModal from '../components/HomeworkTrackerModal';
import WeeklyPlannerModal from '../components/WeeklyPlannerModal';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { getInitials, formatDateFR } from '../lib/utils';

const Home = () => {
    // Level Colors for Charts
    const LEVEL_COLORS = {
        'CP': '#3b82f6',   // Blue
        'CE1': '#8b5cf6',  // Purple
        'CE2': '#ec4899',  // Pink
        'CM1': '#f59e0b',  // Amber
        'CM2': '#10b981',  // Emerald
        'Autre': '#6366f1' // Indigo
    };

    const [user, setUser] = useState(null);
    const [userName, setUserName] = useState('');
    const [students, setStudents] = useState([]);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
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
            monthlyActions: 0,
            attendance: { todayCount: 0, monthlyAvg: 0 },
            progression: { rate: 0, todayValidations: 0, todayRate: 0, doneCount: 0, totalStarted: 0 }
        },
        birthdays: [],
        nextMonthBirthdays: [],
        recentActivity: [],
        priorityStudents: { yesterday: [], week: [], completion: [] },
        immobileStudents: [],
        progressionDistribution: [],
        branchStats: [],
        suggestions: [],
        yesterdayAbsentees: [],
        dailySummary: {
            todayWorkCount: 0,
            todayValidators: 0,
            helpNeeded: [],
            quietStudents: [],
            domainFocus: []
        },
        planning: { count: 0, label: '' }
    });

    const [loadingStats, setLoadingStats] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // New Tools State
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
    const [isNoiseMeterOpen, setIsNoiseMeterOpen] = useState(false);
    const [isHomeworkTrackerOpen, setIsHomeworkTrackerOpen] = useState(false);
    const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false);

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

                    // Fetch User Profile
                    const { data: profile } = await supabase
                        .from('CompteUtilisateur')
                        .select('prenom')
                        .eq('id', user.id)
                        .single();
                    if (profile?.prenom) setUserName(profile.prenom);

                    // Fetch Students with Delta Sync (incremental loading)
                    let studentsData;

                    if (isFirstLoad) {
                        // First load: fetch everything
                        const { data, error: studentsError } = await supabase
                            .from('Eleve')
                            .select('id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)')
                            .eq('titulaire_id', user.id);

                        if (!studentsError) {
                            studentsData = data;
                            setIsFirstLoad(false);
                        }
                    } else {
                        // Subsequent loads: fetch only delta
                        const { delta, isFirstSync } = await fetchDelta(
                            'Eleve',
                            'id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)',
                            { titulaire_id: user.id }
                        );

                        if (isFirstSync) {
                            // Fallback to full fetch if no sync history
                            const { data } = await supabase
                                .from('Eleve')
                                .select('id, nom, prenom, photo_base64, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, Niveau(nom, ordre), Classe(nom)')
                                .eq('titulaire_id', user.id);
                            studentsData = data;
                        } else {
                            // Merge delta with existing students
                            studentsData = mergeDelta(students, delta);
                        }
                    }

                    if (studentsData) {
                        // Apply photo caching if enabled
                        if (isCacheEnabled() && studentsData) {
                            const studentsWithCache = await Promise.all(
                                studentsData.map(async (student) => {
                                    if (student.photo_hash) {
                                        const cachedPhoto = await getCachedPhoto(student.id, student.photo_hash);
                                        if (cachedPhoto) {
                                            return { ...student, photo_base64: cachedPhoto };
                                        } else if (student.photo_base64) {
                                            await setCachedPhoto(student.id, student.photo_base64, student.photo_hash);
                                        }
                                    }
                                    return student;
                                })
                            );
                            setStudents(studentsWithCache || []);
                        } else {
                            setStudents(studentsData || []);
                        }
                    }

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

        // Determine Last Active School Day (most recent day with activity strictly before today)
        const [
            { data: lastProgression },
            { data: lastAttendance }
        ] = await Promise.all([
            supabase
                .from('Progression')
                .select('updated_at')
                .in('eleve_id', allStudents.map(s => s.id))
                .lt('updated_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
                .order('updated_at', { ascending: false })
                .limit(1),
            supabase
                .from('Attendance')
                .select('date')
                .in('eleve_id', allStudents.map(s => s.id))
                .lt('date', today)
                .order('date', { ascending: false })
                .limit(1)
        ]);

        let lastActiveDay = new Date();
        lastActiveDay.setDate(lastActiveDay.getDate() - 1);

        const dates = [];
        if (lastProgression && lastProgression[0]) dates.push(new Date(lastProgression[0].updated_at));
        if (lastAttendance && lastAttendance[0]) dates.push(new Date(lastAttendance[0].date));

        if (dates.length > 0) {
            lastActiveDay = new Date(Math.max(...dates));
        }

        const lastActiveDayISO = lastActiveDay.toISOString().split('T')[0];
        const lastActiveDayName = lastActiveDay.toLocaleDateString('fr-FR', { weekday: 'long' });
        const lastActiveDayFormatted = lastActiveDay.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const lastActiveDayLabel = `${lastActiveDayName.charAt(0).toUpperCase() + lastActiveDayName.slice(1)} ${lastActiveDayFormatted}`;

        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);

        try {
            // 1. Attendance Today & Monthly Average
            const { data: attendanceData } = await supabase
                .from('Attendance')
                .select('status, date')
                .in('eleve_id', allStudents.map(s => s.id))
                .gte('date', firstOfMonth.toISOString()) // From first of month
                .lte('date', today);

            // Today's stats
            const todayAttendance = attendanceData?.filter(a => a.date === today) || [];
            const presentCount = todayAttendance.filter(a => a.status === 'present').length;
            const attendanceRate = allStudents.length > 0 ? Math.round((presentCount / allStudents.length) * 100) : 0;

            // Monthly Average
            const daysWithAttendance = [...new Set(attendanceData?.map(a => a.date))];
            let averagePresence = 0;
            if (daysWithAttendance.length > 0) {
                const totalPresentsMonth = attendanceData?.filter(a => a.status === 'present').length || 0;
                averagePresence = Math.round(totalPresentsMonth / daysWithAttendance.length);
            }

            // 2. Recent Activity (last 5)
            const { data: recentActivity } = await supabase
                .from('Progression')
                .select('*, Eleve(prenom, nom, photo_base64), Activite(titre)')
                .in('eleve_id', allStudents.map(s => s.id))
                .order('updated_at', { ascending: false })
                .limit(5);

            // 3. Monthly Actions & Progression Calc
            const { data: monthlyData } = await supabase
                .from('Progression')
                .select('id, updated_at, etat')
                .in('eleve_id', allStudents.map(s => s.id))
                .gte('updated_at', firstOfMonth.toISOString());

            // Global Progression Logic
            const { data: progressionAll } = await supabase
                .from('Progression')
                .select('etat, updated_at, eleve_id')
                .in('eleve_id', allStudents.map(s => s.id));

            // Custom Metric: % of "Started" activities that are "Done" or "To Verify"
            const countTermine = progressionAll?.filter(p => p.etat === 'termine').length || 0;
            const countAVerifier = progressionAll?.filter(p => p.etat === 'a_verifier').length || 0;
            const countEnCours = progressionAll?.filter(p => p.etat === 'en_cours').length || 0;

            const totalStarted = countTermine + countAVerifier + countEnCours;
            const completionRate = totalStarted > 0 ? Math.round(((countTermine + countAVerifier) / totalStarted) * 100) : 0;
            const doneCount = countTermine + countAVerifier;

            // Daily Validation Stats
            const todayValidations = monthlyData?.filter(p => p.updated_at.startsWith(today) && p.etat === 'termine').length || 0;
            const todayActions = monthlyData?.filter(p => p.updated_at.startsWith(today)).length || 0;
            const todayValidationRate = todayActions > 0 ? Math.round((todayValidations / todayActions) * 100) : 0;


            // 4. Birthdays
            const currentMonth = new Date().getMonth() + 1;
            const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

            const birthdays = allStudents.filter(s => {
                if (!s.date_naissance) return false;
                const d = new Date(s.date_naissance);
                return (d.getMonth() + 1) === currentMonth;
            }).sort((a, b) => new Date(a.date_naissance).getDate() - new Date(b.date_naissance).getDate());

            const nextMonthBirthdays = allStudents.filter(s => {
                if (!s.date_naissance) return false;
                const d = new Date(s.date_naissance);
                return (d.getMonth() + 1) === nextMonth;
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
                .select('etat, eleve_id, Activite(Module(SousBranche(Branche(nom))))')
                .in('eleve_id', allStudents.map(s => s.id))
                .not('etat', 'eq', 'non_commence');


            const branchCounts = {};
            const studentLevelMap = {};
            allStudents.forEach(s => {
                studentLevelMap[s.id] = s.niveau?.nom || 'Autre';
            });

            branchData?.forEach(p => {
                const bNom = p.Activite?.Module?.SousBranche?.Branche?.nom || "Inconnu";
                if (!branchCounts[bNom]) branchCounts[bNom] = {
                    total: 0,
                    done: 0,
                    byLevel: {}
                };

                branchCounts[bNom].total++;
                if (p.etat === 'termine' || p.etat === 'a_verifier') {
                    branchCounts[bNom].done++;
                    const level = studentLevelMap[p.eleve_id] || 'Autre';
                    branchCounts[bNom].byLevel[level] = (branchCounts[bNom].byLevel[level] || 0) + 1;
                }
            });

            const branchStats = Object.entries(branchCounts)
                .map(([name, stats]) => {
                    const doneRate = Math.round((stats.done / stats.total) * 100);

                    // Construct Gradient Segments
                    let currentPos = 0;
                    const segments = [];

                    // Sort levels to ensure consistent order (CP -> CM2)
                    const sortedLevelKeys = Object.keys(stats.byLevel).sort((a, b) => {
                        const order = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'Autre'];
                        return order.indexOf(a) - order.indexOf(b);
                    });

                    sortedLevelKeys.forEach(level => {
                        const count = stats.byLevel[level];
                        const levelRate = (count / stats.total) * 100;
                        const color = LEVEL_COLORS[level] || LEVEL_COLORS['Autre'];
                        segments.push(`${color} ${currentPos}% ${currentPos + levelRate}%`);
                        currentPos += levelRate;
                    });

                    // Add "Not Done" segment directly
                    segments.push(`#3f3f46 ${currentPos}% 100%`);

                    return {
                        name,
                        count: stats.total,
                        done: stats.done,
                        notDone: stats.total - stats.done,
                        rate: doneRate,
                        gradient: `conic-gradient(${segments.join(', ')})`
                    };
                })
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

            // 9. Last Active Day's Absentees
            const { data: absentData } = await supabase
                .from('Attendance')
                .select('eleve_id, status')
                .eq('date', lastActiveDayISO)
                .eq('status', 'absent')
                .in('eleve_id', allStudents.map(s => s.id));

            const absentIds = absentData?.map(a => a.eleve_id) || [];
            const absentees = allStudents.filter(s => absentIds.includes(s.id));

            // 10. Priority Lists Logic
            // Helper for Daily Stats (Mon-Fri)
            const getDailyStats = (studentId, activityList, startDate) => {
                const stats = { 'Lun': 0, 'Mar': 0, 'Mer': 0, 'Jeu': 0, 'Ven': 0 };
                const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

                activityList.forEach(p => {
                    const d = new Date(p.updated_at);
                    if (d >= startDate && p.eleve_id === studentId) {
                        const dayName = days[d.getDay()];
                        if (stats[dayName] !== undefined) stats[dayName]++;
                    }
                });
                return stats;
            };

            // A. Least Encoded Yesterday (Bottom 8)
            const validatedProgression = progressionAll?.filter(p => p.etat === 'termine') || [];

            const yesterdayActivityCounts = {};
            // Initialize count to 0 for all
            allStudents.forEach(s => yesterdayActivityCounts[s.id] = 0);

            // Count updates from Progression for yesterday
            const weekStart = new Date();
            const currentDay = weekStart.getDay() || 7;
            weekStart.setDate(weekStart.getDate() - (currentDay - 1));
            weekStart.setHours(0, 0, 0, 0);

            validatedProgression.forEach(p => {
                if (p.updated_at && p.updated_at.startsWith(lastActiveDayISO)) {
                    yesterdayActivityCounts[p.eleve_id] = (yesterdayActivityCounts[p.eleve_id] || 0) + 1;
                }
            });

            const leastActiveYesterday = allStudents
                .map(s => ({
                    ...s,
                    score: yesterdayActivityCounts[s.id] || 0,
                    dailyStats: getDailyStats(s.id, validatedProgression, weekStart)
                }))
                .sort((a, b) => a.score - b.score)
                .slice(0, 8);

            // B. Least Validated This Week (Bottom 8)
            const todayDate = new Date();
            const isMonday = todayDate.getDay() === 1;

            const startOfWeek = new Date(todayDate);
            const dayOfWeek = todayDate.getDay() || 7; // IOS standard: Sun=0 -> Sun=7 for calculation
            // If Monday, look at previous week (Mon-Sun), else current week (Mon-Today)
            const daysToSubtract = isMonday ? (dayOfWeek - 1) + 7 : (dayOfWeek - 1);
            startOfWeek.setDate(todayDate.getDate() - daysToSubtract);
            startOfWeek.setHours(0, 0, 0, 0);

            const weekActivityCounts = {};
            allStudents.forEach(s => weekActivityCounts[s.id] = 0);

            validatedProgression.forEach(p => {
                const pDate = new Date(p.updated_at);
                if (pDate >= startOfWeek) {
                    weekActivityCounts[p.eleve_id] = (weekActivityCounts[p.eleve_id] || 0) + 1;
                }
            });

            const leastValidatedWeek = allStudents
                .map(s => ({
                    ...s,
                    score: weekActivityCounts[s.id] || 0,
                    dailyStats: getDailyStats(s.id, validatedProgression, startOfWeek)
                }))
                .sort((a, b) => a.score - b.score)
                .slice(0, 8);

            // C. Lowest Completion Rate (Bottom 8)
            // Helper for Branch Breakdown
            const getBranchBreakdown = (studentId) => {
                const studentBranches = {};
                // Filter branchData for this student
                // We utilize the already fetched branchData which now includes eleve_id (need to update query line 242 first!)
                // Wait, I need to update the query line 242 first in a separate replace or ensure branchData has eleve_id.
                // Assuming branchData is available in scope. I will update the query in a preceding step or rely on a subsequent step to fix if missed.
                // Actually, I should update logic to use branchData from scope. 
                // Let's filter locally from the raw data if needed or pre-process.
                // Re-using the raw branchData fetched earlier is best.

                const studentBranchItems = branchData?.filter(p => p.eleve_id === studentId && p.etat !== 'non_commence') || [];
                studentBranchItems.forEach(p => {
                    const bNom = p.Activite?.Module?.SousBranche?.Branche?.nom || "Autre";
                    if (!studentBranches[bNom]) studentBranches[bNom] = { done: 0, total: 0 };
                    studentBranches[bNom].total++;
                    if (p.etat === 'termine' || p.etat === 'a_verifier') studentBranches[bNom].done++;
                });

                return Object.entries(studentBranches).map(([name, stats]) => ({
                    name,
                    rate: Math.round((stats.done / stats.total) * 100)
                })).sort((a, b) => a.rate - b.rate); // Show lowest first
            };

            const lowestCompletionRate = allStudents
                .map(s => {
                    const sProg = progressionAll?.filter(p => p.eleve_id === s.id && p.etat !== 'non_commence') || [];
                    const started = sProg.length;
                    if (started === 0) return { ...s, score: 999, displayScore: 0, branchStats: [] };

                    const done = sProg.filter(p => p.etat === 'termine' || p.etat === 'a_verifier').length;
                    const rate = (done / started) * 100;
                    return {
                        ...s,
                        score: rate,
                        displayScore: Math.round(rate),
                        startedCount: started,
                        branchStats: getBranchBreakdown(s.id)
                    };
                })
                .filter(s => s.score !== 999)
                .sort((a, b) => a.score - b.score)
                .slice(0, 8);

            // Breakdown by Level & Gender for the KPI Card
            const studentBreakdown = Object.values(allStudents.reduce((acc, student) => {
                const levelName = student.Niveau?.nom || 'Sans Niveau';
                const levelOrder = student.Niveau?.ordre || 999;

                if (!acc[levelName]) {
                    acc[levelName] = {
                        name: levelName,
                        order: levelOrder,
                        total: 0,
                        boys: 0,
                        girls: 0
                    };
                }

                acc[levelName].total++;
                const gender = (student.sex || '').toLowerCase();
                if (['m', 'garçon', 'garcon', 'masculin'].includes(gender)) acc[levelName].boys++;
                else if (['f', 'fille', 'féminin', 'feminin'].includes(gender)) acc[levelName].girls++;

                return acc;
            }, {})).sort((a, b) => a.order - b.order);

            // 11. Planning Stats
            const monday = new Date();
            const dayNum = monday.getDay();
            const diff = monday.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
            monday.setDate(diff);
            const mondayISO = monday.toISOString().split('T')[0];

            const Friday = new Date(monday);
            Friday.setDate(monday.getDate() + 4);
            const weekLabel = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')} au ${Friday.getDate().toString().padStart(2, '0')}/${(Friday.getMonth() + 1).toString().padStart(2, '0')}`;

            const { count: plannedActivitiesCount } = await supabase
                .from('weekly_planning')
                .select('*', { count: 'exact', head: true })
                .eq('week_start_date', mondayISO)
                .neq('day_of_week', 'DOCK');

            setDashboardData({
                planning: {
                    count: plannedActivitiesCount || 0,
                    label: weekLabel
                },
                stats: {
                    totalStudents: allStudents.length,
                    studentBreakdown,
                    attendance: {
                        todayCount: presentCount,
                        monthlyAvg: averagePresence
                    },
                    progression: {
                        rate: completionRate,
                        todayValidations: todayValidations,
                        todayRate: todayValidationRate,
                        doneCount: doneCount,
                        totalStarted: totalStarted
                    },
                    monthlyActions: monthlyData?.length || 0
                },
                birthdays,
                nextMonthBirthdays,
                recentActivity: recentActivity || [],
                priorityStudents: {
                    yesterday: leastActiveYesterday,
                    week: leastValidatedWeek,
                    completion: lowestCompletionRate,
                    lastActiveLabel: lastActiveDayLabel
                },
                immobileStudents: immobileStudents.slice(0, 10),
                progressionDistribution: distribution,
                branchStats: branchStats.slice(0, 6),
                suggestions: suggestions.slice(0, 4),
                yesterdayAbsentees: absentees,
                dailySummary: {
                    todayWorkCount: monthlyData?.filter(p => p.updated_at.startsWith(today)).length || 0,
                    helpNeeded: allStudents.filter(s => {
                        const studentProg = progressionAll?.filter(p => p.eleve_id === s.id && p.updated_at?.startsWith(today));
                        return studentProg?.some(p => p.etat === 'besoin_d_aide');
                    }),
                    quietStudents: allStudents.filter(s => {
                        const studentProg = progressionAll?.filter(p => p.eleve_id === s.id && p.updated_at?.startsWith(today));
                        return !studentProg || studentProg.length === 0;
                    }).sort((a, b) => (b.importance_suivi || 0) - (a.importance_suivi || 0)).slice(0, 5),
                    domainFocus: branchStats.slice(0, 3)
                }
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
        if (!acc[levelName]) {
            acc[levelName] = {
                students: [],
                order: levelOrder,
                total: 0,
                boys: 0,
                girls: 0
            };
        }
        acc[levelName].students.push(student);
        acc[levelName].total += 1;

        // Normalize gender check
        const gender = (student.sex || '').toLowerCase();
        if (['m', 'garçon', 'garcon', 'masculin'].includes(gender)) {
            acc[levelName].boys += 1;
        } else if (['f', 'fille', 'féminin', 'feminin'].includes(gender)) {
            acc[levelName].girls += 1;
        }

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
                    <div className="mt-2 text-xs font-bold text-grey-light">
                        {trend}
                    </div>
                )}
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
        <div className="space-y-6 pb-12 animate-in fade-in duration-500" >
            <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 flex items-center">
                    <h1 className="text-2xl font-black text-text-main uppercase tracking-tight leading-none">
                        {userName ? `Bonjour ${userName}` : (user ? `Bonjour ${user.email.split('@')[0]}` : 'Bienvenue')}
                    </h1>
                    {currentTab === 'students' && (
                        <div className="flex items-center gap-3 ml-4">
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
                        </div>
                    )}
                </div>

                <div className="neu-selector-container p-1 rounded-xl md:absolute md:left-1/2 md:-translate-x-1/2 z-10">
                    {[
                        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutList },
                        { id: 'summary', label: 'Bilan du Jour', icon: CheckSquare },
                        { id: 'students', label: 'Élèves', icon: Users },
                        { id: 'analytics', label: 'Analyses', icon: Activity },
                        { id: 'tools', label: 'Outils', icon: Settings2 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentTab(tab.id)}
                            className={clsx(
                                "rounded-lg font-black uppercase tracking-widest transition-all",
                                currentTab === tab.id ? "bg-primary text-text-dark shadow-lg shadow-primary/20" : "text-grey-medium hover:text-white"
                            )}
                        >
                            <tab.icon size={14} />
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Spacer for Flex Alignment if needed, but absolute handles centering */}
                <div className="hidden md:block flex-1"></div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                                    {/* Customized Student KPI Card */}
                                    <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                                        <div className="min-h-[88px]">
                                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-blue-500 text-white shrink-0">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="text-3xl font-black text-text-main">{dashboardData.stats.totalStudents}</span>
                                                    <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">élèves</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Breakdown - Enlarged */}
                                        {dashboardData.stats.studentBreakdown && dashboardData.stats.studentBreakdown.length > 0 && (
                                            <div className="space-y-2 pt-3 border-t border-white/5 flex-1">
                                                {dashboardData.stats.studentBreakdown.map((level, idx) => (
                                                    <div key={idx} className="flex flex-wrap justify-between items-center text-sm gap-y-1">
                                                        <span className="font-bold text-grey-light uppercase">{level.name}</span>
                                                        <div className="flex items-center gap-3 text-grey-medium font-medium">
                                                            <span className="text-white font-bold">{level.total}</span>
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400/80"></span>{level.boys}</span>
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400/80"></span>{level.girls}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Customized Presence KPI Card */}
                                    <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                                        <div className="min-h-[88px]">
                                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-emerald-500 text-white shrink-0">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="text-3xl font-black text-text-main">{dashboardData.stats.attendance.todayCount}</span>
                                                    <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">présents</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex-1">
                                            <p className="text-sm font-bold text-grey-medium flex flex-wrap justify-between items-center gap-2">
                                                <span>Moyenne/mois</span>
                                                <span className="text-white bg-white/5 px-2 py-1 rounded-md">{dashboardData.stats.attendance.monthlyAvg}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Customized Progression KPI Card */}
                                    <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                                        <div className="min-h-[88px]">
                                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-amber-500 text-white shrink-0">
                                                    <TrendingUp className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="text-3xl font-black text-text-main">
                                                        {dashboardData.stats.progression.doneCount || 0} / {dashboardData.stats.progression.totalStarted || 0}
                                                    </span>
                                                    <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">achevées</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex-1">
                                            <p className="text-sm font-bold text-grey-medium flex flex-wrap justify-between items-center gap-2">
                                                <span>Aujourd'hui</span>
                                                <span className="text-white bg-white/5 px-2 py-1 rounded-md">
                                                    {dashboardData.stats.progression.todayValidations} validés ({dashboardData.stats.progression.rate}%)
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Customized Birthday KPI Card */}
                                    <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                                        <div className="min-h-[88px] flex flex-col gap-3">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="p-3 rounded-xl bg-pink-500 text-white shrink-0">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="text-3xl font-black text-text-main">{dashboardData.birthdays.length}</span>
                                                    <span className="text-sm font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">anniv. ce mois</span>
                                                </div>
                                            </div>

                                            {/* Current Month Initials - Below Count */}
                                            {dashboardData.birthdays.length > 0 && (
                                                <div className="flex flex-wrap -space-x-2 overflow-hidden px-1">
                                                    {dashboardData.birthdays.slice(0, 5).map((b, i) => (
                                                        <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-pink-500 flex items-center justify-center text-xs font-bold text-white relative z-10" title={`${b.prenom} ${b.nom} (${new Date(b.date_naissance).getDate()})`}>
                                                            {getInitials(b)}
                                                        </div>
                                                    ))}
                                                    {dashboardData.birthdays.length > 5 && (
                                                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-white/10 flex items-center justify-center text-xs font-bold text-white z-0">
                                                            +{dashboardData.birthdays.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-white/5 flex-1">
                                            {dashboardData.birthdays.length > 0 ? (
                                                <p className="text-xs text-grey-medium font-medium leading-relaxed">
                                                    {dashboardData.birthdays.map(b => `${b.prenom} (${new Date(b.date_naissance).getDate()})`).join('; ')}
                                                </p>
                                            ) : (
                                                <span className="text-xs text-grey-dark italic">Aucun anniversaire ce mois.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Customized Planning KPI Card */}
                                    <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                                        <div className="min-h-[88px]">
                                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-orange-500 text-white shrink-0">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="text-3xl font-black text-text-main">
                                                        {dashboardData.planning?.count || 0}
                                                    </span>
                                                    <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">activités prévues</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex-1 flex flex-col justify-between">
                                            <p className="text-sm font-bold text-grey-medium mb-3">
                                                Semaine du {dashboardData.planning?.label || '...'}
                                            </p>
                                            <button
                                                onClick={() => setIsWeeklyPlannerOpen(true)}
                                                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                            >
                                                <Calendar size={12} className="text-orange-500" />
                                                Ouvrir le semainier
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Priority Tracking 3-Column Grid */}
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-warning" />
                                        Priorités Suivi
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {/* Col 1: Least Active Yesterday */}
                                        <div className="bg-surface p-5 rounded-2xl border border-white/5 h-full">
                                            <h3 className="text-base font-bold text-grey-light uppercase tracking-wide mb-4">📉 Moins Actifs ({dashboardData.priorityStudents.lastActiveLabel || 'Hier'})</h3>
                                            <div className="space-y-3">
                                                {dashboardData.priorityStudents.yesterday?.map((s, i) => (
                                                    <div key={i} className="group flex flex-wrap items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors gap-2 cursor-pointer relative" onClick={() => handleStudentClick(s)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-background border border-white/10 flex items-center justify-center text-xs font-bold text-grey-medium shrink-0">
                                                                {getInitials(s)}
                                                            </div>
                                                            <span className="text-base font-medium text-text-secondary">{s.prenom} {s.nom}</span>
                                                        </div>
                                                        <div className="relative">
                                                            <span className="text-sm font-bold text-danger bg-danger/10 px-2 py-1 rounded-md whitespace-nowrap">{s.score} enc.</span>
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-32 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none">
                                                                <p className="text-[10px] font-bold text-grey-light mb-2 border-b border-white/10 pb-1">Détail Semaine</p>
                                                                <table className="w-full text-[10px]">
                                                                    <tbody>
                                                                        {Object.entries(s.dailyStats || {}).map(([day, count]) => (
                                                                            <tr key={day} className="border-b border-white/5 last:border-0 text-grey-medium">
                                                                                <td className="py-1">{day}</td>
                                                                                <td className={clsx("py-1 text-right font-bold", count > 0 ? "text-success" : "text-grey-dark")}>{count}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!dashboardData.priorityStudents.yesterday || dashboardData.priorityStudents.yesterday.length === 0) && (
                                                    <p className="text-sm text-grey-dark italic">Données insuffisantes</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Col 2: Least Validated This Week */}
                                        <div className="bg-surface p-5 rounded-2xl border border-white/5 h-full">
                                            <h3 className="text-base font-bold text-grey-light uppercase tracking-wide mb-4">📅 Validations Faibles (Sem.)</h3>
                                            <div className="space-y-3">
                                                {dashboardData.priorityStudents.week?.map((s, i) => (
                                                    <div key={i} className="group flex flex-wrap items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors gap-2 cursor-pointer relative" onClick={() => handleStudentClick(s)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-background border border-white/10 flex items-center justify-center text-xs font-bold text-grey-medium shrink-0">
                                                                {getInitials(s)}
                                                            </div>
                                                            <span className="text-base font-medium text-text-secondary">{s.prenom} {s.nom}</span>
                                                        </div>
                                                        <div className="relative">
                                                            <span className="text-sm font-bold text-warning bg-warning/10 px-2 py-1 rounded-md whitespace-nowrap">{s.score} val.</span>
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-32 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none">
                                                                <p className="text-[10px] font-bold text-grey-light mb-2 border-b border-white/10 pb-1">Validations Semaine</p>
                                                                <table className="w-full text-[10px]">
                                                                    <tbody>
                                                                        {Object.entries(s.dailyStats || {}).map(([day, count]) => (
                                                                            <tr key={day} className="border-b border-white/5 last:border-0 text-grey-medium">
                                                                                <td className="py-1">{day}</td>
                                                                                <td className={clsx("py-1 text-right font-bold", count > 0 ? "text-success" : "text-grey-dark")}>{count}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!dashboardData.priorityStudents.week || dashboardData.priorityStudents.week.length === 0) && (
                                                    <p className="text-sm text-grey-dark italic">Données insuffisantes</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Col 3: Lowest Completion Rate */}
                                        <div className="bg-surface p-5 rounded-2xl border border-white/5 h-full">
                                            <h3 className="text-base font-bold text-grey-light uppercase tracking-wide mb-4">⚠️ Taux Achèvement Faible</h3>
                                            <div className="space-y-3">
                                                {dashboardData.priorityStudents.completion?.map((s, i) => (
                                                    <div key={i} className="group flex flex-wrap items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors gap-2 cursor-pointer relative" onClick={() => handleStudentClick(s)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-background border border-white/10 flex items-center justify-center text-xs font-bold text-grey-medium shrink-0">
                                                                {getInitials(s)}
                                                            </div>
                                                            <span className="text-base font-medium text-text-secondary">{s.prenom} {s.nom}</span>
                                                        </div>
                                                        <div className="text-right relative">
                                                            <span className="block text-sm font-bold text-danger">{s.displayScore}%</span>
                                                            <span className="text-xs text-grey-dark whitespace-nowrap">{s.startedCount} en cours</span>

                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none text-left">
                                                                <p className="text-[10px] font-bold text-grey-light mb-2 border-b border-white/10 pb-1">Taux par Branche</p>
                                                                <table className="w-full text-[10px]">
                                                                    <tbody>
                                                                        {s.branchStats?.map((stat, idx) => (
                                                                            <tr key={idx} className="border-b border-white/5 last:border-0 text-grey-medium">
                                                                                <td className="py-1 truncate max-w-[100px]">{stat.name}</td>
                                                                                <td className={clsx("py-1 text-right font-bold", stat.rate < 50 ? "text-danger" : "text-success")}>{stat.rate}%</td>
                                                                            </tr>
                                                                        ))}
                                                                        {(!s.branchStats || s.branchStats.length === 0) && (
                                                                            <tr><td className="py-1 text-grey-dark italic" colSpan="2">Aucune donnée</td></tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!dashboardData.priorityStudents.completion || dashboardData.priorityStudents.completion.length === 0) && (
                                                    <p className="text-sm text-grey-dark italic">Données insuffisantes</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <section className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-2xl border border-primary/10">
                                        <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3">
                                            <TrendingUp className="text-primary w-5 h-5" /> Assistant Pédagogique
                                        </h2>

                                        {/* Circular Charts Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
                                            {dashboardData.branchStats.map(stat => (
                                                <div key={stat.name} className="bg-surface/50 p-4 rounded-xl border border-white/5 flex flex-col items-center gap-3 hover:bg-white/5 transition-all">
                                                    <div className="relative w-16 h-16">
                                                        <div
                                                            className="w-full h-full rounded-full"
                                                            style={{
                                                                background: stat.gradient
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 m-auto w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-white/5">
                                                            <span className="text-xs font-black text-white">{stat.rate}%</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-bold text-text-main uppercase tracking-tighter w-full text-center break-words" title={stat.name}>
                                                        {stat.name}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-3 w-full justify-center">
                                                        <div className="flex items-center gap-1" title="Fini (Terminé + À vérif.)">
                                                            <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                                            <span className="text-xs font-bold text-grey-medium">{stat.done}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1" title="En cours">
                                                            <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                                                            <span className="text-xs font-bold text-grey-medium">{stat.notDone}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Level Legend */}
                                        <div className="flex flex-wrap justify-center gap-4 mb-8 px-4">
                                            {Object.entries(LEVEL_COLORS).map(([level, color]) => (
                                                <div key={level} className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                    <span className="text-xs font-bold text-grey-medium">{level}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-3 pt-6 border-t border-white/5">
                                            <p className="text-xs font-bold text-grey-medium mb-2 uppercase tracking-widest">Suggestions</p>
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

                                    {dashboardData.yesterdayAbsentees.length > 0 && (
                                        <section className="bg-surface p-6 rounded-2xl border border-white/5 h-fit">
                                            <h2 className="text-lg font-bold text-text-main flex items-center gap-3 mb-6">
                                                <Users className="text-danger w-5 h-5" /> Absentéisme ({dashboardData.priorityStudents.lastActiveLabel || 'Hier'})
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

                        )}

                        {currentTab === 'summary' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Header Summary */}
                                <div className="bg-gradient-to-br from-primary/20 via-background to-background p-8 rounded-3xl border border-primary/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 text-primary/10">
                                        <Sun size={120} strokeWidth={1} />
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="text-3xl font-black text-text-main uppercase tracking-tighter mb-2">Bilan de la Journée</h2>
                                        <p className="text-grey-medium max-w-2xl text-lg leading-relaxed">
                                            {dashboardData.dailySummary.todayWorkCount > 0
                                                ? `Une journée productive avec ${dashboardData.dailySummary.todayWorkCount} actions enregistrées par vos élèves.`
                                                : "Une journée calme en classe. Prêt pour le point de clôture ?"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Stats Cards */}
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-surface p-6 rounded-2xl border border-white/5 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-success/20 text-success rounded-xl">
                                                        <CheckCircle2 size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Validations</p>
                                                        <p className="text-2xl font-black text-text-main">{dashboardData.dailySummary.todayValidators} <span className="text-xs text-grey-medium font-normal lowercase">terminés ou à vérifier</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-surface p-6 rounded-2xl border border-white/5 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-primary/20 text-primary rounded-xl">
                                                        <Zap size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Domaine Actif</p>
                                                        <p className="text-2xl font-black text-text-main truncate">
                                                            {dashboardData.dailySummary.domainFocus[0]?.name || "Divers"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quiet Students Section */}
                                        <section className="bg-surface p-8 rounded-3xl border border-white/5">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-xl font-bold text-text-main flex items-center gap-3">
                                                        <Moon className="text-indigo-400" /> Élèves en retrait aujourd'hui
                                                    </h3>
                                                    <p className="text-xs text-grey-medium mt-1 italic">Ils n'ont pas enregistré d'activité aujourd'hui.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {dashboardData.dailySummary.quietStudents.length > 0 ? (
                                                    dashboardData.dailySummary.quietStudents.map(s => (
                                                        <div key={s.id} onClick={() => handleStudentClick(s)} className="group flex items-center gap-4 p-4 bg-background/50 hover:bg-white/5 border border-white/5 rounded-2xl transition-all cursor-pointer">
                                                            <div className="w-10 h-10 rounded-full bg-background border border-white/10 overflow-hidden flex items-center justify-center">
                                                                {s.photo_base64 ? <img src={s.photo_base64} className="w-full h-full object-cover" /> : <span className="text-xs font-black text-primary">{getInitials(s)}</span>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-text-main">{s.prenom} {s.nom}</p>
                                                                <p className="text-[10px] text-grey-medium uppercase font-bold tracking-tighter">Priorité Suivi: {s.importance_suivi}%</p>
                                                            </div>
                                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500/50" style={{ width: `${s.importance_suivi}%` }} />
                                                            </div>
                                                            <ChevronRight size={14} className="text-grey-dark group-hover:text-primary transition-colors" />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-12 text-center text-grey-dark">
                                                        <p className="text-xs font-bold uppercase tracking-widest">Tout le monde a été actif aujourd'hui ! ✨</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Help Needed & Next Steps */}
                                    <div className="space-y-8">
                                        <section className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-3xl">
                                            <h3 className="text-lg font-bold text-rose-500 flex items-center gap-3 mb-6">
                                                <AlertCircle size={20} /> Besoin d'Aide
                                            </h3>
                                            <div className="space-y-4">
                                                {dashboardData.dailySummary.helpNeeded.length > 0 ? (
                                                    dashboardData.dailySummary.helpNeeded.map(s => (
                                                        <div key={s.id} onClick={() => handleStudentClick(s)} className="p-4 bg-surface rounded-2xl shadow-sm border border-rose-500/20 flex items-center gap-4 cursor-pointer hover:border-rose-500 transition-all">
                                                            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center font-black text-[10px]">
                                                                {getInitials(s)}
                                                            </div>
                                                            <span className="text-sm font-bold text-text-main">{s.prenom}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-grey-dark italic">Aucun blocage signalé aujourd'hui.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="bg-surface p-6 rounded-3xl border border-white/5">
                                            <h3 className="text-lg font-bold text-text-main flex items-center gap-3 mb-6">
                                                <Star className="text-amber-500" /> Pour demain
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="p-4 bg-background/50 rounded-2xl space-y-2">
                                                    <p className="text-xs font-bold text-text-secondary">💡 Suggestion</p>
                                                    <p className="text-[11px] text-grey-medium leading-relaxed">
                                                        Pensez à faire un point avec les élèves en retrait pour relancer leur dynamique demain matin.
                                                    </p>
                                                </div>
                                                {dashboardData.birthdays.length > 0 && (
                                                    <div className="p-4 bg-pink-500/5 border border-pink-500/10 rounded-2xl">
                                                        <p className="text-xs font-bold text-pink-500">🎂 Anniversaire ce mois</p>
                                                        <p className="text-[11px] text-grey-medium mt-1">
                                                            {dashboardData.birthdays[0].prenom} ({formatDateFR(dashboardData.birthdays[0].date_naissance, { day: '2-digit', month: 'long' })})
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
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
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="px-2 py-0.5 rounded-full bg-surface border border-white/5 text-[9px] font-black text-white shadow-sm flex items-center gap-1" title="Total Élèves">
                                                        <Users size={10} className="text-primary" />
                                                        {students.length}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-surface border border-white/5 text-[9px] font-black text-white shadow-sm flex items-center gap-1" title="Garçons">
                                                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                        {students.filter(s => ['m', 'garçon', 'garcon', 'masculin'].includes((s.sex || '').toLowerCase())).length}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-surface border border-white/5 text-[9px] font-black text-white shadow-sm flex items-center gap-1" title="Filles">
                                                        <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                                                        {students.filter(s => ['f', 'fille', 'féminin', 'feminin'].includes((s.sex || '').toLowerCase())).length}
                                                    </span>
                                                </div>
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
                                        <Settings2 className="text-primary" /> Configuration & Actions
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                                            <h3 className="text-xs font-black text-grey-medium uppercase tracking-widest mb-3">Accès Rapide</h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { label: 'Faire l\'appel', icon: CheckSquare, path: '/dashboard/presence', color: 'bg-emerald-500' },
                                                    { label: 'Suivi Global', icon: LayoutList, path: '/dashboard/suivi', color: 'bg-primary' },
                                                    { label: 'Gestion Classes', icon: GraduationCap, path: '/dashboard/user/classes', color: 'bg-amber-500' }
                                                ].map(action => (
                                                    <button
                                                        key={action.label}
                                                        onClick={() => navigate(action.path)}
                                                        className="flex items-center gap-3 p-3 bg-surface hover:bg-white/5 border border-white/5 rounded-xl transition-all"
                                                    >
                                                        <div className={clsx("p-1.5 rounded-lg text-white", action.color)}>
                                                            <action.icon size={14} />
                                                        </div>
                                                        <span className="text-xs font-bold text-text-main">{action.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => navigate('/dashboard/user/settings')} className="w-full flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                                            <span className="text-sm font-bold text-text-main">Préférences App</span>
                                            <ChevronRight size={16} className="text-grey-dark" />
                                        </button>
                                        <button onClick={() => navigate('/dashboard/presence')} className="w-full flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
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
                                    </div>
                                    {/* New Tools Cards */}
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500">
                                                <Zap size={18} />
                                            </div>
                                            <h3 className="font-bold text-text-main">La Main Innocente</h3>
                                        </div>
                                        <p className="text-xs text-grey-medium leading-relaxed italic">Tirage au sort d'un élève avec animation.</p>
                                        <button
                                            onClick={() => setIsRandomPickerOpen(true)}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Lancer le tirage
                                        </button>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                                                <Activity size={18} />
                                            </div>
                                            <h3 className="font-bold text-text-main">Sonomètre</h3>
                                        </div>
                                        <p className="text-xs text-grey-medium leading-relaxed italic">Visualisez le volume sonore de la classe en direct.</p>
                                        <button
                                            onClick={() => setIsNoiseMeterOpen(true)}
                                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Ouvrir le micro
                                        </button>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500">
                                                <Calendar size={18} />
                                            </div>
                                            <h3 className="font-bold text-text-main">Semainier</h3>
                                        </div>
                                        <p className="text-xs text-grey-medium leading-relaxed italic">Planifiez les activités de la semaine.</p>
                                        <button
                                            onClick={() => setIsWeeklyPlannerOpen(true)}
                                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Ouvrir le semainier
                                        </button>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-500">
                                                <CheckSquare size={18} />
                                            </div>
                                            <h3 className="font-bold text-text-main">Suivi Devoirs</h3>
                                        </div>
                                        <p className="text-xs text-grey-medium leading-relaxed italic">Cochez rapidement les devoirs faits ou non faits.</p>
                                        <button
                                            onClick={() => setIsHomeworkTrackerOpen(true)}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Gérer les devoirs
                                        </button>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500">
                                                <Activity size={18} />
                                            </div>
                                            <h3 className="font-bold text-text-main">Volume d'Activités</h3>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-black text-text-main">{dashboardData.stats.monthlyActions}</p>
                                            <p className="text-xs text-grey-medium leading-relaxed italic">Actions enregistrées ce mois-ci.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 mt-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-lg font-bold text-text-main flex items-center gap-3">
                                                <Clock className="text-primary w-5 h-5" /> Activités Récentes
                                            </h2>
                                            <button onClick={() => navigate('/dashboard/suivi')} className="text-[10px] font-black uppercase tracking-tighter text-grey-medium hover:text-primary transition-colors">Voir Tout</button>
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
                                    </div>
                                </section>
                            </div>
                        )}

                        <RandomPickerModal
                            isOpen={isRandomPickerOpen}
                            onClose={() => setIsRandomPickerOpen(false)}
                            students={students}
                        />

                        <NoiseMeterModal
                            isOpen={isNoiseMeterOpen}
                            onClose={() => setIsNoiseMeterOpen(false)}
                        />

                        <HomeworkTrackerModal
                            isOpen={isHomeworkTrackerOpen}
                            onClose={() => setIsHomeworkTrackerOpen(false)}
                            students={students}
                        />

                        <WeeklyPlannerModal
                            isOpen={isWeeklyPlannerOpen}
                            onClose={() => setIsWeeklyPlannerOpen(false)}
                        />
                    </>
                )
            }
        </div >
    );
};

export default Home;
