/**
 * @page Settings
 * @description Page des paramètres de l'application. 
 * Organisée en deux onglets : Système et Profil.
 */

import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { User, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';

// Feature Hooks
import { useProfileSettings } from '../../features/settings/hooks/useProfileSettings';

// Feature Components
import { SettingsProfileTab } from '../../features/settings/components/SettingsProfileTab';
import { SettingsSystemTab } from '../../features/settings/components/SettingsSystemTab';

const Settings: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'systeme';

    const [activeTab, setActiveTab] = useState(initialTab);
    const { refreshProfile, pendingValidation } = useOutletContext<any>() || {};

    // profile hook
    const {
        profile, setProfile, loadingProfile, updatingProfile,
        getProfile, updateProfile
    } = useProfileSettings(refreshProfile);

    // Initial load
    useEffect(() => {
        getProfile();
    }, [getProfile]);

    // Sync active tab with URL
    useEffect(() => {
        const tab = queryParams.get('tab');
        if (tab && tab !== activeTab) setActiveTab(tab);
    }, [location.search, activeTab]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        navigate(`/dashboard/settings?tab=${tabId}`, { replace: true });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header / Tabs Navigation */}
            <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shrink-0 pl-16">
                <div className="min-w-[200px]" />
                <div className="flex-1 flex justify-center">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => handleTabChange('systeme')}
                            className={clsx(
                                "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2",
                                activeTab === 'systeme' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            <SettingsIcon size={16} /> Système
                        </button>
                        <button
                            onClick={() => handleTabChange('profil')}
                            className={clsx(
                                "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2",
                                activeTab === 'profil' ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            <User size={16} /> Profil
                        </button>
                    </div>
                </div>
                <div className="min-w-[200px] flex justify-end">
                    <p className="text-[10px] text-grey-dark uppercase tracking-widest font-black opacity-50">Configuration</p>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    <div className="animate-in fade-in duration-500">
                        {activeTab === 'profil' && (
                            <SettingsProfileTab
                                profile={profile}
                                setProfile={setProfile}
                                loadingProfile={loadingProfile}
                                updatingProfile={updatingProfile}
                                updateProfile={updateProfile}
                                pendingValidation={pendingValidation}
                            />
                        )}

                        {activeTab === 'systeme' && (
                            <SettingsSystemTab
                                setProfile={setProfile}
                                refreshProfile={refreshProfile}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
