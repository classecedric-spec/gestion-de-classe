import React from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { ModuleCard } from './ModuleCard';

interface ModulesListProps {
    modules: any[];
    loading: boolean;
    expandedModuleId: string | null;
    progressions: Record<string, string>;
    savingActivity: string | null;
    onToggleModule: (moduleId: string) => void;
    onUpdateStatus: (activityId: string, newStatus: string) => void;
}

/**
 * Component for displaying the list of modules
 */
export const ModulesList: React.FC<ModulesListProps> = ({
    modules,
    loading,
    expandedModuleId,
    progressions,
    savingActivity,
    onToggleModule,
    onUpdateStatus
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (modules.length === 0) {
        return (
            <div className="text-center py-20 text-grey-medium">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Aucun module en cours</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            {modules.map(module => (
                <ModuleCard
                    key={module.id}
                    module={module}
                    isExpanded={expandedModuleId === module.id}
                    progressions={progressions}
                    savingActivity={savingActivity}
                    onToggle={() => onToggleModule(module.id)}
                    onUpdateStatus={onUpdateStatus}
                />
            ))}
        </div>
    );
};
