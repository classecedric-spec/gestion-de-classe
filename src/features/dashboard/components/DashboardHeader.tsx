import React from 'react';
import { Search, LayoutList, CheckSquare, Users, Activity, Settings2, AlertCircle } from 'lucide-react';
import { Tabs, Input } from '../../../components/ui';

interface DashboardHeaderProps {
    userName: string | null;
    userEmail: string | null;
    currentTab: string;
    setCurrentTab: (tab: string) => void;
    showSearch: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userName,
    userEmail,
    currentTab,
    setCurrentTab,
    showSearch,
    searchQuery,
    setSearchQuery
}) => {

    const tabs = [
        { id: 'overview', label: "Vue d'ensemble", icon: LayoutList },
        { id: 'retard', label: 'En Retard', icon: AlertCircle },
        { id: 'students', label: 'Élèves', icon: Users },
        { id: 'summary', label: 'Bilan du Jour', icon: CheckSquare },
        { id: 'analytics', label: 'Analyses', icon: Activity },
        { id: 'tools', label: 'Outils', icon: Settings2 }
    ];

    return (
        <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 flex items-center">
                <h1 className="text-2xl font-black text-text-main uppercase tracking-tight leading-none">
                    {userName ? `Bonjour ${userName}` : (userEmail ? `Bonjour ${userEmail.split('@')[0]}` : 'Bienvenue')}
                </h1>
                {showSearch && (
                    <div className="ml-4 w-full max-w-sm hidden md:block">
                        <Input
                            placeholder="Rechercher un élève..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={Search}
                            size="sm"
                        />
                    </div>
                )}
            </div>

            {/* Center: Tabs (Absolute on Desktop for perfect centering) */}
            <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 md:z-10 overflow-x-auto no-scrollbar">
                <Tabs
                    tabs={tabs}
                    activeTab={currentTab}
                    onChange={setCurrentTab}
                    variant="neu"
                    size="sm"
                />
            </div>

            <div className="hidden md:block flex-1"></div>
        </header>
    );
};

export default DashboardHeader;
