import React from 'react';
import { Outlet, NavLink, useLocation, useOutletContext } from 'react-router-dom';
import { GraduationCap, Layers, BookOpen, User, Activity } from 'lucide-react';
import clsx from 'clsx';

const UserManagement = () => {
    const location = useLocation();
    const { pendingValidation } = useOutletContext() || {};

    const tabs = [
        { id: 'groups', label: 'Groupes', path: '/dashboard/user/groups', icon: Layers },
        { id: 'classes', label: 'Classes', path: '/dashboard/user/classes', icon: BookOpen },
        { id: 'students', label: 'Élèves', path: '/dashboard/user/students', icon: GraduationCap },
        { id: 'niveaux', label: 'Niveaux', path: '/dashboard/user/niveaux', icon: Layers },
        { id: 'adults', label: 'Adultes', path: '/dashboard/user/adults', icon: User },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Tabs Header - Hide if pending validation */}
            {!pendingValidation && (
                <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center sticky top-0 z-40 backdrop-blur-md pl-16">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-white/10 w-full max-w-4xl mx-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname.includes(tab.path);

                            return (
                                <NavLink
                                    key={tab.id}
                                    to={tab.path}
                                    className={({ isActive }) => clsx(
                                        "flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                                        isActive
                                            ? "bg-primary text-text-dark shadow-lg shadow-primary/20 scale-100"
                                            : "text-grey-medium hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-8 relative animate-in fade-in duration-300">
                <Outlet context={{ pendingValidation }} />
            </div>
        </div>
    );
};

export default UserManagement;
