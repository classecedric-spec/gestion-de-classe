import React from 'react';
import { Users, CheckCircle2, Calendar } from 'lucide-react';
import { getInitials } from '../../../lib/helpers';
import { Student } from '../../attendance/services/attendanceService';
import { DashboardStats } from '../hooks/useDashboardData';
import { StatCard, Avatar, Badge, Button } from '../../../components/ui';

interface DashboardKPIsProps {
    stats: DashboardStats;
    birthdays: Student[];
    planning: { count: number; label: string };
    onOpenPlanner: () => void;
}

const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ stats, birthdays, planning, onOpenPlanner }) => {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

            {/* 1. Students Count */}
            <StatCard
                title="Élèves"
                value={stats.totalStudents}
                icon={Users}
                variant="primary"
                className="xl:col-span-1"
                description={
                    stats.studentBreakdown && stats.studentBreakdown.length > 0 ? (
                        <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                            {stats.studentBreakdown.map((level, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] gap-y-1">
                                    <span className="font-bold text-grey-medium uppercase tracking-wider">{level.name}</span>
                                    <div className="flex items-center gap-2 text-grey-medium">
                                        <span className="text-white font-bold">{level.total}</span>
                                        <Badge variant="primary" size="xs" style="ghost" className="px-0 min-w-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mr-1"></span>{level.boys}
                                        </Badge>
                                        <Badge variant="danger" size="xs" style="ghost" className="px-0 min-w-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-400/80 mr-1"></span>{level.girls}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null
                }
            />

            {/* 2. Attendance */}
            <StatCard
                title="Présences"
                value={stats.attendance?.todayCount || 0}
                icon={CheckCircle2}
                variant="success"
                description={`Moyenne : ${stats.attendance?.monthlyAvg || 0}/mois`}
                trend={{
                    value: "Aujourd'hui",
                    isUp: true
                }}
            />

            {/* 4. Birthdays */}
            <StatCard
                title="Anniversaires"
                value={birthdays.length}
                icon={Calendar}
                variant="purple"
                description={
                    birthdays.length > 0 ? (
                        <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                            <div className="flex -space-x-2">
                                {birthdays.slice(0, 5).map((b, i) => (
                                    <Avatar
                                        key={i}
                                        size="xs"
                                        initials={getInitials(b as any)}
                                        className="ring-2 ring-surface bg-purple-accent text-white"
                                        tooltip={`${b.prenom} ${b.nom} (${new Date(b.date_naissance!).getDate()})`}
                                    />
                                ))}
                                {birthdays.length > 5 && (
                                    <div className="h-8 w-8 rounded-full ring-2 ring-surface bg-white/5 flex items-center justify-center text-[10px] font-bold text-grey-medium">
                                        +{birthdays.length - 5}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-grey-medium font-medium leading-relaxed italic truncate">
                                {birthdays.map(b => `${b.prenom}`).join(', ')}
                            </p>
                        </div>
                    ) : (
                        <span className="text-[10px] text-grey-dark italic">Aucun anniversaire ce mois.</span>
                    )
                }
            />

            {/* 5. Planning */}
            <StatCard
                title="Activités"
                value={planning?.count || 0}
                icon={Calendar}
                variant="warning"
                description={
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                        <p className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">
                            Semaine du {planning?.label || '...'}
                        </p>
                        <Button
                            onClick={onOpenPlanner}
                            variant="secondary"
                            size="sm"
                            className="w-full text-[9px]"
                            icon={Calendar}
                        >
                            Ouvrir le semainier
                        </Button>
                    </div>
                }
            />
        </div>
    );
};

export default DashboardKPIs;
