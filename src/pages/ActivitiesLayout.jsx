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
        <div className="h-full flex flex-col overflow-hidden">
            {/* Tabs Header */}
            <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center sticky top-0 z-40 backdrop-blur-md pl-16">
                <div className="neu-selector-container flex p-1.5 rounded-2xl w-full max-w-5xl mx-auto overflow-x-auto custom-scrollbar-hide">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname.includes(tab.path);

                        return (
                            <NavLink
                                key={tab.id}
                                to={tab.path}
                                data-active={isActive}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-[0.12em] transition-all duration-300 min-w-fit",
                                    isActive
                                        ? "bg-primary text-text-dark"
                                        : "text-grey-medium hover:text-white"
                                )}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-8 relative animate-in fade-in duration-300">
                <Outlet />
            </div>
        </div>
    );
};

export default ActivitiesLayout;
