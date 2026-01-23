import React from 'react';
import { Outlet, NavLink, useLocation, useOutletContext } from 'react-router-dom';
import clsx from 'clsx';
import { USER_MANAGEMENT_TABS } from '../config/navigation';

const UserManagement: React.FC = () => {
    const location = useLocation();
    const { pendingValidation } = useOutletContext<any>() || {};

    const tabs = USER_MANAGEMENT_TABS;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Tabs Header - Hide if pending validation */}
            {!pendingValidation && (
                <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center sticky top-0 z-40 backdrop-blur-md pl-16">
                    <div className="neu-selector-container p-1.5 rounded-2xl mx-auto overflow-hidden">
                        {tabs.map((tab: any) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname.includes(tab.path);

                            return (
                                <NavLink
                                    key={tab.id}
                                    to={tab.path}
                                    data-active={isActive}
                                    className={clsx(
                                        "rounded-xl font-black uppercase tracking-[0.12em] transition-all duration-300",
                                        isActive
                                            ? "bg-primary text-text-dark"
                                            : "text-grey-medium hover:text-white"
                                    )}
                                >
                                    <Icon size={16} />
                                    <span className="tab-label">{tab.label}</span>
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
