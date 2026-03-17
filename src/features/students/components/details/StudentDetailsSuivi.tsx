import React from 'react';
import { LayoutList, GitGraph, Activity, Loader2 } from 'lucide-react';
import { Tabs } from '../../../../core';
import { StudentJournalView } from '../../../tracking/components/StudentJournalView';

interface StudentDetailsSuiviProps {
    studentProgress: any[];
    loadingProgress: boolean;
    suiviMode: 'journal' | 'progression';
    setSuiviMode: (mode: 'journal' | 'progression') => void;
    showPendingOnly: boolean;
    setShowPendingOnly: (show: boolean) => void;
    expandedModules: Record<string, boolean>;
    toggleModuleExpansion: (moduleId: string) => void;
    handleUrgentValidation: (activityId: string, studentId: string, studentIndices: any) => void;
    handleResetActivity: (progressionId: string) => void;
}

export const StudentDetailsSuivi: React.FC<StudentDetailsSuiviProps> = ({
    studentProgress,
    loadingProgress,
    suiviMode,
    setSuiviMode,
    showPendingOnly,
    setShowPendingOnly,
    expandedModules,
    toggleModuleExpansion,
    handleUrgentValidation,
    handleResetActivity
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-start gap-2 mb-6">
                <Tabs
                    tabs={[
                        { id: 'journal', label: 'Journal', icon: LayoutList },
                        { id: 'progression', label: 'Progression', icon: GitGraph }
                    ]}
                    activeTab={suiviMode}
                    onChange={(tabId) => setSuiviMode(tabId as 'journal' | 'progression')}
                    level={3}
                    smart
                />

                {suiviMode === 'journal' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                        <Tabs
                            tabs={[
                                { id: 'pending', label: 'En cours', icon: Activity, variant: 'warning' },
                                { id: 'all', label: 'Tout voir', icon: LayoutList, variant: 'primary' }
                            ]}
                            activeTab={showPendingOnly ? 'pending' : 'all'}
                            onChange={(tabId) => setShowPendingOnly(tabId === 'pending')}
                            level={3}
                            smart
                        />
                    </div>
                )}
            </div>

            {loadingProgress ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
            ) : studentProgress.length === 0 ? (
                <div className="text-center p-8 text-grey-medium opacity-60 italic">Aucune activité commencée.</div>
            ) : (
                <div className="space-y-6">
                    {suiviMode === 'journal' && (
                        <div className="space-y-1">
                            <StudentJournalView
                                studentProgress={studentProgress}
                                expandedModules={expandedModules}
                                toggleModuleExpansion={toggleModuleExpansion}
                                showPendingOnly={showPendingOnly}
                                handleUrgentValidation={handleUrgentValidation}
                                handleResetActivity={handleResetActivity}
                            />
                        </div>
                    )}
                    {/* Progression view could be added here if needed */}
                </div>
            )}
        </div>
    );
};
