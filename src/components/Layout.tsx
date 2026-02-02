import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { PageLoader } from '../core';
import clsx from 'clsx';
import { MAIN_NAV_ITEMS } from '../config/navigation';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useSidebar } from '../hooks/useSidebar';
import { Sidebar } from './layout/Sidebar';
import { PendingValidationScreen } from './layout/PendingValidationScreen';
import { UnauthenticatedScreen } from './layout/UnauthenticatedScreen';
import { checkOverdueActivities } from '../lib/helpers/overdueLogic';
import { cleanupOrphanProgressions } from '../lib/database/cleanupUtils';

const Layout: React.FC = () => {
    const location = useLocation();
    const { session, loading, logout } = useAuth();
    const { profileIncomplete, pendingValidation } = useProfile(session?.user.id);
    const { canInstall, handleInstall } = usePWAInstall();
    const { isOpen, setIsOpen } = useSidebar();

    // Run cleanup and checks when session is available
    useEffect(() => {
        if (session) {
            checkOverdueActivities(session.user.id);
            cleanupOrphanProgressions();
        }
    }, [session]);

    // Close sidebar on navigation (mobile)
    useEffect(() => {
        if (isOpen && window.innerWidth < 768) {
            setIsOpen(false);
        }
    }, [location.pathname]);

    // Page type detection
    const isSuiviPage = location.pathname === '/dashboard/suivi';
    const isPresencePage = location.pathname === '/dashboard/presence';
    const isUserPage = location.pathname.startsWith('/dashboard/user');
    const isActivitiesPage = location.pathname.startsWith('/dashboard/activities');
    const isSettingsPage = location.pathname.startsWith('/dashboard/settings');
    const isFullPage = isSuiviPage || isPresencePage || isUserPage || isActivitiesPage || isSettingsPage;

    // Filter nav items based on session and validation status
    const displayedNavItems = session
        ? (pendingValidation ? [] : MAIN_NAV_ITEMS)
        : MAIN_NAV_ITEMS.filter(item => 'label' in item && item.label === 'Accueil');

    if (loading) {
        return <PageLoader />;
    }

    return (
        <div className="flex h-screen bg-background text-text-main font-sans overflow-hidden">
            <div className="sidebar-reveal-zone" />

            {/* Burger Menu */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={clsx(
                        "fixed z-[100] h-[46px] w-[46px] rounded-xl shadow-xl flex items-center justify-center transition-all active:scale-95 bg-[#D9B981] text-black hover:bg-[#cdaf76]",
                        isFullPage ? "top-[11px] left-4" : "top-[33px] left-6"
                    )}
                    title="Afficher le menu"
                    aria-label="Ouvrir le menu"
                    aria-expanded={isOpen}
                >
                    <Menu size={24} strokeWidth={2.5} />
                </button>
            )}

            {/* Sidebar */}
            <Sidebar
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                session={session}
                navItems={displayedNavItems}
                canInstall={canInstall}
                onInstall={handleInstall}
                onLogout={logout}
            />

            {/* Spacer for desktop */}
            <div className={clsx(
                "hidden md:block transition-all duration-400 shrink-0 overflow-hidden",
                isOpen ? "w-64" : "w-0"
            )} />

            {/* Main Content */}
            <main
                onClick={() => isOpen && window.innerWidth < 768 && setIsOpen(false)}
                className={clsx(
                    "flex-1 overflow-y-auto relative transition-all duration-300",
                    isFullPage ? "p-0" : "p-8"
                )}
            >
                {pendingValidation && <PendingValidationScreen />}

                {profileIncomplete && !pendingValidation && (
                    <div className="absolute top-0 left-0 w-full bg-primary text-text-dark px-4 py-2 text-center font-bold z-50 shadow-md">
                        ⚠️ Merci de compléter votre profil (Nom, Prénom) pour continuer.
                    </div>
                )}

                {session ? (
                    <Outlet context={{ pendingValidation, isSidebarOpen: isOpen }} />
                ) : (
                    <UnauthenticatedScreen />
                )}
            </main>
        </div>
    );
};

export default Layout;
