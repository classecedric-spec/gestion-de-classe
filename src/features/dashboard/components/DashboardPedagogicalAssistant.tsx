import React from 'react';
import { TrendingUp, Users } from 'lucide-react';
import clsx from 'clsx';
import { LEVEL_COLORS, BranchStat, DashboardSuggestion } from '../hooks/useDashboardData';
import { Student } from '../../attendance/services/attendanceService';

interface DashboardPedagogicalAssistantProps {
    branchStats: BranchStat[];
    suggestions: DashboardSuggestion[];
    yesterdayAbsentees: Student[];
    lastActiveLabel?: string;
    onStudentClick: (student: Student) => void;
}

const DashboardPedagogicalAssistant: React.FC<DashboardPedagogicalAssistantProps> = ({
    branchStats,
    suggestions,
    yesterdayAbsentees,
    lastActiveLabel,
    onStudentClick
}) => {
    return (
        <div className="mt-6">
            <section className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-2xl border border-primary/10">
                <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3">
                    <TrendingUp className="text-primary w-5 h-5" /> Assistant Pédagogique
                </h2>

                {/* Circular Charts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
                    {branchStats.map(stat => (
                        <div key={stat.name} className="bg-surface/50 p-4 rounded-xl border border-white/5 flex flex-col items-center gap-3 hover:bg-white/5 transition-all">
                            <div className="relative w-16 h-16">
                                <div
                                    className="w-full h-full rounded-full"
                                    style={{
                                        background: stat.gradient
                                    }}
                                />
                                <div className="absolute inset-0 m-auto w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-white/5">
                                    <span className="text-xs font-black text-white">{stat.rate}%</span>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-text-main uppercase tracking-tighter w-full text-center break-words" title={stat.name}>
                                {stat.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-3 w-full justify-center">
                                <div className="flex items-center gap-1" title="Fini (Terminé + À vérif.)">
                                    <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                    <span className="text-xs font-bold text-grey-medium">{stat.done}</span>
                                </div>
                                <div className="flex items-center gap-1" title="En cours">
                                    <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                                    <span className="text-xs font-bold text-grey-medium">{stat.notDone}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Level Legend */}
                <div className="flex flex-wrap justify-center gap-4 mb-8 px-4">
                    {Object.entries(LEVEL_COLORS).map(([level, color]) => (
                        <div key={level} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs font-bold text-grey-medium">{level}</span>
                        </div>
                    ))}
                </div>

                {/* Suggestions List */}
                <div className="space-y-3 pt-6 border-t border-white/5">
                    <p className="text-xs font-bold text-grey-medium mb-2 uppercase tracking-widest">Suggestions</p>
                    {suggestions.map((sug, i) => (
                        <div key={i} className="bg-surface/50 p-4 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-7 h-7 rounded-lg flex items-center justify-center",
                                    sug.type === 'presentation' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-500'
                                )}>
                                    <TrendingUp size={14} />
                                </div>
                                <span className="text-sm font-bold text-text-main">{sug.title}</span>
                            </div>
                            <p className="text-xs text-grey-medium pl-10">{sug.desc}</p>
                            {sug.student && (
                                <div className="pl-10">
                                    <button
                                        onClick={() => onStudentClick(sug.student!)}
                                        className="text-[10px] font-black uppercase text-primary hover:underline"
                                    >
                                        Ouvrir le suivi
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {suggestions.length === 0 && (
                        <p className="text-xs text-grey-dark italic text-center py-4">Pas de suggestions particulières.</p>
                    )}
                </div>
            </section>

            {/* Yesterday Absentees */}
            {yesterdayAbsentees && yesterdayAbsentees.length > 0 && (
                <section className="bg-surface p-6 rounded-2xl border border-white/5 h-fit mt-6">
                    <h2 className="text-lg font-bold text-text-main flex items-center gap-3 mb-6">
                        <span className="text-danger w-5 h-5 flex items-center justify-center"><Users size={18} /></span> Absentéisme ({lastActiveLabel || 'Hier'})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {yesterdayAbsentees.map(s => (
                            <span key={s.id} onClick={() => onStudentClick(s)} className="px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-[10px] font-black uppercase cursor-pointer hover:bg-danger/20 transition-all">
                                {s.prenom}
                            </span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default DashboardPedagogicalAssistant;
