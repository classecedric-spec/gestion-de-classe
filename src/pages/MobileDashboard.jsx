import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import RandomPickerModal from '../components/RandomPickerModal';

import {
    LogOut,
    Loader2,
    User,
    AlertCircle,
    Check,
    Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const MobileDashboard = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [activeGroup, setActiveGroup] = useState(null);

    // Random Picker State
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
    const [groupStudents, setGroupStudents] = useState([]);

    // Stats state
    const [stats, setStats] = useState({
        helpPending: 0,
        validationsToday: 0,
        studentsToFollow: []
    });

    // Attendance Summary State
    const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, hasEncoding: false, period: 'matin' });
    // Default to today for summary
    const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [loadingStats, setLoadingStats] = useState(true);

    // Helper to determine period based on time
    const getPeriodFromTime = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hours * 60 + minutes;

        // Matin: < 12:00 (720 minutes)
        if (currentTime < 720) {
            return 'matin';
        } else {
            return 'apres_midi';
        }
    };

    const fetchUserInfo = useCallback(async (userId) => {
        try {
            const { data: user } = await supabase
                .from('CompteUtilisateur')
                .select('prenom, nom, last_selected_group_id')
                .eq('id', userId)
                .maybeSingle();

            if (user) {
                setUserName(`${user.prenom} ${user.nom}`);

                let groupToSet = null;
                // Try to get last selected group
                if (user.last_selected_group_id) {
                    const { data: group } = await supabase
                        .from('Groupe')
                        .select('id, nom')
                        .eq('id', user.last_selected_group_id)
                        .single();
                    if (group) groupToSet = group;
                }

                // Fallback: get first group if no last selection
                if (!groupToSet) {
                    const { data: firstGroup } = await supabase
                        .from('Groupe')
                        .select('id, nom')
                        .eq('user_id', userId)
                        .order('nom')
                        .limit(1)
                        .maybeSingle();
                    if (firstGroup) groupToSet = firstGroup;
                }

                if (groupToSet) setActiveGroup(groupToSet);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }, []);

    const fetchStats = useCallback(async (groupId = null) => {
        setLoadingStats(true);
        try {
            let filterStudentIds = null;
            if (groupId) {
                const { data: s } = await supabase.from('EleveGroupe').select('eleve_id').eq('groupe_id', groupId);
                filterStudentIds = s ? s.map(x => x.eleve_id) : [];
            }

            // Optimization: If filtering by group but no students found, return 0 immediately
            if (filterStudentIds !== null && filterStudentIds.length === 0) {
                setStats({
                    helpPending: 0,
                    validationsToday: 0,
                    studentsToFollow: []
                });
                setLoadingStats(false);
                return;
            }

            // Get help pending count
            let queryHelp = supabase
                .from('Progression')
                .select('*', { count: 'exact', head: true })
                .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement']);

            if (filterStudentIds) {
                queryHelp = queryHelp.in('eleve_id', filterStudentIds);
            }

            const { count: helpCount } = await queryHelp;

            // Get validations today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let queryVal = supabase
                .from('Progression')
                .select('*', { count: 'exact', head: true })
                .eq('etat', 'valide')
                .gte('updated_at', today.toISOString());

            if (filterStudentIds) {
                queryVal = queryVal.in('eleve_id', filterStudentIds);
            }

            const { count: valCount } = await queryVal;

            setStats({
                helpPending: helpCount || 0,
                validationsToday: valCount || 0,
                studentsToFollow: []
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const fetchDailyAttendance = useCallback(async () => {
        setLoadingAttendance(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get user's groups
            const { data: groups } = await supabase.from('Groupe').select('id').eq('user_id', user.id);
            const groupIds = groups?.map(g => g.id) || [];

            if (groupIds.length === 0) return;

            // 2. Get students ids for these groups
            const { data: students } = await supabase
                .from('Eleve')
                .select('id, EleveGroupe!inner(groupe_id)')
                .in('EleveGroupe.groupe_id', groupIds);

            if (!students) return;

            const studentIds = students.map(s => s.id);
            const targetDateStr = selectedDate; // Today
            const currentPeriod = getPeriodFromTime();

            // 3. Get attendance for today AND current period only
            const { data: attendances } = await supabase
                .from('Attendance')
                .select('status, eleve_id')
                .eq('date', targetDateStr)
                .eq('periode', currentPeriod)
                .in('eleve_id', studentIds);

            const hasData = attendances && attendances.length > 0;

            if (!hasData) {
                setAttendanceSummary({
                    present: 0,
                    absent: 0,
                    hasEncoding: false,
                    period: currentPeriod
                });
            } else {
                const totalStudents = studentIds.length;
                const absentCount = attendances.filter(a => a.status === 'absent').length;
                const presentCount = totalStudents - absentCount;

                setAttendanceSummary({
                    present: presentCount,
                    absent: absentCount,
                    hasEncoding: true,
                    period: currentPeriod
                });
            }

        } catch (error) {
            console.error('Error fetching attendance summary:', error);
        } finally {
            setLoadingAttendance(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) {
                fetchUserInfo(session.user.id);
                // fetchStats is now triggered by activeGroup change
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                navigate('/mobile');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, fetchUserInfo]);

    // Update stats when active group changes
    useEffect(() => {
        if (activeGroup) {
            fetchStats(activeGroup.id);
            // Fetch students for random picker
            const fetchGroupStudents = async () => {
                const { data } = await supabase
                    .from('Eleve')
                    .select('*, EleveGroupe!inner(groupe_id)')
                    .eq('EleveGroupe.groupe_id', activeGroup.id)
                    .order('nom');
                setGroupStudents(data || []);
            };
            fetchGroupStudents();
        } else if (session) {
            // Fallback: fetch global stats if no group and session exists
            fetchStats();
            setGroupStudents([]);
        }
    }, [activeGroup, fetchStats, session]);

    // Update attendance when date changes
    useEffect(() => {
        if (session) {
            fetchDailyAttendance();
        }
    }, [fetchDailyAttendance, session]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/mobile');
    };

    const handleGoToSuivi = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Non connecté');
                return;
            }

            // Try to get the last selected group from Supabase
            const { data: userData } = await supabase
                .from('CompteUtilisateur')
                .select('last_selected_group_id')
                .eq('id', user.id)
                .single();

            const savedGroupId = userData?.last_selected_group_id;

            if (savedGroupId) {
                // Verify the group still exists
                const { data: group } = await supabase
                    .from('Groupe')
                    .select('id')
                    .eq('id', savedGroupId)
                    .single();

                if (group) {
                    navigate(`/mobile-suivi/${savedGroupId}`);
                    return;
                }
            }

            // Fallback: fetch first group available
            const { data: groups } = await supabase
                .from('Groupe')
                .select('id')
                .order('nom')
                .limit(1);

            if (groups && groups.length > 0) {
                navigate(`/mobile-suivi/${groups[0].id}`);
            } else {
                toast.error('Aucun groupe disponible');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error('Erreur lors du chargement');
        }
    };

    // Get current date
    const today = new Date();
    const dateString = today.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <User size={48} className="text-primary mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Non connecté</h1>
                <p className="text-grey-medium mb-6">Veuillez vous connecter pour accéder à l'application.</p>
                <Link to="/login" className="bg-primary text-text-dark font-bold py-3 px-8 rounded-xl">
                    Se connecter
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background text-text-main font-sans flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-text-dark font-black text-lg shadow-lg shadow-primary/20">
                            G
                        </div>
                        <div>
                            <h1 className="text-base font-black text-white leading-tight">Bonjour{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
                            <p className="text-[10px] text-grey-medium font-medium capitalize">{dateString}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-grey-medium hover:text-danger hover:bg-danger/10 transition-all border border-white/5"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 space-y-5 pb-4 flex flex-col h-[calc(100vh-80px)]">

                {/* Stats Cards */}
                <section className="grid grid-cols-2 gap-3">
                    <div
                        onClick={handleGoToSuivi}
                        className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface hover:border-primary/30 transition-all group cursor-pointer"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={14} className="text-grey-medium group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">En attente {activeGroup ? `(${activeGroup.nom})` : ''}</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                            {loadingStats ? <Loader2 size={20} className="animate-spin" /> : stats.helpPending}
                        </div>
                        <p className="text-[10px] text-grey-medium mt-1 group-hover:text-primary transition-colors">demandes d'aide • cliquez pour voir</p>
                    </div>

                    <Link
                        to="/mobile-encodage"
                        className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface hover:border-success/30 transition-all group cursor-pointer"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Check size={14} className="text-success" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">Aujourd'hui</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                            {loadingStats ? <Loader2 size={20} className="animate-spin" /> : stats.validationsToday}
                        </div>
                        <p className="text-[10px] text-grey-medium mt-1 group-hover:text-success transition-colors">validations • cliquez pour encoder</p>
                    </Link>

                    {/* Random Picker */}
                    <div
                        onClick={() => setIsRandomPickerOpen(true)}
                        className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface hover:border-purple-500/30 transition-all group cursor-pointer"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={14} className="text-purple-500" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">Main Innocente</span>
                        </div>
                        <div className="text-2xl font-black text-white flex items-center gap-2">
                            <span className="text-2xl">🎲</span>
                        </div>
                        <p className="text-[10px] text-grey-medium mt-1 group-hover:text-purple-500 transition-colors">
                            Tirage au sort
                        </p>
                    </div>

                    <Link
                        to="/mobile-presence"
                        state={{ period: attendanceSummary.period }}
                        className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface hover:border-primary/30 transition-all group cursor-pointer"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <User size={14} className="text-grey-medium group-hover:text-primary transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">
                                Présences ({attendanceSummary.period === 'matin' ? 'Matin' : 'Apr-Midi'})
                            </span>
                        </div>
                        <div className="text-2xl font-black text-white flex items-center gap-2">
                            {loadingAttendance ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : !attendanceSummary.hasEncoding ? (
                                <span className="text-xl text-grey-light italic">-</span>
                            ) : (
                                <span>{attendanceSummary.present}</span>
                            )}
                        </div>
                        <p className="text-[10px] text-grey-medium mt-1 group-hover:text-primary transition-colors">
                            {!attendanceSummary.hasEncoding
                                ? "Pas d'encodage • cliquez pour voir"
                                : `${attendanceSummary.absent} ${attendanceSummary.absent > 1 ? 'absents' : 'absent'} • cliquez pour voir`}
                        </p>
                    </Link>
                </section>

            </main>

            {/* Footer */}
            <footer className="p-3 border-t border-white/5 text-center">
                <p className="text-[9px] font-bold text-grey-dark uppercase tracking-widest">Gestion Classe • Mobile</p>
            </footer>

            {/* RANDOM PICKER MODAL */}
            <RandomPickerModal
                isOpen={isRandomPickerOpen}
                onClose={() => setIsRandomPickerOpen(false)}
                students={groupStudents}
            />
        </div>
    );
};

export default MobileDashboard;
