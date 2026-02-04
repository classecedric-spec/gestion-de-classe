import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { Student } from '../../attendance/services/attendanceService';
import { SupabaseModuleRepository } from '../../modules/repositories/SupabaseModuleRepository';

const moduleRepo = new SupabaseModuleRepository();

// Level Colors for Charts
export const LEVEL_COLORS: Record<string, string> = {
    'CP': '#3b82f6',   // Blue
    'CE1': '#8b5cf6',  // Purple
    'CE2': '#ec4899',  // Pink
    'CM1': '#f59e0b',  // Amber
    'CM2': '#10b981',  // Emerald
    'Autre': '#6366f1' // Indigo
};

export interface DashboardStats {
    totalStudents: number;
    studentBreakdown: any[];
    attendance: { todayCount: number; monthlyAvg: number };
    progression: {
        rate: number;
        todayValidations: number;
        todayRate: number;
        doneCount: number;
        totalStarted: number;
    };
    monthlyActions: number;
}

export interface DashboardSuggestion {
    type: 'presentation' | 'focus';
    title: string;
    desc: string;
    student?: Student;
    color?: string;
}

export interface BranchStat {
    name: string;
    count: number;
    done: number;
    notDone: number;
    rate: number;
    gradient: string;
}

export interface DashboardData {
    stats: DashboardStats;
    birthdays: Student[];
    nextMonthBirthdays: Student[];
    recentActivity: any[];
    priorityStudents: {
        yesterday: any[];
        week: any[];
        completion: any[];
        lastActiveLabel?: string;
    };
    immobileStudents: Student[];
    progressionDistribution: { name: string; value: number }[];
    branchStats: BranchStat[];
    suggestions: DashboardSuggestion[];
    yesterdayAbsentees: Student[];
    dailySummary: {
        todayWorkCount: number;
        helpNeeded: Student[];
        quietStudents: Student[];
        domainFocus: BranchStat[];
    };
    planning: { count: number; label: string };
    overdueStudents: any[];
}

const initialDashboardData: DashboardData = {
    stats: {
        totalStudents: 0,
        studentBreakdown: [],
        attendance: { todayCount: 0, monthlyAvg: 0 },
        progression: { rate: 0, todayValidations: 0, todayRate: 0, doneCount: 0, totalStarted: 0 },
        monthlyActions: 0
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
        helpNeeded: [],
        quietStudents: [],
        domainFocus: []
    },
    planning: { count: 0, label: '' },
    overdueStudents: []
};

/**
 * useDashboardData
 * Hook to fetch and manage dashboard statistics
 */
