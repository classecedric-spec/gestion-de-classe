import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Folder, FileText, Settings, Layers, GitBranch, Globe, Package } from 'lucide-react';
import clsx from 'clsx';

const ActivitiesLayout = () => {
    const location = useLocation();

    // The user requested buttons for "Module" and "Activité".
    // I am adding placeholders for potential future tabs as well to match the 'User' layout style.
    const tabs = [
        { id: 'modules', label: 'Modules', path: '/dashboard/activities/modules', icon: Folder },
        { id: 'activities', label: 'Activités', path: '/dashboard/activities/list', icon: FileText },
        { id: 'branches', label: 'Branches', path: '/dashboard/activities/branches', icon: GitBranch },
        { id: 'sub-branches', label: 'Sous-branches', path: '/dashboard/activities/sub-branches', icon: Layers },
        { id: 'materiels', label: 'Matériel', path: '/dashboard/activities/materiels', icon: Package },
    ];

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Tabs Header */}
            <div className="flex items-center space-x-2 bg-surface/30 p-1 rounded-xl w-full border border-white/5 backdrop-blur-sm shadow-sm">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname.includes(tab.path);

                    return (
                        <NavLink
                            key={tab.id}
                            to={tab.path}
                            className={({ isActive }) => clsx(
                                "flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300",
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

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative animate-in fade-in duration-300 slide-in-from-bottom-2">
                <Outlet />
            </div>
        </div>
    );
};

export default ActivitiesLayout;
