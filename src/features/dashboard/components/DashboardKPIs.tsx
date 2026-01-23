import React from 'react';
import { Users, CheckCircle2, Calendar } from 'lucide-react';
import { getInitials } from '../../../lib/helpers';
import { Student } from '../../attendance/services/attendanceService';
import { DashboardStats } from '../hooks/useDashboardData';

interface DashboardKPIsProps {
    stats: DashboardStats;
    birthdays: Student[];
    planning: { count: number; label: string };
    onOpenPlanner: () => void;
}

const KPICard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-surface border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
        {children}
    </div>
);

const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ stats, birthdays, planning, onOpenPlanner }) => {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

            {/* 1. Students Count */}
            <KPICard>
                <div className="min-h-[88px]">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-blue-500 text-white shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-3xl font-black text-text-main">{stats.totalStudents}</span>
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">élèves</span>
                        </div>
                    </div>
                </div>
                {stats.studentBreakdown && stats.studentBreakdown.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-white/5 flex-1">
                        {stats.studentBreakdown.map((level, idx) => (
                            <div key={idx} className="flex flex-wrap justify-between items-center text-sm gap-y-1">
                                <span className="font-bold text-grey-light uppercase">{level.name}</span>
                                <div className="flex items-center gap-3 text-grey-medium font-medium">
                                    <span className="text-white font-bold">{level.total}</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400/80"></span>{level.boys}</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400/80"></span>{level.girls}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </KPICard>

            {/* 2. Attendance */}
            <KPICard>
                <div className="min-h-[88px]">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-emerald-500 text-white shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-3xl font-black text-text-main">{stats.attendance?.todayCount || 0}</span>
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">présents</span>
                        </div>
                    </div>
                </div>
                <div className="pt-3 border-t border-white/5 flex-1">
                    <p className="text-sm font-bold text-grey-medium flex flex-wrap justify-between items-center gap-2">
                        <span>Moyenne/mois</span>
                        <span className="text-white bg-white/5 px-2 py-1 rounded-md">{stats.attendance?.monthlyAvg || 0}</span>
                    </p>
                </div>
            </KPICard>



            {/* 4. Birthdays */}
            <KPICard>
                <div className="min-h-[88px] flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="p-3 rounded-xl bg-pink-500 text-white shrink-0">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-3xl font-black text-text-main">{birthdays.length}</span>
                            <span className="text-sm font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">anniv. ce mois</span>
                        </div>
                    </div>

                    {birthdays.length > 0 && (
                        <div className="flex flex-wrap -space-x-2 overflow-hidden px-1">
                            {birthdays.slice(0, 5).map((b, i) => (
                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-pink-500 flex items-center justify-center text-xs font-bold text-white relative z-10" title={`${b.prenom} ${b.nom} (${new Date(b.date_naissance!).getDate()})`}>
                                    {getInitials(b as any)}
                                </div>
                            ))}
                            {birthdays.length > 5 && (
                                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-white/10 flex items-center justify-center text-xs font-bold text-white z-0">
                                    +{birthdays.length - 5}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-white/5 flex-1">
                    {birthdays.length > 0 ? (
                        <p className="text-xs text-grey-medium font-medium leading-relaxed">
                            {birthdays.map(b => `${b.prenom} (${new Date(b.date_naissance!).getDate()})`).join('; ')}
                        </p>
                    ) : (
                        <span className="text-xs text-grey-dark italic">Aucun anniversaire ce mois.</span>
                    )}
                </div>
            </KPICard>

            {/* 5. Planning */}
            <KPICard>
                <div className="min-h-[88px]">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-orange-500 text-white shrink-0">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-3xl font-black text-text-main">
                                {planning?.count || 0}
                            </span>
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-wider whitespace-nowrap">activités</span>
                        </div>
                    </div>
                </div>
                <div className="pt-3 border-t border-white/5 flex-1 flex flex-col justify-between">
                    <p className="text-sm font-bold text-grey-medium mb-3">
                        Semaine du {planning?.label || '...'}
                    </p>
                    <button
                        onClick={onOpenPlanner}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                        <Calendar size={12} className="text-orange-500" />
                        Ouvrir le semainier
                    </button>
                </div>
            </KPICard>
        </div>
    );
};

export default DashboardKPIs;
