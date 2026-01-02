import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Settings, BookOpen, Layers, User, GraduationCap, Puzzle, Loader2, Clock, Menu, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import clsx from 'clsx';
import TimerModal from './TimerModal';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        // Initial state: closed on suivi, open elsewhere unless previously saved (optional)
        return location.pathname === '/dashboard/suivi' ? false : true;
    });

    // We only force-collapse it when first entering Suivi page from a non-suivi page
    // but we don't force-open it when leaving.
    const prevPathRef = useRef(location.pathname);
    useEffect(() => {
        if (location.pathname === '/dashboard/suivi' && prevPathRef.current !== '/dashboard/suivi') {
            setIsSidebarOpen(false);
        }
        prevPathRef.current = location.pathname;
    }, [location.pathname]);

    const isSuiviPage = location.pathname === '/dashboard/suivi';

    // --- TIMER STATE ---
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [timer, setTimer] = useState({ active: false, timeLeft: 0, duration: 0, message: '' });
    const [timerFinished, setTimerFinished] = useState(false);
    const timerInterval = useRef(null);

    // --- DATE ---
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (timer.active && timer.timeLeft > 0) {
            timerInterval.current = setInterval(() => {
                setTimer((prev) => {
                    if (prev.timeLeft <= 1) {
                        clearInterval(timerInterval.current);
                        setTimerFinished(true);
                        return { ...prev, active: false, timeLeft: 0 };
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }, 1000);
        } else {
            clearInterval(timerInterval.current);
        }
        return () => clearInterval(timerInterval.current);
    }, [timer.active]);

    const startTimer = (durationSeconds, message = '') => {
        setTimer({ active: true, timeLeft: durationSeconds, duration: durationSeconds, message });
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session) return;

        checkProfile(session.user.id);

        const channel = supabase
            .channel('profile_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'CompteUtilisateur',
                    filter: `id=eq.${session.user.id}`,
                },
                () => {
                    checkProfile(session.user.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]);

    // Effect to enforce profile completion on route change
    useEffect(() => {
        if (session && profileIncomplete && location.pathname !== '/dashboard/user/profile') {
            navigate('/dashboard/user/profile');
        }
    }, [location.pathname, session, profileIncomplete, navigate]);

    const checkProfile = async (userId) => {
        // Use maybeSingle to handle case where row doesn't exist yet
        const { data: profile } = await supabase
            .from('CompteUtilisateur')
            .select('prenom, nom')
            .eq('id', userId)
            .maybeSingle();

        // If profile is missing OR any field is missing, it is incomplete
        const isIncomplete = !profile || !profile.prenom || !profile.nom;

        setProfileIncomplete(isIncomplete);
        if (isIncomplete && location.pathname !== '/dashboard/user/profile') {
            navigate('/dashboard/user/profile');
        }
    };

    const navItems = [
        { icon: Home, label: 'Accueil', path: '/dashboard' },
        { icon: Users, label: 'Utilisateurs', path: '/dashboard/user' },
        { icon: GraduationCap, label: 'Suivi Global', path: '/dashboard/suivi' },
        { icon: Puzzle, label: 'Activités', path: '/dashboard/activities' },
        { icon: Settings, label: 'Paramètres', path: '/dashboard/settings' },
    ];

    // Filter nav items if not logged in
    const displayedNavItems = session
        ? navItems
        : navItems.filter(item => item.label === 'Accueil');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-primary">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-text-main font-sans overflow-hidden">
            {/* Toggle Button */}
            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={clsx(
                        "fixed z-[100] h-[46px] w-[46px] bg-surface text-primary border border-white/10 rounded-xl shadow-xl flex items-center justify-center animate-in fade-in slide-in-from-left-2 transition-all hover:bg-white/5 hover:scale-105 active:scale-95",
                        isSuiviPage ? "top-[7px] left-4" : "top-[33px] left-6"
                    )}
                    title="Afficher le menu"
                >
                    <Menu size={22} strokeWidth={2.5} />
                </button>
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "bg-surface flex flex-col border-r border-border/10 shadow-lg transition-all duration-300 relative z-50",
                isSidebarOpen ? "w-64" : "w-0 border-none opacity-0 pointer-events-none overflow-hidden"
            )}>
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-primary truncate">Gestion Classe</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-grey-medium hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {displayedNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center px-4 py-3 rounded-lg transition-colors group",
                                    isActive
                                        ? "bg-primary text-text-dark font-medium"
                                        : "text-text-main hover:bg-input"
                                )}
                            >
                                <Icon className={clsx("w-5 h-5 mr-3", isActive ? "text-text-dark" : "text-primary")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* DATE & TIMER */}
                <div className="px-4 pb-2 flex flex-col items-center gap-3 border-t border-border/10 pt-4">
                    <button
                        onClick={() => setShowTimerModal(true)}
                        className={clsx(
                            "w-full py-2 rounded-lg font-bold transition-all border flex items-center justify-center gap-2",
                            timer.active
                                ? "bg-primary/20 text-primary border-primary"
                                : "bg-input text-grey-medium border-transparent hover:bg-input/80 hover:text-text-main"
                        )}
                    >
                        {timer.active ? (
                            <div className="flex flex-col items-center justify-center w-full py-1">
                                <span className="text-xl font-mono leading-none">{formatTime(timer.timeLeft)}</span>
                                {timer.message && (
                                    <span className="text-[10px] font-bold text-grey-medium/50 uppercase tracking-wider mt-1 truncate max-w-full animate-pulse">
                                        {timer.message}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <>
                                <Clock size={16} />
                                <span className="text-sm">Minuteur</span>
                            </>
                        )}
                    </button>



                    <div className="text-xs font-bold text-grey-medium/50 uppercase tracking-wider">
                        {formattedDate}
                    </div>
                </div>

                <div className="pb-4 px-4">
                    <div className="text-[10px] text-grey-dark text-center">
                        v1.0.0
                    </div>
                </div>

                <TimerModal
                    isOpen={showTimerModal}
                    onClose={() => setShowTimerModal(false)}
                    onStart={startTimer}
                />
            </aside>

            {/* Main Content */}
            <main className={clsx(
                "flex-1 overflow-y-auto relative transition-all duration-300",
                !isSidebarOpen && "pl-20",
                isSuiviPage ? "p-0" : "p-8"
            )}>
                {profileIncomplete && (
                    <div className="absolute top-0 left-0 w-full bg-primary text-text-dark px-4 py-2 text-center font-bold z-50 shadow-md">
                        ⚠️ Merci de compléter votre profil (Nom, Prénom) pour continuer.
                    </div>
                )}
                {session ? (
                    <Outlet context={{ refreshProfile: () => checkProfile(session.user.id) }} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <User size={40} className="text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-text-main">Vous n'êtes pas connecté</h2>
                        <p className="text-grey-medium max-w-md">
                            Veuillez vous authentifier pour accéder au tableau de bord et gérer vos classes.
                        </p>
                        <Link
                            to="/login"
                            className="px-8 py-3 bg-primary text-text-dark rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 group"
                        >
                            <User size={20} />
                            Se connecter
                            <div className="w-px h-4 bg-text-dark/20 mx-1" />
                            <span className="text-xs font-normal opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
                        </Link>
                    </div>
                )}
            </main>

            {/* TIMER FINISHED MODAL */}
            {timerFinished && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface p-8 rounded-2xl border border-primary/30 shadow-2xl text-center max-w-sm w-full space-y-6 animate-in zoom-in-95 relative overflow-hidden">
                        {/* Status Light Effect */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-white to-primary animate-pulse opacity-50" />

                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2 border border-primary/20 shadow-[0_0_30px_rgba(217,185,129,0.2)]">
                            <Clock size={40} className="animate-bounce" style={{ animationDuration: '3s' }} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-text-main">Terminé !</h2>
                            <p className="text-grey-medium">Le temps est écoulé.</p>
                        </div>

                        {timer.message && (
                            <div className="bg-primary/10 px-6 py-4 rounded-xl border border-primary/20">
                                <p className="text-xl text-primary font-bold uppercase tracking-wider break-words shadow-primary/10 drop-shadow-md">
                                    {timer.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setTimerFinished(false);
                                setTimer(prev => ({ ...prev, message: '' }));
                            }}
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-text-dark text-lg font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20"
                        >
                            Je comprends
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
