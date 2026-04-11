import React from 'react';
import { Search, Check, AlertCircle, Home, ShieldCheck, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
// @ts-ignore
import { getInitials, getStatusStyle, getStatusIcon } from '../../../lib/helpers';
import { Student } from '../../../features/attendance/services/attendanceService';
import { AvancementActivity } from '../hooks/useStudentsAndActivities';

interface AvancementTableProps {
    loading: boolean;
    students: any[];
    activities: AvancementActivity[];
    progressions: Record<string, string>;
    moduleSpans: any[];
    modules: any[];
    lastActivityIds: Set<string>;
    onStatusClick: (student: Student, activity: AvancementActivity) => void;
    selectedGroupId: string;
    selectedModuleId: string;
    selectedDateFin: string;
}

export const AvancementTable: React.FC<AvancementTableProps> = ({
    loading,
    students,
    activities,
    progressions,
    moduleSpans,
    modules,
    lastActivityIds,
    onStatusClick,
    selectedGroupId,
    selectedModuleId,
    selectedDateFin
}) => {

    const getStatusColorClasses = (status: string | null) => {
        if (!status) return "bg-transparent border-transparent text-transparent";

        const baseStyle = getStatusStyle(status);
        switch (status) {
            case 'termine': return `${baseStyle} border-success text-white`;
            case 'besoin_d_aide': return `${baseStyle} border-grey-medium text-white`;
            case 'ajustement': return `${baseStyle} border-amber-accent text-black`;
            case 'a_verifier': return `${baseStyle} border-purple-accent text-white`;
            case 'a_domicile': return `${baseStyle} border-danger text-white`;
            case 'a_commencer': return "bg-white/5 border-white/10 text-grey-medium hover:bg-white/10";
            default: return "bg-transparent border-transparent text-transparent";
        }
    };

    return (
        <div className="flex-1 bg-surface rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
            <div className="overflow-auto flex-1 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-grey-medium">
                        <p className="animate-pulse">Chargement des données...</p>
                    </div>
                ) : !selectedGroupId || (!selectedModuleId && !selectedDateFin) ? (
                    <div className="h-full flex flex-col items-center justify-center text-grey-medium gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <Search size={32} opacity={0.5} />
                        </div>
                        <p>Veuillez sélectionner un groupe et une date (ou un module) pour voir l'avancement.</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-grey-medium">
                        <p>Aucun élève dans ce groupe.</p>
                    </div>
                ) : (
                    <table className="w-max border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20 bg-surface shadow-sm">
                            {moduleSpans.length > 0 && (
                                <tr className="border-b border-white/10">
                                    <th className="sticky left-0 top-0 z-40 bg-surface border-r border-white/10 h-12 min-w-[150px]"></th>
                                    {moduleSpans.map((span, sIdx) => (
                                        <th
                                            key={`${span.id}-${sIdx}`}
                                            colSpan={span.count}
                                            className="sticky top-0 z-30 p-2 bg-surface"
                                        >
                                            <div className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap mx-1 flex items-center justify-between gap-4">
                                                <span>{span.nom}</span>
                                                {modules.find(m => m.id === span.id)?.date_fin && (
                                                    <span className="text-primary font-medium opacity-80 shrink-0">
                                                        {format(new Date(modules.find(m => m.id === span.id)!.date_fin!), 'dd/MM', { locale: fr })}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            )}
                            <tr className="border-b border-white/10">
                                <th className="sticky left-0 top-[48px] z-30 bg-surface p-4 text-left min-w-[150px] border-r border-white/10 border-b border-white/10 h-full">
                                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Élève</span>
                                </th>
                                {activities.map((act) => (
                                    <th key={act.id} className={clsx(
                                        "sticky top-[48px] z-20 p-0 min-w-[52px] align-bottom pb-2 relative group/th bg-surface vertical-header border-b border-white/10",
                                        lastActivityIds.has(act.id) && "border-r border-white/10"
                                    )}>
                                        <div className="flex flex-col items-center justify-end h-[100px] w-full">
                                            <span className="text-[10px] font-medium text-grey-light uppercase tracking-wide leading-tight [writing-mode:vertical-rl] rotate-180 whitespace-nowrap" title={act.titre}>
                                                {act.titre}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="sticky left-0 z-10 bg-surface group-hover:bg-surface-light p-3 min-w-[150px] border-r border-white/10 border-t border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                                {student.photo_base64 ? (
                                                    <img src={student.photo_base64} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] font-bold text-primary">{getInitials(student)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold text-white whitespace-nowrap" title={`${student.prenom} ${student.nom}`}>
                                                    {student.prenom} {student.nom?.[0]}.
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {activities.map((act) => {
                                        const status = progressions[`${student.id}-${act.id}`];
                                        const activityLevels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
                                        const isAllowed = activityLevels.length > 0 && student.niveau_id && activityLevels.includes(student.niveau_id);
                                        const displayStatus = status || (isAllowed ? 'a_commencer' : null);

                                        return (
                                            <td
                                                key={`${student.id}-${act.id}`}
                                                onClick={() => onStatusClick(student, act)}
                                                className={clsx(
                                                    "p-0 border-t border-white/10 relative group/cell transition-colors min-w-[52px]",
                                                    isAllowed ? "cursor-pointer hover:bg-white/5" : "cursor-default",
                                                    lastActivityIds.has(act.id) && "border-r border-white/10"
                                                )}
                                            >
                                                <div className="w-full h-[52px] flex items-center justify-center">
                                                    {isAllowed ? (
                                                        <div className={clsx(
                                                            "w-10 h-10 flex items-center justify-center transition-all rounded-lg",
                                                            getStatusColorClasses(displayStatus),
                                                            !displayStatus && "opacity-0"
                                                        )}>
                                                            {(() => {
                                                                const IconComponent = getStatusIcon(displayStatus as any);
                                                                return IconComponent ? <IconComponent size={20} /> : null;
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full bg-white/5"></div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 px-4 py-3 bg-white/5 rounded-xl border border-white/10 w-fit mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-success flex items-center justify-center text-white">
                        <Check size={10} />
                    </div>
                    <span className="text-xs font-medium text-grey-light">Terminé</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-grey-medium flex items-center justify-center text-white">
                        <AlertCircle size={10} />
                    </div>
                    <span className="text-xs font-medium text-grey-light">Besoin d'aide</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-accent flex items-center justify-center text-black">
                        <Settings2 size={10} />
                    </div>
                    <span className="text-xs font-medium text-grey-light">Ajustement</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-danger flex items-center justify-center text-white">
                        <Home size={10} />
                    </div>
                    <span className="text-xs font-medium text-grey-light">À domicile (Retard)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-accent flex items-center justify-center text-white">
                        <ShieldCheck size={10} />
                    </div>
                    <span className="text-xs font-medium text-grey-light">À Vérifier</span>
                </div>
            </div>
        </div>
    );
};
