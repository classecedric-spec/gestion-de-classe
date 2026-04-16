import React, { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    Calendar, 
    CheckCircle2, 
    Circle, 
    BarChart3, 
    CheckCircle,
    ClipboardList,
    ChevronRight,
    ChevronDown,
    FileText,
    Layout
} from 'lucide-react';
import clsx from 'clsx';

interface ProgressionSummaryProps {
    studentProgress: any[];
}

interface ActivityData {
    id: string;
    nom: string;
    etat: string;
    updatedAt: string | null;
}

interface ModuleData {
    id: string;
    nom: string;
    total: number;
    finished: number;
    activities: ActivityData[];
}

interface MonthData {
    monthKey: string;
    monthDate: Date;
    totalActivities: number;
    finishedActivities: number;
    modules: Record<string, ModuleData>;
}

export const StudentDetailsProgressionSummary: React.FC<ProgressionSummaryProps> = ({ studentProgress }) => {
    // États d'expansion
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    const toggleMonth = (key: string) => {
        setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleModule = (key: string) => {
        setExpandedModules(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const statsByMonth = useMemo(() => {
        const monthMap: Record<string, MonthData> = {};

        studentProgress.forEach(p => {
            const moduleId = p.Activite?.Module?.id;
            const moduleName = p.Activite?.Module?.nom || 'Sans nom';
            const dateFin = p.Activite?.Module?.date_fin;
            if (!moduleId || !dateFin) return;

            const date = parseISO(dateFin);
            const monthKey = format(date, 'yyyy-MM');

            if (!monthMap[monthKey]) {
                monthMap[monthKey] = {
                    monthKey,
                    monthDate: startOfMonth(date),
                    totalActivities: 0,
                    finishedActivities: 0,
                    modules: {}
                };
            }

            if (!monthMap[monthKey].modules[moduleId]) {
                monthMap[monthKey].modules[moduleId] = {
                    id: moduleId,
                    nom: moduleName,
                    total: 0,
                    finished: 0,
                    activities: []
                };
            }

            const isFinished = p.etat === 'valide' || p.etat === 'termine';
            
            monthMap[monthKey].totalActivities++;
            if (isFinished) monthMap[monthKey].finishedActivities++;

            const module = monthMap[monthKey].modules[moduleId];
            module.total++;
            if (isFinished) module.finished++;
            module.activities.push({
                id: p.Activite.id,
                nom: p.Activite.nom,
                etat: p.etat || 'a_commencer',
                updatedAt: p.updated_at
            });
        });

        return Object.values(monthMap).sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());
    }, [studentProgress]);

    if (statsByMonth.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-grey-medium opacity-40 italic gap-3">
                <Calendar size={32} strokeWidth={1} />
                <p>Aucune planification par mois disponible.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                <div className="w-full">
                    {/* Header quasi-table */}
                    <div className="grid grid-cols-12 bg-white/5 border-b border-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-grey-medium">
                        <div className="col-span-5 flex items-center gap-2">
                            <Calendar size={12} className="text-primary-light" />
                            Mois / Dossier / Activité
                        </div>
                        <div className="col-span-2 text-center flex items-center justify-center gap-2">
                            <Layout size={12} className="text-primary-light" />
                            Dossiers
                        </div>
                        <div className="col-span-2 text-center flex items-center justify-center gap-2">
                            <ClipboardList size={12} className="text-secondary" />
                            Activités
                        </div>
                        <div className="col-span-3 text-right flex items-center justify-end gap-2">
                            <BarChart3 size={12} className="text-primary" />
                            Progression
                        </div>
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-white/5">
        {statsByMonth.map((month) => {
            const isMonthExpanded = expandedMonths[month.monthKey];
            const monthPercentage = month.totalActivities > 0 
                ? Math.round((month.finishedActivities / month.totalActivities) * 100) 
                : 0;
            
            const totalModules = Object.keys(month.modules).length;
            const finishedModules = Object.values(month.modules).filter(m => m.total > 0 && m.finished === m.total).length;
            
            return (
                <React.Fragment key={month.monthKey}>
                    {/* RANGÉE MOIS */}
                    <div 
                        onClick={() => toggleMonth(month.monthKey)}
                        className={clsx(
                            "grid grid-cols-12 px-4 py-4 cursor-pointer transition-all hover:bg-white/10 group items-center",
                            isMonthExpanded ? "bg-white/5" : ""
                        )}
                    >
                        <div className="col-span-5 flex items-center gap-3">
                            <ChevronRight 
                                size={16} 
                                className={clsx("transition-transform duration-300 text-grey-medium", isMonthExpanded && "rotate-90 text-primary")} 
                            />
                            <span className="text-sm font-bold text-text-main capitalize">
                                {format(month.monthDate, 'MMMM yyyy', { locale: fr })}
                            </span>
                        </div>
                        <div className="col-span-2 text-center">
                            <span className={clsx(
                                "text-sm font-bold tabular-nums",
                                finishedModules === totalModules && totalModules > 0 
                                    ? "text-success" 
                                    : "text-grey-light"
                            )}>
                                {finishedModules} / {totalModules}
                            </span>
                        </div>
                        <div className="col-span-2 text-center">
                            <span className="text-sm font-bold text-grey-light tabular-nums">
                                {month.finishedActivities} / {month.totalActivities}
                            </span>
                        </div>
                        <div className="col-span-3 flex flex-col items-end gap-1">
                                            <span className={clsx(
                                                "text-[11px] font-black tabular-nums",
                                                monthPercentage === 100 ? "text-success" : monthPercentage >= 50 ? "text-primary-light" : "text-grey-medium"
                                            )}>
                                                {monthPercentage}%
                                            </span>
                                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div 
                                                    className={clsx(
                                                        "h-full transition-all duration-500 rounded-full",
                                                        monthPercentage === 100 ? "bg-success" : "bg-primary"
                                                    )}
                                                    style={{ width: `${monthPercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* RANGÉES DOSSIERS (Modules) */}
                                    {isMonthExpanded && Object.values(month.modules).map((module) => {
                                        const isModuleExpanded = expandedModules[module.id];
                                        const modulePercentage = module.total > 0 
                                            ? Math.round((module.finished / module.total) * 100) 
                                            : 0;
                                        return (
                                            <React.Fragment key={module.id}>
                                                <div 
                                                    onClick={() => toggleModule(module.id)}
                                                    className={clsx(
                                                        "grid grid-cols-12 pl-8 pr-4 py-3 cursor-pointer transition-all hover:bg-white/10 items-center border-l-2 relative overflow-hidden",
                                                        isModuleExpanded ? "border-primary bg-white/5" : "border-transparent"
                                                    )}
                                                >
                                                    {/* Background Progress Fill */}
                                                    <div 
                                                        className={clsx(
                                                            "absolute inset-0 z-0 transition-all duration-700 opacity-10",
                                                            modulePercentage === 100 ? "bg-success" : "bg-secondary"
                                                        )}
                                                        style={{ width: `${modulePercentage}%` }}
                                                    />

                                                    <div className="col-span-5 flex items-center gap-3 relative z-10">
                                                        <ChevronRight 
                                                            size={14} 
                                                            className={clsx("transition-transform duration-300 text-grey-dark", isModuleExpanded && "rotate-90 text-secondary")} 
                                                        />
                                                        <Layout size={14} className="text-grey-dark opacity-40" />
                                                        <span className="text-xs font-semibold text-grey-light truncate">
                                                            {module.nom}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 relative z-10"></div>
                                                    <div className="col-span-2 text-center relative z-10">
                                                        <span className="text-xs font-medium text-grey-dark tabular-nums">
                                                            {module.finished} / {module.total}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 flex flex-col items-end gap-1 relative z-10">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={clsx(
                                                                "text-[10px] font-black tabular-nums",
                                                                modulePercentage === 100 ? "text-success" : "text-grey-medium"
                                                            )}>
                                                                {modulePercentage}%
                                                            </span>
                                                            {modulePercentage === 100 && (
                                                                <CheckCircle size={10} className="text-success" />
                                                            )}
                                                        </div>
                                                        <div className="w-12 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className={clsx(
                                                                    "h-full transition-all duration-500 rounded-full",
                                                                    modulePercentage === 100 ? "bg-success" : "bg-secondary"
                                                                )}
                                                                style={{ width: `${modulePercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* RANGÉES ACTIVITÉS */}
                                                {isModuleExpanded && module.activities.map((activity) => {
                                                    const isDone = activity.etat === 'valide' || activity.etat === 'termine';
                                                    return (
                                                        <div 
                                                            key={activity.id}
                                                            className="grid grid-cols-12 pl-14 pr-4 py-2 items-center bg-black/10 border-l-2 border-white/5"
                                                        >
                                                            <div className="col-span-9 flex items-center gap-3">
                                                                {isDone ? (
                                                                    <CheckCircle2 size={12} className="text-success shrink-0" />
                                                                ) : (
                                                                    <Circle size={12} className="text-grey-dark opacity-30 shrink-0" />
                                                                )}
                                                                <FileText size={12} className="text-grey-dark opacity-20 shrink-0" />
                                                                <span className={clsx(
                                                                    "text-[11px] truncate",
                                                                    isDone ? "text-grey-medium italic" : "text-grey-dark"
                                                                )}>
                                                                    {activity.nom}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-3 text-right">
                                                                <span className={clsx(
                                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                                    isDone ? "bg-success/10 text-success" : "bg-white/5 text-grey-dark"
                                                                )}>
                                                                    {activity.etat === 'termine' ? 'Terminé' : activity.etat === 'valide' ? 'Validé' : 'À faire'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-1 px-1 text-[10px] text-grey-medium opacity-60">
                <div className="flex items-center gap-2">
                    <Circle size={8} fill="currentColor" className="text-primary" />
                    <span>Cliquez sur un mois pour voir les dossiers.</span>
                </div>
                <div className="flex items-center gap-2">
                    <Circle size={8} fill="currentColor" className="text-secondary" />
                    <span>Cliquez sur un dossier pour voir le détail des activités.</span>
                </div>
            </div>
        </div>
    );
};
