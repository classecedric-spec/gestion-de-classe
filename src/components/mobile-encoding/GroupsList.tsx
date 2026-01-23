import React from 'react';
import { Users, ChevronDown, Loader2 } from 'lucide-react';

interface GroupsListProps {
    groups: any[];
    loading: boolean;
    onSelectGroup: (group: any) => void;
}

/**
 * Component for displaying the list of groups
 */
export const GroupsList: React.FC<GroupsListProps> = ({ groups, loading, onSelectGroup }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="text-center py-20 text-grey-medium">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Aucun groupe disponible</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-2">
            {groups.map(group => (
                <button
                    key={group.id}
                    onClick={() => onSelectGroup(group)}
                    className="w-full flex items-center gap-4 bg-surface/50 border border-border p-4 rounded-xl hover:bg-surface hover:border-primary/30 transition-all text-left"
                >
                    <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center text-primary border border-primary/10">
                        <Users size={22} />
                    </div>
                    <span className="text-sm font-bold text-white flex-1">{group.nom}</span>
                    <ChevronDown size={16} className="text-grey-medium -rotate-90" />
                </button>
            ))}
        </div>
    );
};
