import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Users, CheckSquare, LayoutList, Loader2 } from 'lucide-react';
import PdfProgress from '../../../components/ui/PdfProgress';
import { DashboardContextType } from '../DashboardContext';
import WeeklyPlannerModal from '../../../components/WeeklyPlannerModal';
const DashboardOverview: React.FC = () => {
    const navigate = useNavigate();
    const {
        dashboardData,
        groups,
        selectedGroup,
        setSelectedGroup,
        generateGroupTodoList,
        isGenerating,
        progress,
        progressText,
    } = useOutletContext<DashboardContextType>();

    const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = React.useState(false);

    return (
        <div className="space-y-6">
            {/* LIGNE 1: Stats Cards + PDF Widget */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Card 1: Students Count (Detailed) */}
                <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-blue-500 text-white shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{dashboardData.stats?.totalStudents || 0}</span>
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-wider">élèves</span>
                        </div>
                    </div>

                    {/* Breakdown by level */}
                    {dashboardData.stats?.studentBreakdown && dashboardData.stats.studentBreakdown.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-white/5 flex-1">
                            {dashboardData.stats?.studentBreakdown.map((level: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-grey-light uppercase">{level.name}</span>
                                    <div className="flex items-center gap-3 text-grey-medium font-medium">
                                        <span className="text-white font-bold">{level.total}</span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-400/80"></span>{level.boys}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-pink-400/80"></span>{level.girls}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Card 2: Presence */}
                <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-grey-medium uppercase tracking-wider">Présences</h3>
                        <CheckSquare className="text-emerald-500" size={20} />
                    </div>
                    <p className="text-3xl font-black text-white">{dashboardData.stats?.attendance?.todayCount || 0}</p>
                    <p className="text-xs text-grey-medium mt-1">Aujourd'hui</p>
                </div>

                {/* Card 3: Birthdays */}
                <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-grey-medium uppercase tracking-wider">Anniversaires</h3>
                        <span className="text-2xl">🎂</span>
                    </div>
                    <p className="text-3xl font-black text-white">{dashboardData.birthdays?.length || 0}</p>
                    <p className="text-xs text-grey-medium mt-1">Ce mois-ci</p>
                </div>

                {/* Card 4: Création des listes (Integrated Selector) */}
                <div className="p-5 bg-surface/50 border border-white/5 rounded-3xl flex flex-col justify-between overflow-hidden relative group">
                    {/* Header: Icon + Title */}
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider leading-tight">Listes & Émargement</h4>
                    </div>

                    <div className="relative z-10 space-y-3">
                        {/* Integrated Group Selector */}
                        <select
                            value={selectedGroup?.id || ''}
                            onChange={(e) => {
                                const groupId = e.target.value;
                                const group = groups?.find(g => g.id === groupId);
                                setSelectedGroup(group || null);
                            }}
                            className="w-full bg-background/80 border border-white/10 text-xs text-white rounded-lg p-2 appearance-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all cursor-pointer hover:bg-background"
                        >
                            <option value="">Tous les groupes</option>
                            {groups?.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.nom}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => generateGroupTodoList(selectedGroup)}
                            disabled={!selectedGroup || isGenerating}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? "Génération..." : "Générer"}
                        </button>
                    </div>

                    {/* Background decoration */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500"></div>
                </div>
            </div>

            {/* LIGNE 2: Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Présence */}
                <button
                    onClick={() => navigate('/dashboard/presence')}
                    className="flex items-center gap-4 p-5 bg-surface/50 hover:bg-surface border border-white/5 rounded-3xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <CheckSquare size={24} />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-black uppercase tracking-widest text-white leading-none mb-1">Présence</span>
                        <span className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">Faire l'appel</span>
                    </div>
                </button>

                {/* Suivi Global */}
                <button
                    onClick={() => navigate('/dashboard/suivi')}
                    className="flex items-center gap-4 p-5 bg-surface/50 hover:bg-surface border border-white/5 rounded-3xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <LayoutList size={24} />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-black uppercase tracking-widest text-white leading-none mb-1">Suivi Global</span>
                        <span className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">Avancement général</span>
                    </div>
                </button>

                {/* Suivi Groupe */}
                <button
                    onClick={() => navigate('/dashboard/suivi?tab=groups')}
                    className="flex items-center gap-4 p-5 bg-surface/50 hover:bg-surface border border-white/5 rounded-3xl transition-all group hover:scale-[1.02] active:scale-[0.98]"
                >
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                        <Users size={24} />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-black uppercase tracking-widest text-white leading-none mb-1">Suivi Groupe</span>
                        <span className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">Par classe ou groupe</span>
                    </div>
                </button>
            </div>

            {/* Progress Indicator (shared component) */}
            <PdfProgress
                isGenerating={isGenerating}
                progressText={progressText}
                progressPercentage={progress}
                className="max-w-2xl"
            />

            {/* LIGNE 3: Weekly Planner */}
            <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-text-main">Semainier</h3>
                    <button
                        onClick={() => setIsWeeklyPlannerOpen(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-text-dark rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Ouvrir le semainier
                    </button>
                </div>
                <p className="text-sm text-grey-medium">
                    Planifiez vos activités de la semaine et organisez votre emploi du temps.
                </p>
            </div>

            <div className="p-8 text-center text-grey-medium opacity-30 bg-surface/30 rounded-3xl border border-white/5 border-dashed">
                <p className="uppercase tracking-[0.3em] font-black text-[10px]">Options en cours de développement</p>
            </div>

            <WeeklyPlannerModal
                isOpen={isWeeklyPlannerOpen}
                onClose={() => setIsWeeklyPlannerOpen(false)}
            />
        </div>
    );
};

export default DashboardOverview;
