import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Download, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/database';
import type { Session } from '@supabase/supabase-js';
import type { MainNavItem, NavItem } from '../../config/navigation';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session | null;
    navItems: MainNavItem[];
    canInstall: boolean;
    onInstall: () => void;
    onLogout: () => void;
}

/**
 * Sidebar navigation component
 */
export function Sidebar({
    isOpen,
    onClose,
    session,
    navItems,
    canInstall,
    onInstall,
    onLogout
}: SidebarProps) {
    const location = useLocation();

    const handleExternalNavClick = async (navItem: NavItem) => {
        if (navItem.path === '/suivi-tbi') {
            window.open(navItem.path, '_blank');
            return;
        }

        if (!session) return;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', session.user.id)
            .eq('key', 'suivi_pedagogique_layout')
            .maybeSingle();

        const groupId = (data?.value as any)?.selectedGroupId;
        if (groupId) {
            window.open(`/mobile-suivi/${groupId}`, '_blank');
        } else {
            toast.error("Aucun groupe sélectionné dans le Suivi");
        }
    };

    return (
        <aside className={clsx(
            "aside-sidebar fixed top-0 left-0 h-full w-64 bg-surface flex flex-col border-r border-border/10 shadow-lg z-50 transition-all duration-400",
            isOpen ? "is-explicitly-open" : "shadow-2xl translate-x-[-100%] opacity-0 pointer-events-none"
        )}>
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-primary truncate">
                    Gestion Classe
                </h1>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-grey-medium hover:text-white transition-colors"
                    title="Fermer le menu"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {navItems.map((item, index) => {
                    if ('type' in item && item.type === 'separator') {
                        return (
                            <div
                                key={`sep-${index}`}
                                className="h-px bg-white/5 my-4 mx-2"
                            />
                        );
                    }

                    const navItem = item as NavItem;
                    const Icon = navItem.icon;
                    const isActive = location.pathname === navItem.path;

                    if (navItem.isExternal) {
                        return (
                            <button
                                key={navItem.label}
                                onClick={() => {
                                    handleExternalNavClick(navItem);
                                    onClose();
                                }}
                                className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-text-main hover:bg-input"
                            >
                                <Icon className="w-5 h-5 mr-3 text-primary shrink-0" />
                                <span className="truncate">{navItem.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={navItem.path}
                            to={navItem.path}
                            onClick={onClose}
                            className={clsx(
                                "flex items-center px-4 py-3 rounded-lg transition-colors group",
                                isActive
                                    ? "bg-primary text-text-dark font-medium"
                                    : "text-text-main hover:bg-input"
                            )}
                        >
                            <Icon className={clsx(
                                "w-5 h-5 mr-3 shrink-0",
                                isActive ? "text-text-dark" : "text-primary"
                            )} />
                            <span className="truncate">{navItem.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="pb-4 px-4 sticky bottom-0 bg-surface">
                {canInstall && (
                    <button
                        onClick={onInstall}
                        className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-text-main hover:bg-input hover:text-primary mb-2"
                    >
                        <Download className="w-5 h-5 mr-3 shrink-0 text-primary" />
                        <span className="truncate">Installer l'app</span>
                    </button>
                )}

                <button
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-text-main hover:bg-input hover:text-danger mt-2"
                    title="Se déconnecter"
                >
                    <LogOut className="w-5 h-5 mr-3 shrink-0 group-hover:text-danger text-grey-medium" />
                    <span className="truncate group-hover:text-danger">Se déconnecter</span>
                </button>

                <div className="h-px bg-white/5 my-4 mx-2" />
                <div className="text-[10px] text-grey-dark text-center">v1.0.0</div>
            </div>
        </aside>
    );
}
