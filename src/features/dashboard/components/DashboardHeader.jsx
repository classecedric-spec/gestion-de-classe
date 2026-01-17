import React from 'react';
import { Search, LayoutList, CheckSquare, Users, Activity, Settings2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const DashboardHeader = ({
    userName,
    userEmail,
    currentTab,
    setCurrentTab,
    showSearch,
    searchQuery,
    setSearchQuery
}) => {

    const tabs = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutList },
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
                    <div className="flex items-center gap-3 ml-4">
                        <div className="relative flex-1 max-w-sm hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-dark" size={14} />
                            <input
                                type="text"
                                placeholder="Rechercher un élève..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-white/5 rounded-xl pl-10 pr-4 py-1.5 text-xs text-text-main focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="neu-selector-container p-1 rounded-xl md:absolute md:left-1/2 md:-translate-x-1/2 z-10 transition-all">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCurrentTab(tab.id)}
                        className={clsx(
                            "rounded-lg font-black uppercase tracking-widest transition-all p-2",
                            currentTab === tab.id ? "bg-primary text-text-dark shadow-lg shadow-primary/20" : "text-grey-medium hover:text-white"
                        )}
                    >
                        <tab.icon size={14} />
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="hidden md:block flex-1"></div>
        </header>
    );
};

export default DashboardHeader;
