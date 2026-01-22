import React from 'react';
import { Users } from 'lucide-react';

interface Group {
    id: string;
    nom: string;
}

interface GroupSelectorProps {
    isOpen: boolean;
    groups: Group[];
    onSelect: (groupId: string) => void;
}

/**
 * GroupSelector
 * Modal for selecting a group
 */
const GroupSelector = React.memo<GroupSelectorProps>(({ isOpen, groups, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95">
                <h2 className="text-2xl font-bold text-white">Sélectionner un Groupe</h2>
                <div className="grid grid-cols-1 gap-3">
                    {groups.length === 0 ? (
                        <p className="text-grey-medium">Aucun groupe trouvé.</p>
                    ) : (
                        groups.map(g => (
                            <button
                                key={g.id}
                                onClick={() => onSelect(g.id)}
                                className="p-4 bg-background/50 hover:bg-primary/20 hover:border-primary border border-white/10 rounded-xl transition-all text-lg font-bold text-white flex items-center justify-center gap-2 group"
                            >
                                <Users className="group-hover:text-primary transition-colors" /> {g.nom}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
});

GroupSelector.displayName = 'GroupSelector';

export default GroupSelector;
