import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { checkOverdueActivities } from '../lib/overdueLogic';
import { cleanupOrphanProgressions } from '../lib/cleanupUtils';
import { toast } from 'react-hot-toast';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Puzzle,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    Loader2,
    Calendar as CalendarIcon,
    Home,
    User,
    Clock,
    Flame,
    Smartphone,
    ShieldCheck, UserCheck,
    Monitor,
    Download
} from 'lucide-react';
import clsx from 'clsx';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    const [pendingValidation, setPendingValidation] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const isSuiviPage = location.pathname === '/dashboard/suivi';
    const isPresencePage = location.pathname === '/dashboard/presence';
    const isUserPage = location.pathname.startsWith('/dashboard/user');
    const isActivitiesPage = location.pathname.startsWith('/dashboard/activities');
    const isSettingsPage = location.pathname.startsWith('/dashboard/settings');
    const isFullPage = isSuiviPage || isPresencePage || isUserPage || isActivitiesPage || isSettingsPage;

    // Define checkProfile before useEffect to avoid "accessed before declaration" error
    const checkProfile = useCallback(async (userId) => {
        // Use maybeSingle to handle case where row doesn't exist yet
        // We also check for 'validation_admin' (Boolean). 
        // If it's explicitly FALSE, we block. If undefined/null, we allow (backward compat).
        const { data: profile } = await supabase
            .from('CompteUtilisateur')
            .select('prenom, nom, validation_admin')
            .eq('id', userId)
            .maybeSingle();

        // If profile is missing OR any field is missing, it is incomplete
        const isIncomplete = !profile || !profile.prenom || !profile.nom;

        // Check for admin validation
        // CAREFUL: We only block if it is explicitly FALSE. 
        // Ideally DB default should be FALSE for new users.
        const isPending = profile && profile.validation_admin === false;

        setProfileIncomplete(isIncomplete);
        setPendingValidation(isPending);

        if ((isIncomplete || isPending) && (location.pathname !== '/dashboard/settings' || !location.search.includes('tab=profil'))) {
            navigate('/dashboard/settings?tab=profil');
        }
    }, [location.pathname, location.search, navigate]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) {
                checkProfile(session.user.id);
                checkOverdueActivities(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
            if (session) {
                checkProfile(session.user.id);
                checkOverdueActivities(session.user.id);
                cleanupOrphanProgressions(); // Clean up mismatched level progressions
            }
        });

        return () => subscription.unsubscribe();
    }, [checkProfile]);



    // Effect to enforce profile completion on route change
    // Effect to enforce profile completion OR pending validation on route change
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const isProfileTab = location.pathname === '/dashboard/settings' && queryParams.get('tab') === 'profil';

        if (session && (profileIncomplete || pendingValidation) && !isProfileTab) {
            navigate('/dashboard/settings?tab=profil');
        }
    }, [location.pathname, location.search, session, profileIncomplete, pendingValidation, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { icon: Home, label: 'Accueil', path: '/dashboard' },
        { type: 'separator' },
        { icon: UserCheck, label: 'Présence', path: '/dashboard/presence' },
        { icon: GraduationCap, label: 'Suivi Global', path: '/dashboard/suivi' },
        { type: 'separator' },
        { icon: Users, label: 'Utilisateurs', path: '/dashboard/user' },
        { icon: Puzzle, label: 'Activités', path: '/dashboard/activities' },
        { type: 'separator' },
        { icon: Smartphone, label: 'Suivi Mobile', path: '/mobile-suivi', isExternal: true },
        { type: 'separator' },
        { icon: Settings, label: 'Paramètres', path: '/dashboard/settings' },
    ];

    // Filter nav items if not logged in OR if pending admin validation
    const displayedNavItems = session
        ? (pendingValidation ? [] : navItems)
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
            {/* Sidebar Reveal Trigger Zone */}
            <div className="sidebar-reveal-zone" />

            {/* Toggle Button */}
            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={clsx(
                        "fixed z-[100] h-[46px] w-[46px] bg-surface text-primary border border-white/10 rounded-xl shadow-xl flex items-center justify-center animate-in fade-in slide-in-from-left-2 burger-3d",
                        isFullPage ? "top-[11px] left-4" : "top-[33px] left-6"
                    )}
                    title="Afficher le menu"
                >
                    <Menu size={22} strokeWidth={2.5} />
                </button>
            )}

            {/* Sidebar (Always Fixed for hover/3D support) */}
            <aside className={clsx(
                "aside-sidebar fixed top-0 left-0 h-full w-64 bg-surface flex flex-col border-r border-border/10 shadow-lg z-50 transition-all duration-400",
                isSidebarOpen ? "is-explicitly-open" : "shadow-2xl translate-x-[-100%] opacity-0 pointer-events-none"
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

                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    {displayedNavItems.map((item, index) => {
                        if (item.type === 'separator') {
                            return (
                                <div
                                    key={`sep-${index}`}
                                    className="h-px bg-white/5 my-4 mx-2"
                                />
                            );
                        }

                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        if (item.isExternal) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={async () => {
                                        if (item.path === '/suivi-tbi') {
                                            window.open(item.path, '_blank');
                                            return;
                                        }

                                        const { data } = await supabase
                                            .from('UserPreference')
                                            .select('value')
                                            .eq('user_id', session.user.id)
                                            .eq('key', 'suivi_pedagogique_layout')
                                            .maybeSingle();

                                        const groupId = data?.value?.selectedGroupId;
                                        if (groupId) {
                                            window.open(`/mobile-suivi/${groupId}`, '_blank');
                                        } else {
                                            toast.error("Aucun groupe sélectionné dans le Suivi");
                                        }
                                    }}
                                    className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-text-main hover:bg-input"
                                >
                                    <Icon className="w-5 h-5 mr-3 text-primary shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            );
                        }

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
                                <Icon className={clsx("w-5 h-5 mr-3 shrink-0", isActive ? "text-text-dark" : "text-primary")} />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="pb-4 px-4 sticky bottom-0 bg-surface">
                    {deferredPrompt && (
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-text-main hover:bg-input hover:text-primary mb-2"
                        >
                            <Download className="w-5 h-5 mr-3 shrink-0 text-primary" />
                            <span className="truncate">Installer l'app</span>
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-text-main hover:bg-input hover:text-danger mt-2"
                        title="Se déconnecter"
                    >
                        <LogOut className="w-5 h-5 mr-3 shrink-0 group-hover:text-danger text-grey-medium" />
                        <span className="truncate group-hover:text-danger">Se déconnecter</span>
                    </button>
                    <div className="h-px bg-white/5 my-4 mx-2" />
                    <div className="text-[10px] text-grey-dark text-center">
                        v1.0.0
                    </div>
                </div>
            </aside >

            {/* Sidebar Spacer (Pushes content when open) */}
            <div
                className={clsx(
                    "hidden md:block transition-all duration-400 shrink-0 overflow-hidden",
                    isSidebarOpen ? "w-64" : "w-0"
                )}
            />

            {/* Main Content */}
            <main
                onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
                className={
                    clsx(
                        "flex-1 overflow-y-auto relative transition-all duration-300",
                        isFullPage ? "p-0" : "p-8"
                    )}>

                {/* 1. BLOCKED: Pending Validation */}
                {pendingValidation && (location.pathname !== '/dashboard/settings' || !location.search.includes('tab=profil')) && (
                    <div className="absolute inset-0 bg-surface z-[60] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_rgba(217,185,129,0.1)]">
                            <ShieldCheck size={48} className="text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-text-main mb-4">Compte en attente de validation</h2>
                        <p className="text-grey-medium max-w-lg text-lg leading-relaxed">
                            Votre compte a été créé avec succès, mais nécessite une
                            <span className="text-primary font-bold"> validation manuelle</span> de l'administrateur avant de pouvoir accéder à l'application.
                        </p>
                        <div className="mt-8 flex flex-col items-center gap-4">
                            <div className="px-6 py-3 bg-surface border border-white/5 rounded-xl text-sm text-grey-dark">
                                <span className="opacity-70">En attente de : </span>
                                <span className="font-mono text-primary font-bold">validation_admin = true</span>
                            </div>

                            <Link
                                to="/dashboard/settings?tab=profil"
                                className="text-primary hover:text-white underline underline-offset-4 text-sm transition-colors"
                            >
                                Accéder à mon profil
                            </Link>
                        </div>
                    </div>
                )}

                {/* 2. BLOCKED: Profile Incomplete (Only if not pending validation) */}
                {!pendingValidation && profileIncomplete && (
                    <div className="absolute top-0 left-0 w-full bg-primary text-text-dark px-4 py-2 text-center font-bold z-50 shadow-md">
                        ⚠️ Merci de compléter votre profil (Nom, Prénom) pour continuer.
                    </div>
                )}

                {
                    session ? (
                        <Outlet context={{ refreshProfile: () => checkProfile(session.user.id), pendingValidation }} />
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
                    )
                }
            </main >
        </div >
    );
};

export default Layout;
