import React from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { getInitials } from '../../../lib/helpers';
import { Student } from '../../attendance/services/attendanceService';
import { DashboardData } from '../hooks/useDashboardData';

interface DashboardPriorityTrackingProps {
    priorityData: DashboardData['priorityStudents'];
    onStudentClick: (student: Student) => void;
}

interface StudentListItemProps {
    student: any;
    badgeColor: string;
    badgeText: string;
    hoverContent?: React.ReactNode;
    onStudentClick: (student: any) => void;
}

const StudentListItem: React.FC<StudentListItemProps> = ({ student, badgeColor, badgeText, hoverContent, onStudentClick }) => (
    <div
        className="group flex flex-wrap items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors gap-2 cursor-pointer relative"
        onClick={() => onStudentClick(student)}
    >
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-background border border-white/10 flex items-center justify-center text-xs font-bold text-grey-medium shrink-0">
                {getInitials(student)}
            </div>
            <span className="text-base font-medium text-text-secondary">{student.prenom} {student.nom}</span>
        </div>
        <div className="relative">
            <span className={clsx("text-sm font-bold px-2 py-1 rounded-md whitespace-nowrap", badgeColor)}>
                {badgeText}
            </span>
            {hoverContent && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-32 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none">
                    {hoverContent}
                </div>
            )}
        </div>
    </div>
);

const DailyStatsTable: React.FC<{ stats: Record<string, number>; label: string }> = ({ stats, label }) => (
    <>
        <p className="text-[10px] font-bold text-grey-light mb-2 border-b border-white/10 pb-1">{label}</p>
        <table className="w-full text-[10px]">
            <tbody>
                {Object.entries(stats || {}).map(([day, count]) => (
                    <tr key={day} className="border-b border-white/5 last:border-0 text-grey-medium">
                        <td className="py-1">{day}</td>
                        <td className={clsx("py-1 text-right font-bold", count > 0 ? "text-success" : "text-grey-dark")}>{count}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </>
);

const DashboardPriorityTracking: React.FC<DashboardPriorityTrackingProps> = ({ priorityData, onStudentClick }) => {

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                Priorités Suivi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {/* Col 1: Least Active Yesterday */}
                <div className="bg-surface p-5 rounded-2xl border border-white/5 h-full">
                    <h3 className="text-base font-bold text-grey-light uppercase tracking-wide mb-4">📉 Moins Actifs ({priorityData.lastActiveLabel || 'Hier'})</h3>
                    <div className="space-y-3">
                        {priorityData.yesterday?.map((s, i) => (
                            <StudentListItem
                                key={i}
                                student={s}
                                badgeColor="text-danger bg-danger/10"
                                badgeText={`${s.score} enc.`}
                                hoverContent={<DailyStatsTable stats={s.dailyStats} label="Détail Semaine" />}
                                onStudentClick={onStudentClick}
                            />
                        ))}
                        {(!priorityData.yesterday || priorityData.yesterday.length === 0) && (
                            <p className="text-sm text-grey-dark italic">Données insuffisantes</p>
                        )}
                    </div>
                </div>

                {/* Col 2: Least Validated This Week */}
                <div className="bg-surface p-5 rounded-2xl border border-white/5 h-full">
                    <h3 className="text-base font-bold text-grey-light uppercase tracking-wide mb-4">📅 Validations Faibles (Sem.)</h3>
                    <div className="space-y-3">
                        {priorityData.week?.map((s, i) => (
                            <StudentListItem
                                key={i}
                                student={s}
                                badgeColor="text-warning bg-warning/10"
                                badgeText={`${s.score} val.`}
                                hoverContent={<DailyStatsTable stats={s.dailyStats} label="Validations Semaine" />}
                                onStudentClick={onStudentClick}
                            />
                        ))}
                        {(!priorityData.week || priorityData.week.length === 0) && (
                            <p className="text-sm text-grey-dark italic">Données insuffisantes</p>
                        )}
                    </div>
                </div>

                {/* Col 3: Lowest Completion Rate */}
                <div className="bg-surface p-5 rounded-2xl border border-white/5 h-full">
                    <h3 className="text-base font-bold text-grey-light uppercase tracking-wide mb-4">⚠️ Taux Achèvement Faible</h3>
                    <div className="space-y-3">
                        {priorityData.completion?.map((s, i) => (
                            <div key={i} className="group flex flex-wrap items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors gap-2 cursor-pointer relative" onClick={() => onStudentClick(s)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-background border border-white/10 flex items-center justify-center text-xs font-bold text-grey-medium shrink-0">
                                        {getInitials(s)}
                                    </div>
                                    <span className="text-base font-medium text-text-secondary">{s.prenom} {s.nom}</span>
                                </div>
                                <div className="text-right relative">
                                    <span className="block text-sm font-bold text-danger">{s.displayScore}%</span>
                                    <span className="text-xs text-grey-dark whitespace-nowrap">{s.startedCount} en cours</span>

                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none text-left">
                                        <p className="text-[10px] font-bold text-grey-light mb-2 border-b border-white/10 pb-1">Taux par Branche</p>
                                        <table className="w-full text-[10px]">
                                            <tbody>
                                                {s.branchStats?.map((stat: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-white/5 last:border-0 text-grey-medium">
                                                        <td className="py-1 truncate max-w-[100px]">{stat.name}</td>
                                                        <td className={clsx("py-1 text-right font-bold", stat.rate < 50 ? "text-danger" : "text-success")}>{stat.rate}%</td>
                                                    </tr>
                                                ))}
                                                {(!s.branchStats || s.branchStats.length === 0) && (
                                                    <tr><td className="py-1 text-grey-dark italic" colSpan={2}>Aucune donnée</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!priorityData.completion || priorityData.completion.length === 0) && (
                            <p className="text-sm text-grey-dark italic">Données insuffisantes</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardPriorityTracking;
