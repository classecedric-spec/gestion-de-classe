import React from 'react';
import { Outlet, useLocation, useOutletContext, useNavigate } from 'react-router-dom';
import { USER_MANAGEMENT_TABS } from '../config/navigation';
import { SmartTabs } from '../components/ui';

const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { pendingValidation } = useOutletContext<any>() || {};

    const tabs = USER_MANAGEMENT_TABS;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Tabs Header - Hide if pending validation */}
            {!pendingValidation && (
                <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center justify-center sticky top-0 z-40 backdrop-blur-md">
                    <SmartTabs
                        tabs={tabs.map(t => ({ id: t.path, label: t.label, icon: t.icon }))}
                        activeTab={tabs.find(t => location.pathname.includes(t.path))?.path || tabs[0].path}
                        onChange={(path: string) => navigate(path)}
                    />
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-8 relative animate-in fade-in duration-300">
                <Outlet key={location.pathname} context={{ pendingValidation }} />
            </div>
        </div>
    );
};

export default UserManagement;
