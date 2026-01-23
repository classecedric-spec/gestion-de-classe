import React from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { ActivityItem } from './ActivityItem';

interface ModuleCardProps {
    module: any;
    isExpanded: boolean;
    progressions: Record<string, string>;
    savingActivity: string | null;
    onToggle: () => void;
    onUpdateStatus: (activityId: string, newStatus: string) => void;
}

/**
 * Component for displaying a module with its activities
 */
export const ModuleCard: React.FC<ModuleCardProps> = ({
    module,
    isExpanded,
    progressions,
    savingActivity,
    onToggle,
    onUpdateStatus
}) => {
    const branchName = module.SousBranche?.Branche?.nom || '';

    return (
        <div className="bg-surface/50 border border-border rounded-2xl overflow-hidden">
            {/* Module Header */}
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
            >
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary border border-primary/10 shrink-0">
                    <BookOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest truncate">
                        {branchName} • {module.SousBranche?.nom}
                    </p>
                    <h3 className="text-sm font-bold text-white truncate">{module.nom}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${module.percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-grey-medium">
                            {module.completedActivities}/{module.totalActivities}
                        </span>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={20} className="text-primary shrink-0" />
                ) : (
                    <ChevronDown size={20} className="text-grey-medium shrink-0" />
                )}
            </button>

            {/* Activities List */}
            {isExpanded && (
                <div className="border-t border-white/5 p-3 space-y-2 bg-background/50">
                    {module.filteredActivities?.map((activity: any) => (
                        <ActivityItem
                            key={activity.id}
                            activity={activity}
                            currentStatus={progressions[activity.id] || 'a_commencer'}
                            isSaving={savingActivity === activity.id}
                            onUpdateStatus={onUpdateStatus}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
