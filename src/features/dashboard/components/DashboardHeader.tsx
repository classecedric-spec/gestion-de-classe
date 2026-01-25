import React from 'react';
import { Search, LayoutList, Users, AlertCircle } from 'lucide-react';
import { SmartTabs, Input } from '../../../components/ui';

interface DashboardHeaderProps {
    userName: string | null;
    userEmail: string | null;
    currentTab: string;
    setCurrentTab: (tab: string) => void;
    showSearch: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSidebarOpen: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userName,
    userEmail,
    currentTab,
    setCurrentTab,
    showSearch,
    searchQuery,
    setSearchQuery,
    isSidebarOpen
}) => {

    const tabs = [
        { id: 'overview', label: "Vue d'ensemble", icon: LayoutList },
        { id: 'students', label: 'Élèves', icon: Users },
        { id: 'urgent', label: 'Vision Urgente', icon: AlertCircle }
    ];

    return (
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 flex items-center">
                {!isSidebarOpen && (
                    <h1 className="text-2xl font-black text-text-main uppercase tracking-tight leading-none animate-in fade-in">
                        {userName ? `Bonjour ${userName}` : (userEmail ? `Bonjour ${userEmail.split('@')[0]}` : 'Bienvenue')}
                    </h1>
                )}
                {showSearch && (
                    <div className="ml-4 w-full max-w-sm hidden md:block">
                        <Input
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={Search}
                        />
                    </div>
                )}
            </div>

            {/* Center: Tabs (Absolute on Desktop for perfect centering) */}
            <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 md:z-10 overflow-x-auto no-scrollbar">
                <SmartTabs
                    tabs={tabs}
                    activeTab={currentTab}
                    onChange={setCurrentTab}
                    disableCompact={true}
                />
            </div>

            <div className="hidden md:block flex-1"></div>
        </header>
    );
};

export default DashboardHeader;
