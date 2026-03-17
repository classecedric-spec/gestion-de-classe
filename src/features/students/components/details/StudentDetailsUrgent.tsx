import React from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../../../../core';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StudentDetailsUrgentProps {
    totalOverdueCount: number;
    hasOverdueWork: boolean;
    sortedModules: any[];
    expandedModules: Record<string, boolean>;
    toggleModuleExpansion: (moduleId: string) => void;
    handleUrgentValidation: (activityId: string, studentId: string, studentIndices: any) => void;
    selectedStudent: any;
    studentIndices: any;
}

export const StudentDetailsUrgent: React.FC<StudentDetailsUrgentProps> = ({
    totalOverdueCount,
    hasOverdueWork,
    sortedModules,
    expandedModules,
    toggleModuleExpansion,
    handleUrgentValidation,
    selectedStudent,
    studentIndices
}) => {
    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold text-text-main flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <AlertCircle size={24} className="text-primary" />
                    <span>Travaux à terminer</span>
                </div>
                <span className="text-sm font-normal text-grey-medium ml-2 bg-white/5 px-2 py-0.5 rounded-full">
                    {totalOverdueCount} ateliers
                </span>
            </h3>

            {!hasOverdueWork ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-grey-medium opacity-60">
                    <CheckCircle2 size={48} className="mb-4 text-success" />
                    <p className="text-lg font-medium">Aucun travail en cours !</p>
                    <p className="text-sm">Tout est à jour.</p>
                </div>
            ) : (
                sortedModules.map((module: any) => {
                    const isExpanded = expandedModules[module.id];
                    const activities = module.activities;
                    const completedCount = activities.filter((a: any) => a.etat === 'termine').length;
                    const totalCount = activities.length;
                    const percent = Math.round((completedCount / totalCount) * 100);

                    return (
                        <div key={module.id} className="bg-surface/50 border border-transparent rounded-xl overflow-hidden hover:border-white/10 hover:bg-surface transition-all group">
                            <div
                                onClick={() => toggleModuleExpansion(module.id)}
                                className="py-1.5 px-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between gap-6"
                            >
                                {/* Left: Title & Chevron */}
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={clsx(
                                        "transition-all duration-300",
                                        isExpanded ? "rotate-90 text-primary" : "rotate-0 text-grey-dark group-hover:text-grey-medium"
                                    )}>
                                        <ChevronRight size={18} />
                                    </div>
                                    <h3 className={clsx(
                                        "font-bold text-text-main text-lg truncate tracking-tight group-hover:text-white transition-all w-fit"
                                    )}>
                                        {module.nom}
                                    </h3>
                                </div>

                                {/* Right: Metrics Block */}
                                <div className="flex items-center gap-6 w-[40%] shrink-0">
                                    {/* Date Badge */}
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
                                                className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] dynamic-width"
                                                style={{ "--dynamic-width": `${percent}%` } as React.CSSProperties}
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
                                    {module.activities.sort((a: any, b: any) => (a.Activite?.ordre || 0) - (b.Activite?.ordre || 0)).map((p: any) => (
                                        <div key={p.id} className="p-3 pl-16 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                            <h4 className="text-sm text-grey-light font-medium group-hover:text-white transition-colors">
                                                <span className="text-xs text-grey-dark mr-2">#{p.Activite?.ordre}</span>
                                                {p.Activite?.titre}
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUrgentValidation(p.Activite.id, selectedStudent.id, studentIndices);
                                                    }}
                                                    className={clsx(
                                                        "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105",
                                                        p.etat === 'besoin_d_aide'
                                                            ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 animate-pulse"
                                                            : p.etat === 'a_verifier'
                                                                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 font-bold"
                                                                : "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                                                    )}
                                                >
                                                    {p.etat === 'a_verifier' ? <ShieldCheck size={10} /> : <Clock size={10} />}
                                                    {p.etat === 'besoin_d_aide' ? "Besoin d'aide" : 
                                                     p.etat === 'a_verifier' ? "À vérifier" : 
                                                     "En cours"}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};
