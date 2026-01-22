import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { checkOverdueActivities } from '../../lib/overdueLogic';
import { getInitials } from '../../lib/utils';
import { getStatusStyle, getStatusIcon } from '../../lib/statusHelpers';
import { BookOpen, Calendar, ChevronDown, Search, Users, Check, AlertCircle, Home, GitBranch, ShieldCheck, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUpdateProgression } from '../../hooks/useUpdateProgression';

import { useAvancementData } from './hooks/useAvancementData';
import { useStudentsAndActivities, AvancementActivity } from './hooks/useStudentsAndActivities';
import { useAvancementPDF } from './hooks/useAvancementPDF';
import { useModuleSpans } from './hooks/useModuleSpans';
import { Student } from '../../features/attendance/services/attendanceService';

const AvancementAteliers: React.FC = () => {
    const { updateProgression } = useUpdateProgression();

    // Hooks
    const {
        groups, modules, branches,
        selectedGroupId, setSelectedGroupId,
        selectedModuleId, setSelectedModuleId,
        selectedBrancheId, setSelectedBrancheId,
        selectedDateFin, setSelectedDateFin,
        dateOperator, setDateOperator,
        getFilteredModules
    } = useAvancementData();

    const {
        students, activities, progressions, setProgressions, loading
    } = useStudentsAndActivities(selectedGroupId, selectedModuleId, selectedDateFin, selectedBrancheId, getFilteredModules);

    const { handleGeneratePDF } = useAvancementPDF();
    const { moduleSpans, lastActivityIds } = useModuleSpans(activities);

    // Initial data load with overdue check
    useEffect(() => {
        const loadInitialData = async () => {
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                await checkOverdueActivities(data.session.user.id);
            }
        };
        loadInitialData();
    }, []);

    const handleStatusClick = async (student: Student, activity: AvancementActivity) => {
        const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];
        const isAllowed = activityLevels.length > 0 && student.niveau_id && activityLevels.includes(student.niveau_id);

        if (!isAllowed) return;

        const currentStatus = progressions[`${student.id}-${activity.id}`] || 'a_commencer';
        const key = `${student.id}-${activity.id}`;

        await updateProgression(student.id, activity.id, currentStatus, {
            onOptimisticUpdate: (nextStatus) => {
                setProgressions(prev => ({ ...prev, [key]: nextStatus }));
            },
            onRevert: (oldStatus) => {
                setProgressions(prev => ({ ...prev, [key]: oldStatus }));
            }
        });
    };

    const getStatusColorClasses = (status: string | null) => {
        if (!status) return "bg-transparent border-transparent text-transparent";

        const baseStyle = getStatusStyle(status);
        switch (status) {
            case 'termine': return `${baseStyle} border-success text-white`;
            case 'besoin_d_aide': return `${baseStyle} border-[#A0A8AD] text-white`;
            case 'ajustement': return `${baseStyle} border-[#F59E0B] text-black`;
            case 'a_verifier': return `${baseStyle} border-[#8B5CF6] text-white`;
            case 'a_domicile': return `${baseStyle} border-danger text-white`;
            case 'a_commencer': return "bg-white/5 border-white/10 text-grey-medium hover:bg-white/10";
            default: return "bg-transparent border-transparent text-transparent";
        }
    };

    const onGeneratePDF = () => {
        handleGeneratePDF({
            students, activities, progressions, groups, modules, branches,
            selectedGroupId, selectedModuleId, selectedBrancheId, selectedDateFin, dateOperator
        });
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 space-y-6 overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BookOpen className="text-primary" />
                    Avancement des Ateliers
                </h1>
                <button
                    onClick={onGeneratePDF}
                    disabled={students.length === 0 || activities.length === 0}
                    className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Exporter PDF
                </button>
            </div>

            {/* FILTERS BAR */}
            <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border border-white/5 shadow-lg">
                {/* 1. Group Selector */}
                <div className="flex-[2] min-w-[300px] flex items-end gap-4">
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium mb-2 block ml-1">
                            Groupe
                        </label>
                        <div className="relative group">
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full bg-background border border-white/5 text-white rounded-xl py-3 pl-10 pr-10 appearance-none focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                            >
                                <option value="">Sélectionner un groupe...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id} className="bg-surface">{g.nom}</option>
                                ))}
                            </select>
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none group-hover:text-primary transition-colors" size={16} />
                        </div>
                    </div>
                </div>

                {/* 2. Operator Selector */}
                <div className="w-[160px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Critère Date
                    </label>
                    <div className="relative">
                        <select
                            value={dateOperator}
                            onChange={(e) => {
                                setDateOperator(e.target.value);
                                setSelectedModuleId('');
                            }}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-3 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="lt">Avant le</option>
                            <option value="lte">Pour ou avant</option>
                            <option value="eq">Pour le</option>
                            <option value="gt">Après le</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 3. Date Selector */}
                <div className="min-w-[200px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Date de fin
                    </label>
                    <div className="relative">
                        <select
                            value={selectedDateFin}
                            onChange={(e) => {
                                setSelectedDateFin(e.target.value);
                                setSelectedModuleId('');
                            }}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">Toutes les dates</option>
                            {Array.from(new Set(modules.map(m => m.date_fin).filter(Boolean))).sort().map(date => (
                                <option key={date!} value={date!}>
                                    {new Date(date!).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 4. Branch Selector */}
                <div className="min-w-[180px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Branche <span className="text-grey-dark">(facultatif)</span>
                    </label>
                    <div className="relative">
                        <select
                            value={selectedBrancheId}
                            onChange={(e) => {
                                setSelectedBrancheId(e.target.value);
                                setSelectedModuleId('');
                            }}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">Toutes les branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.nom}</option>
                            ))}
                        </select>
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>

                {/* 5. Module Selector */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                        Module
                    </label>
                    <div className="relative">
                        <select
                            value={selectedModuleId}
                            onChange={(e) => setSelectedModuleId(e.target.value)}
                            className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">
                                {(selectedDateFin || selectedBrancheId)
                                    ? `Tous les modules (${getFilteredModules().length})`
                                    : "Sélectionner un module..."}
                            </option>
                            {getFilteredModules()
                                .sort((a, b) => {
                                    if (!a.date_fin) return 1;
                                    if (!b.date_fin) return -1;
                                    return new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime();
                                })
                                .map(m => {
                                    const dateStr = m.date_fin
                                        ? new Date(m.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                                        : 'Sans date';
                                    return (
                                        <option key={m.id} value={m.id}>
                                            {dateStr} - {m.nom}
                                        </option>
                                    );
                                })}
                        </select>
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* MAIN TABLE CONTENT */}
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
                                                    onClick={() => handleStatusClick(student, act)}
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
                        <div className="w-4 h-4 rounded bg-[#A0A8AD] flex items-center justify-center text-white">
                            <AlertCircle size={10} />
                        </div>
                        <span className="text-xs font-medium text-grey-light">Besoin d'aide</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#F59E0B] flex items-center justify-center text-black">
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
        </div>
    );
};

export default AvancementAteliers;