export const useDashboardData = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
    const [loading, setLoading] = useState(true);

    const fetchDashboardDetails = useCallback(async (_userId: string, allStudents: Student[]) => {
        if (!allStudents || allStudents.length === 0) {
            setLoading(false);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);


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

        const dates: Date[] = [];
        if (lastProgression && lastProgression[0]) dates.push(new Date(lastProgression[0].updated_at));
        if (lastAttendance && lastAttendance[0]) dates.push(new Date(lastAttendance[0].date));

        if (dates.length > 0) {
            lastActiveDay = new Date(Math.max(...dates.map(d => d.getTime())));
        }

        const lastActiveDayISO = lastActiveDay.toISOString().split('T')[0];
        const lastActiveDayName = lastActiveDay.toLocaleDateString('fr-FR', { weekday: 'long' });
        const lastActiveDayFormatted = lastActiveDay.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const lastActiveDayLabel = `${lastActiveDayName.charAt(0).toUpperCase() + lastActiveDayName.slice(1)} ${lastActiveDayFormatted} `;

        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);

        try {
            // 1. Attendance Today & Monthly Average
            const { data: attendanceData } = await supabase
                .from('Attendance')
                .select('status, date, categorie_id, CategoriePresence(nom)')
                .in('eleve_id', allStudents.map(s => s.id))
                .gte('date', firstOfMonth.toISOString())
                .lte('date', today);

            const todayAttendance = (attendanceData as any[])?.filter(a => a.date === today) || [];
            // Count all students who are not absent (either status='present' OR have a non-Absent category)
            const presentCount = todayAttendance.filter(a => {
                // If status is explicitly 'present', count it
                if (a.status === 'present') return true;
                // If there's a category and it's not "Absent", count it
                if (a.CategoriePresence && a.CategoriePresence.nom !== 'Absent') return true;
                return false;
            }).length;

            const daysWithAttendance = [...new Set((attendanceData as any[])?.map(a => a.date))];
            let averagePresence = 0;
            if (daysWithAttendance.length > 0) {
                const totalPresentsMonth = (attendanceData as any[])?.filter(a => {
                    if (a.status === 'present') return true;
                    if (a.CategoriePresence && a.CategoriePresence.nom !== 'Absent') return true;
                    return false;
                }).length || 0;
                averagePresence = Math.round(totalPresentsMonth / daysWithAttendance.length);
            }

            // 2. Recent Activity (last 5)
            const { data: recentActivity } = await supabase
                .from('Progression')
                .select('*, Eleve(prenom, nom, photo_url), Activite(titre)')
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

            const countTermine = progressionAll?.filter(p => p.etat === 'termine').length || 0;
            const countAVerifier = progressionAll?.filter(p => p.etat === 'a_verifier').length || 0;
            const countEnCours = progressionAll?.filter(p => p.etat === 'en_cours').length || 0;

            const totalStarted = countTermine + countAVerifier + countEnCours;
            const completionRate = totalStarted > 0 ? Math.round(((countTermine + countAVerifier) / totalStarted) * 100) : 0;
            const doneCount = countTermine + countAVerifier;

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
            }).sort((a, b) => new Date(a.date_naissance || '').getDate() - new Date(b.date_naissance || '').getDate());

            const nextMonthBirthdays = allStudents.filter(s => {
                if (!s.date_naissance) return false;
                const d = new Date(s.date_naissance);
                return (d.getMonth() + 1) === nextMonth;
            }).sort((a, b) => new Date(a.date_naissance || '').getDate() - new Date(b.date_naissance || '').getDate());

            // 5. Immobile Students (No activity in last 7 days)
            const immobileStudents = allStudents.filter(s => {
                const studentActivity = progressionAll?.filter(p => p.eleve_id === s.id);
                if (!studentActivity || studentActivity.length === 0) return true;
                const lastUpdate = new Date(Math.max(...studentActivity.map(p => new Date(p.updated_at).getTime())));
                return lastUpdate < lastWeek;
            });

            // 6. Distribution
            const states: Record<string, number> = { termine: 0, a_verifier: 0, en_cours: 0, besoin_d_aide: 0 };
            progressionAll?.forEach(p => { if (states[p.etat as string] !== undefined) states[p.etat as string]++; });
            const distribution = Object.entries(states).map(([name, value]) => ({ name, value }));

            // 7. Branch Distribution
            const { data: branchData } = await supabase
                .from('Progression')
                .select('etat, eleve_id, Activite(Module(SousBranche(Branche(nom))))')
                .in('eleve_id', allStudents.map(s => s.id))
                .not('etat', 'eq', 'non_commence');

            const branchCounts: Record<string, { total: number; done: number; byLevel: Record<string, number> }> = {};
            const studentLevelMap: Record<string, string> = {};
            allStudents.forEach(s => {
                studentLevelMap[s.id] = s.Niveau?.nom || 'Autre';
            });

            (branchData as any[])?.forEach(p => {
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

            const branchStats: BranchStat[] = Object.entries(branchCounts)
                .map(([name, stats]) => {
                    const doneRate = Math.round((stats.done / stats.total) * 100);

                    let currentPos = 0;
                    const segments: string[] = [];

                    const sortedLevelKeys = Object.keys(stats.byLevel).sort((a, b) => {
                        const order = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'Autre'];
                        return order.indexOf(a) - order.indexOf(b);
                    });

                    sortedLevelKeys.forEach(level => {
                        const count = stats.byLevel[level];
                        const levelRate = (count / stats.total) * 100;
                        const color = LEVEL_COLORS[level] || LEVEL_COLORS['Autre'];
                        segments.push(`${color} ${currentPos}% ${currentPos + levelRate}% `);
                        currentPos += levelRate;
                    });

                    segments.push(`#3f3f46 ${currentPos}% 100 % `);

                    return {
                        name,
                        count: stats.total,
                        done: stats.done,
                        notDone: stats.total - stats.done,
                        rate: doneRate,
                        gradient: `conic - gradient(${segments.join(', ')})`
                    };
                })
                .sort((a, b) => b.count - a.count);

            // 8. Suggestions Logic
            const suggestions: DashboardSuggestion[] = [];
            const enCoursStudents = allStudents.map(s => {
                const count = progressionAll?.filter(p => p.eleve_id === s.id && p.etat === 'en_cours').length || 0;
                return { ...s, enCoursCount: count };
            }).filter(s => s.enCoursCount > 3).sort((a, b) => b.enCoursCount - a.enCoursCount).slice(0, 3);

            enCoursStudents.forEach(s => {
                suggestions.push({
                    type: 'presentation',
                    title: `Présentation à valider: ${s.prenom} `,
                    desc: `${s.enCoursCount} activités en cours.Un petit coup de pouce ? `,
                    student: s
                });
            });

            if (branchStats.length > 2) {
                const leastActive = branchStats[branchStats.length - 1];
                suggestions.push({
                    type: 'focus',
                    title: `Focus: ${leastActive.name} `,
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

            const absentIds = (absentData as any[])?.map(a => a.eleve_id) || [];
            const absentees = allStudents.filter(s => absentIds.includes(s.id));

            // 10. Priority Lists Logic
            const getDailyStats = (studentId: string, activityList: any[], startDate: Date) => {
                const stats: Record<string, number> = { 'Lun': 0, 'Mar': 0, 'Mer': 0, 'Jeu': 0, 'Ven': 0 };
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

            const validatedProgression = progressionAll?.filter(p => p.etat === 'termine') || [];

            const yesterdayActivityCounts: Record<string, number> = {};
            allStudents.forEach(s => yesterdayActivityCounts[s.id] = 0);

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
            const dayOfWeek = todayDate.getDay() || 7;
            const daysToSubtract = isMonday ? (dayOfWeek - 1) + 7 : (dayOfWeek - 1);
            startOfWeek.setDate(todayDate.getDate() - daysToSubtract);
            startOfWeek.setHours(0, 0, 0, 0);

            const weekActivityCounts: Record<string, number> = {};
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
            const getBranchBreakdown = (studentId: string) => {
                const studentBranches: Record<string, { done: number; total: number }> = {};
                const studentBranchItems = (branchData as any[])?.filter(p => p.eleve_id === studentId && p.etat !== 'non_commence') || [];
                studentBranchItems.forEach(p => {
                    const bNom = p.Activite?.Module?.SousBranche?.Branche?.nom || "Autre";
                    if (!studentBranches[bNom]) studentBranches[bNom] = { done: 0, total: 0 };
                    studentBranches[bNom].total++;
                    if (p.etat === 'termine' || p.etat === 'a_verifier') studentBranches[bNom].done++;
                });

                return Object.entries(studentBranches).map(([name, stats]) => ({
                    name,
                    rate: Math.round((stats.done / stats.total) * 100)
                })).sort((a, b) => a.rate - b.rate);
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
            const studentBreakdownRaw: Record<string, any> = allStudents.reduce((acc, student) => {
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
            }, {} as Record<string, any>);

            const studentBreakdown = Object.values(studentBreakdownRaw).sort((a, b) => a.order - b.order);

            // 11. Planning Stats
            const monday = new Date();
            const dayNum = monday.getDay();
            const diffDays = monday.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
            monday.setDate(diffDays);
            const mondayISO = monday.toISOString().split('T')[0];

            const Friday = new Date(monday);
            Friday.setDate(monday.getDate() + 4);
            const weekLabel = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')} au ${Friday.getDate().toString().padStart(2, '0')}/${(Friday.getMonth() + 1).toString().padStart(2, '0')}`;

            const { count: plannedActivitiesCount } = await supabase
                .from('weekly_planning')
                .select('*', { count: 'exact', head: true })
                .eq('week_start_date', mondayISO)
                .neq('day_of_week', 'DOCK');

            // 12. Overdue Students Logic (via Secure View)
            // 12. Overdue Students Logic (Optimized SQL)
            const classId = allStudents[0]?.classe_id;
            const rawLateActivities = classId ? await moduleRepo.getDetailedLateActivities(classId) : [];

            // Group by Level -> Student -> Module
            const overdueByLevel: Record<string, any> = {};

            rawLateActivities.forEach(item => {
                const student = item.Eleve;
                const level = student?.Niveau || { nom: 'Sans Niveau', ordre: 999 };
                const levelKey = level.nom;

                if (!overdueByLevel[levelKey]) {
                    overdueByLevel[levelKey] = {
                        name: levelKey,
                        ordre: level.ordre,
                        students: {}
                    };
                }

                const studentId = student.id;
                if (!overdueByLevel[levelKey].students[studentId]) {
                    overdueByLevel[levelKey].students[studentId] = {
                        ...student,
                        overdueModules: {}
                    };
                }

                const module = item.Activite?.Module;
                const moduleId = module?.id;
                if (!moduleId) return;

                if (!overdueByLevel[levelKey].students[studentId].overdueModules[moduleId]) {
                    overdueByLevel[levelKey].students[studentId].overdueModules[moduleId] = {
                        ...module,
                        activities: []
                    };
                }

                overdueByLevel[levelKey].students[studentId].overdueModules[moduleId].activities.push({
                    id: item.id,
                    titre: item.Activite?.titre,
                    etat: item.etat
                });
            });

            // Convert and Sort everything
            const finalOverdueData = Object.values(overdueByLevel)
                .sort((a: any, b: any) => (a.ordre || 0) - (b.ordre || 0))
                .map((level: any) => ({
                    ...level,
                    students: Object.values(level.students)
                        .sort((a: any, b: any) => (a.prenom || '').localeCompare(b.prenom || ''))
                        .map((student: any) => {
                            const modulesList = Object.values(student.overdueModules)
                                .sort((a: any, b: any) => {
                                    // Sort modules: Date -> Branch -> SubBranch -> Name
                                    const dateA = new Date(a.date_fin || 0).getTime();
                                    const dateB = new Date(b.date_fin || 0).getTime();
                                    if (dateA !== dateB) return dateA - dateB;

                                    const bA = a.SousBranche?.Branche?.ordre || 0;
                                    const bB = b.SousBranche?.Branche?.ordre || 0;
                                    if (bA !== bB) return bA - bB;

                                    const sbA = a.SousBranche?.ordre || 0;
                                    const sbB = b.SousBranche?.ordre || 0;
                                    if (sbA !== sbB) return sbA - sbB;

                                    return (a.nom || '').localeCompare(b.nom || '');
                                });

                            const totalActivities = modulesList.reduce((sum: number, mod: any) => sum + (mod.activities?.length || 0), 0);

                            return {
                                ...student,
                                overdueModules: modulesList,
                                overdueCount: totalActivities
                            };
                        })
                }));



            setDashboardData({
                planning: {
                    count: plannedActivitiesCount || 0,
                    label: weekLabel
                },
                overdueStudents: finalOverdueData,
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
                    }).sort((a: any, b: any) => (b.importance_suivi || 0) - (a.importance_suivi || 0)).slice(0, 5),
                    domainFocus: branchStats.slice(0, 3)
                }
            });

        } catch (err) {
            console.error("Error fetching dashboard details:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        dashboardData,
        loading,
        fetchDashboardDetails,
        LEVEL_COLORS
    };
};

export { };
