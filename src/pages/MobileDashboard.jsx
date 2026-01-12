import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getInitials } from '../lib/utils';
import {
    Smartphone,
    LogOut,
    Users,
    Loader2,
    ClipboardCheck,
    ChevronRight,
    User,
    AlertCircle,
    Check,
    Clock,
    TrendingUp,
    Calendar
} from 'lucide-react';
import clsx from 'clsx';

const MobileDashboard = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [userName, setUserName] = useState('');

    // Stats state
    const [stats, setStats] = useState({
        helpPending: 0,
        validationsToday: 0,
        studentsToFollow: []
    });
    const [recentStudents, setRecentStudents] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) {
                fetchUserInfo(session.user.id);
                fetchGroups();
                fetchStats(session.user.id);
                fetchRecentStudents(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                navigate('/mobile');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserInfo = async (userId) => {
        const { data } = await supabase
            .from('CompteUtilisateur')
            .select('prenom, nom')
            .eq('id', userId)
            .maybeSingle();

        if (data) {
            setUserName(`${data.prenom || ''} ${data.nom || ''}`.trim());
        }
    };

    const fetchGroups = async () => {
        const { data } = await supabase
            .from('Groupe')
            .select('id, nom')
            .order('nom');

        if (data) setGroups(data);
    };

    const fetchStats = async (userId) => {
        setLoadingStats(true);
        try {
            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // Count help requests pending (besoin_d_aide + a_verifier)
            const { data: helpData, count: helpCount } = await supabase
                .from('Progression')
                .select('id', { count: 'exact', head: true })
                .in('etat', ['besoin_d_aide', 'a_verifier']);

            // Count validations today
            const { data: validationsData, count: validationsCount } = await supabase
                .from('Progression')
                .select('id', { count: 'exact', head: true })
                .eq('etat', 'termine')
                .gte('updated_at', todayISO);

            // Get students with most help requests (priority follow)
            const { data: priorityData } = await supabase
                .from('Progression')
                .select(`
                    eleve_id,
                    Eleve (id, prenom, nom, photo_base64)
                `)
                .in('etat', ['besoin_d_aide'])
                .limit(50);

            // Count occurrences per student
            const studentCounts = {};
            priorityData?.forEach(p => {
                if (p.Eleve) {
                    const id = p.eleve_id;
                    if (!studentCounts[id]) {
                        studentCounts[id] = { student: p.Eleve, count: 0 };
                    }
                    studentCounts[id].count++;
                }
            });

            // Sort by count and take top 3
            const studentsToFollow = Object.values(studentCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map(s => ({ ...s.student, helpCount: s.count }));

            setStats({
                helpPending: helpCount || 0,
                validationsToday: validationsCount || 0,
                studentsToFollow
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchRecentStudents = async (userId) => {
        try {
            // Get recent progressions updated by this user
            const { data } = await supabase
                .from('Progression')
                .select(`
                    eleve_id,
                    updated_at,
                    Eleve (id, prenom, nom, photo_base64)
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(20);

            // Deduplicate by student
            const seen = new Set();
            const recent = [];
            data?.forEach(p => {
                if (p.Eleve && !seen.has(p.eleve_id)) {
                    seen.add(p.eleve_id);
                    recent.push(p.Eleve);
                }
            });

            setRecentStudents(recent.slice(0, 5));
        } catch (error) {
            console.error('Error fetching recent students:', error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/mobile');
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
        <div className="min-h-screen bg-background text-text-main font-sans flex flex-col">
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

            <main className="flex-1 p-4 space-y-5 pb-8">

                {/* Stats Cards */}
                <section className="grid grid-cols-2 gap-3">
                    <div className="bg-surface/50 border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={14} className="text-grey-medium" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">En attente</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                            {loadingStats ? <Loader2 size={20} className="animate-spin" /> : stats.helpPending}
                        </div>
                        <p className="text-[10px] text-grey-medium mt-1">demandes d'aide</p>
                    </div>

                    <div className="bg-surface/50 border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Check size={14} className="text-success" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">Aujourd'hui</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                            {loadingStats ? <Loader2 size={20} className="animate-spin" /> : stats.validationsToday}
                        </div>
                        <p className="text-[10px] text-grey-medium mt-1">validations</p>
                    </div>
                </section>

                {/* Priority Students Alert */}
                {stats.studentsToFollow.length > 0 && (
                    <section className="bg-[#A0A8AD]/10 border border-[#A0A8AD]/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-grey-medium" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-grey-medium">Priorité suivi</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {stats.studentsToFollow.map(student => (
                                <Link
                                    key={student.id}
                                    to="/mobile-encodage"
                                    className="flex items-center gap-2 bg-surface/60 px-3 py-2 rounded-lg border border-white/5 shrink-0"
                                >
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-surface-light shrink-0">
                                        {student.photo_base64 ? (
                                            <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-primary">
                                                {getInitials(student)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white leading-tight">{student.prenom}</p>
                                        <p className="text-[9px] text-grey-medium">{student.helpCount} aide{student.helpCount > 1 ? 's' : ''}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Quick Actions */}
                <section>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-grey-medium mb-3">Actions</h2>
                    <Link
                        to="/mobile-encodage"
                        className="flex items-center gap-4 bg-primary/10 border border-primary/20 p-4 rounded-xl hover:bg-primary/20 transition-all group"
                    >
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-text-dark shadow-lg shadow-primary/20">
                            <ClipboardCheck size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Encodage</h3>
                            <p className="text-[11px] text-grey-medium">Encoder les progressions</p>
                        </div>
                        <ChevronRight size={20} className="text-primary group-hover:translate-x-1 transition-transform" />
                    </Link>
                </section>

                {/* Recent Students */}
                {recentStudents.length > 0 && (
                    <section>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-grey-medium mb-3">Récents</h2>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {recentStudents.map(student => (
                                <Link
                                    key={student.id}
                                    to="/mobile-encodage"
                                    className="flex flex-col items-center gap-2 shrink-0"
                                >
                                    <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 bg-surface-light">
                                        {student.photo_base64 ? (
                                            <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-sm font-black text-primary">
                                                {getInitials(student)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-grey-light text-center max-w-[60px] truncate">
                                        {student.prenom}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Groups for Suivi */}
                <section>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-grey-medium mb-3">Suivi par groupe</h2>
                    <div className="space-y-2">
                        {groups.length === 0 ? (
                            <div className="bg-surface/40 border border-border rounded-xl p-6 text-center">
                                <Users size={32} className="text-grey-medium mx-auto mb-3 opacity-50" />
                                <p className="text-sm text-grey-medium">Aucun groupe</p>
                            </div>
                        ) : (
                            groups.slice(0, 4).map(group => (
                                <Link
                                    key={group.id}
                                    to={`/mobile-suivi/${group.id}`}
                                    className="flex items-center gap-3 bg-surface/40 border border-border p-3 rounded-xl hover:bg-surface hover:border-primary/30 transition-all group"
                                >
                                    <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center text-primary border border-white/5">
                                        <Users size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-white flex-1">{group.nom}</span>
                                    <Smartphone size={14} className="text-grey-medium group-hover:text-primary transition-colors" />
                                </Link>
                            ))
                        )}
                        {groups.length > 4 && (
                            <p className="text-[10px] text-grey-dark text-center pt-1">
                                + {groups.length - 4} autres groupes
                            </p>
                        )}
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="p-3 border-t border-white/5 text-center">
                <p className="text-[9px] font-bold text-grey-dark uppercase tracking-widest">Gestion Classe • Mobile</p>
            </footer>
        </div>
    );
};

export default MobileDashboard;
