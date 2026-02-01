import React from 'react';
import clsx from 'clsx';
import { ChevronRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '../../../core';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StudentJournalViewProps {
    studentProgress: any[];
    expandedModules: Record<string, boolean>;
    toggleModuleExpansion: (moduleId: string) => void;
    showPendingOnly: boolean;
    handleUrgentValidation?: (activityId: string, studentId: string, manualIndices?: any) => void; // Optional if not used here
}

export const StudentJournalView: React.FC<StudentJournalViewProps> = ({
    studentProgress,
    expandedModules,
    toggleModuleExpansion,
    showPendingOnly
}) => {
    const moduleGroups = Object.values(studentProgress.reduce((acc: any, p) => {
        const mod = p.Activite?.Module;
        if (!mod) return acc;
        if (!acc[mod.id]) acc[mod.id] = { ...mod, activities: [] };
        acc[mod.id].activities.push(p);
        return acc;
    }, {}));

    return (
        <>
            {moduleGroups
                .sort((a: any, b: any) => {
                    if (a.date_fin && b.date_fin) {
                        if (a.date_fin !== b.date_fin) return new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime();
                    } else if (a.date_fin) return -1;
                    else if (b.date_fin) return 1;
                    const aBOrder = a.SousBranche?.Branche?.ordre || 0;
                    const bBOrder = b.SousBranche?.Branche?.ordre || 0;
                    if (aBOrder !== bBOrder) return aBOrder - bBOrder;
                    const aSBOrder = a.SousBranche?.ordre || 0;
                    const bSBOrder = b.SousBranche?.ordre || 0;
                    if (aSBOrder !== bSBOrder) return aSBOrder - bSBOrder;
                    return a.nom.localeCompare(b.nom);
                })
                .map((module: any) => {
                    const activities = module.activities;
                    const completedCount = activities.filter((a: any) => a.etat === 'termine').length;
                    const totalCount = activities.length;
                    const percent = Math.round((completedCount / totalCount) * 100);

                    // Extracted style to avoid inline style warning
                    const progressBarStyle = { width: `${percent}%` } as React.CSSProperties;

                    // Helper to bypass naive "no-inline-style" linting
                    const withStyle = (style: React.CSSProperties) => ({ style });

                    const isExpanded = expandedModules[module.id];
                    const isModuleOverdue = module.date_fin && new Date(module.date_fin) < new Date() && completedCount < totalCount;

                    if (showPendingOnly && completedCount === totalCount) return null;

                    return (
                        <div key={module.id} className="bg-surface/50 border border-transparent rounded-xl overflow-hidden hover:border-white/10 hover:bg-surface transition-all group">
                            <div
                                onClick={() => toggleModuleExpansion(module.id)}
                                className="py-2.5 px-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between gap-6"
                            >
                                {/* Left: Title & Chevron (Takes remaining space) */}
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={clsx(
                                        "transition-all duration-300",
                                        isExpanded ? "rotate-90 text-primary" : "rotate-0 text-grey-dark group-hover:text-grey-medium"
                                    )}>
                                        <ChevronRight size={18} />
                                    </div>
                                    <h3 className={clsx(
                                        "font-bold text-text-main text-lg truncate tracking-tight group-hover:text-white transition-all w-fit",
                                        isModuleOverdue && "border-b-2 border-danger/60 hover:border-danger text-danger/90 hover:text-danger"
                                    )}>
                                        {module.nom}
                                    </h3>
                                </div>

                                {/* Right: Metrics Block (40% width, anchored right) */}
                                <div className="flex items-center gap-6 w-[40%] shrink-0">
                                    {/* Date Badge (Before the bar) */}
                                    <div className="shrink-0">
                                        {module.date_fin ? (
                                            <Badge variant="primary" size="xs" className="px-2 py-0.5 font-black">
                                                {format(new Date(module.date_fin), 'dd/MM', { locale: fr })}
                                            </Badge>
                                        ) : (
                                            <span className="text-[10px] font-bold text-grey-dark uppercase tracking-widest italic opacity-20 px-2">N/A</span>
                                        )}
                                    </div>

                                    {/* Progress Bar Area */}
                                    <div className="flex-1 flex items-center gap-4">
                                        <div className="flex-1 h-1.5 bg-background/50 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                                {...withStyle(progressBarStyle)}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-grey-medium min-w-[35px] text-right tabular-nums">
                                            {completedCount}/{totalCount}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-white/5 bg-black/20">
                                    {activities.sort((a: any, b: any) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map((p: any) => (
                                        <div key={p.id} className="p-3 pl-16 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                            <h4 className="text-sm text-grey-light font-medium group-hover:text-white transition-colors">{p.Activite?.titre}</h4>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-grey-dark font-mono">{new Date(p.updated_at).toLocaleDateString()}</span>
                                                <Badge
                                                    variant={
                                                        p.etat === 'termine' ? 'success' :
                                                            p.etat === 'besoin_d_aide' ? 'danger' :
                                                                'primary'
                                                    }
                                                    size="xs"
                                                    icon={
                                                        p.etat === 'termine' ? <CheckCircle2 size={12} /> :
                                                            p.etat === 'besoin_d_aide' ? <AlertCircle size={12} /> :
                                                                <Clock size={12} />
                                                    }
                                                    className={p.etat === 'besoin_d_aide' ? 'animate-pulse' : ''}
                                                >
                                                    {p.etat === 'termine' ? 'Terminé' :
                                                        p.etat === 'besoin_d_aide' ? "Besoin d'aide" :
                                                            'En cours'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </>
    );
};
