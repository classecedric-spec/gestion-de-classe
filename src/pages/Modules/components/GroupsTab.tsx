import React from 'react';
import { Users, CheckSquare, Check } from 'lucide-react';
import clsx from 'clsx';
import { Tables } from '../../../../types/supabase';

interface GroupsTabProps {
    groups: Tables<'Groupe'>[];
    selectedGroups: string[];
    onToggleGroup: (groupId: string) => void;
    onGenerate: () => void;
    generatingProgressions?: boolean;
    progress?: number;
    progressText?: string;
}

/**
 * GroupsTab
 * Group selection grid for progression generation
 */
const GroupsTab: React.FC<GroupsTabProps> = ({
    groups,
    selectedGroups,
    onToggleGroup,
    onGenerate,
    generatingProgressions = false,
    progress = 0,
    progressText = ''
}) => {
    if (groups.length === 0) {
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="col-span-full text-center p-12 bg-surface/10 rounded-2xl border border-dashed border-white/10 italic text-grey-medium">
                        Aucun groupe trouvé dans votre base.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => (
                    <div
                        key={group.id}
                        onClick={() => onToggleGroup(group.id)}
                        className={clsx(
                            "p-6 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-4 group relative overflow-hidden",
                            selectedGroups.includes(group.id)
                                ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/10"
                                : "bg-surface/30 border-white/5 hover:border-white/10 hover:bg-surface/50"
                        )}
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center transition-all",
                            selectedGroups.includes(group.id) ? "bg-text-dark/10" : "bg-background text-primary"
                        )}>
                            <Users size={28} />
                        </div>
                        <div className="min-w-0">
                            <h4 className={clsx("font-black uppercase tracking-tight text-sm", selectedGroups.includes(group.id) ? "text-text-dark" : "text-text-main")}>
                                {group.nom}
                            </h4>
                        </div>
                        <div className={clsx(
                            "absolute top-3 right-3 w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                            selectedGroups.includes(group.id) ? "bg-text-dark/10 border-text-dark/20 text-text-dark" : "border-white/10 text-transparent opacity-0 group-hover:opacity-100"
                        )}>
                            <Check size={16} strokeWidth={3} />
                        </div>
                        <div className={clsx(
                            "absolute -bottom-4 -right-4 w-12 h-12 rounded-full blur-2xl transition-opacity",
                            selectedGroups.includes(group.id) ? "bg-text-dark/20 opacity-100" : "bg-primary/5 opacity-0 group-hover:opacity-100"
                        )} />
                    </div>
                ))}
            </div>
            <div className="pt-4">
                <button
                    onClick={onGenerate}
                    disabled={selectedGroups.length === 0 || generatingProgressions}
                    className={clsx(
                        "w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-4 transition-all active:scale-[0.98] hover:scale-[1.02]",
                        generatingProgressions
                            ? "bg-primary text-text-dark shadow-xl shadow-primary/20"
                            : "bg-success text-text-dark shadow-xl shadow-success/20 hover:bg-success/90"
                    )}
                >
                    {generatingProgressions ? (
                        <div className="w-full px-8 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-dark">
                                <span className="truncate pr-4">{progressText}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-text-dark/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-text-dark transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-8 h-8 rounded-full bg-text-dark/10 flex items-center justify-center">
                                <CheckSquare size={20} strokeWidth={3} />
                            </div>
                            Générer le suivi complet
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default GroupsTab;
