import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckSquare, LayoutList, Users, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

// Hooks (Now in features/dashboard/hooks)
import { useHomeData } from '../../features/dashboard/hooks/useHomeData';
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData';
import { useGroupPdfGenerator } from '../../features/dashboard/hooks/useGroupPdfGenerator';

// Components
import DashboardHeader from '../../features/dashboard/components/DashboardHeader';
import DashboardTools from '../../features/dashboard/components/DashboardTools';
import DashboardStudentList from '../../features/dashboard/components/DashboardStudentList';

// Modals (Keep existing for now, future refactor)
import RandomPickerModal from '../../components/RandomPickerModal';
import WeeklyPlannerModal from '../../components/WeeklyPlannerModal';
import { Student } from '../../features/attendance/services/attendanceService';

const Home: React.FC = () => {
    const navigate = useNavigate();

    // Use extracted hooks
    const {
        user,
        userName,
        students,
        groups,
        selectedGroup,
        setSelectedGroup,
        loading,
        fetchInitialData
    } = useHomeData();

    const {
        dashboardData,
        loading: loadingStats,
        fetchDashboardDetails
    } = useDashboardData();

    const {
        generateGroupTodoList,
        cancelGeneration,
        isGenerating,
        progressText
    } = useGroupPdfGenerator();

    // Local state
    const [searchParams, setSearchParams] = useSearchParams();

    // Derived state from URL or default to 'overview'
    const currentTab = searchParams.get('tab') || 'overview';

    const setCurrentTab = (tab: string) => {
        setSearchParams({ tab });
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
    const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false);

    // ESC key handler for PDF generation
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isGenerating && e.key === 'Escape') cancelGeneration();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isGenerating, cancelGeneration]);

    // Fetch data on mount - only once
    useEffect(() => {
        const loadData = async () => {
            const result = await fetchInitialData();
            if (result.user && result.studentsData) {
                await fetchDashboardDetails(result.user.id, result.studentsData);
            }
        };
        loadData();
    }, []); // Empty array = run only once on mount

    const handleStudentClick = (student: Student, tab = 'suivi') => {
        navigate('/dashboard/user/students', {
            state: {
                selectedStudentId: student.id,
                initialTab: tab
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500" >

            <DashboardHeader
                userName={userName}
                userEmail={user?.email || null}
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                showSearch={currentTab === 'students'}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            {loadingStats ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 text-grey-medium">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="font-bold uppercase tracking-widest text-xs">Préparation des données...</p>
                </div>
            ) : (
                <>
                    {currentTab === 'overview' && (
                        <div className="space-y-6">
                            {/* LIGNE 1: Group Selector + Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Card 1: Group Selector */}
                                <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                                    <h3 className="text-sm font-bold text-grey-medium uppercase tracking-wider mb-3">
                                        Sélectionner un groupe
                                    </h3>
                                    <select
                                        value={selectedGroup?.id || ''}
                                        onChange={(e) => {
                                            const groupId = e.target.value;
                                            const group = groups?.find(g => g.id === groupId);
                                            setSelectedGroup(group || null);
                                        }}
                                        className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    >
                                        <option value="">Choisir un groupe...</option>
                                        {groups?.map(group => (
                                            <option key={group.id} value={group.id}>
                                                {group.nom}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedGroup && (
                                        <p className="mt-3 text-xs text-grey-medium">
                                            Groupe actif : <span className="text-primary font-bold">{selectedGroup.nom}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Card 2: Students Count (Detailed) */}
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
                                            {dashboardData.stats.studentBreakdown.map((level, idx) => (
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

                                {/* Card 3: Presence */}
                                <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-grey-medium uppercase tracking-wider">Présences</h3>
                                        <CheckSquare className="text-emerald-500" size={20} />
                                    </div>
                                    <p className="text-3xl font-black text-white">{dashboardData.stats?.attendance?.todayCount || 0}</p>
                                    <p className="text-xs text-grey-medium mt-1">Aujourd'hui</p>
                                </div>

                                {/* Card 4: Birthdays */}
                                <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-grey-medium uppercase tracking-wider">Anniversaires</h3>
                                        <span className="text-2xl">🎂</span>
                                    </div>
                                    <p className="text-3xl font-black text-white">{dashboardData.birthdays?.length || 0}</p>
                                    <p className="text-xs text-grey-medium mt-1">Ce mois-ci</p>
                                </div>
                            </div>

                            {/* LIGNE 2: Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

                                {/* Création des listes (compact) */}
                                <button
                                    onClick={() => generateGroupTodoList(selectedGroup)}
                                    disabled={!selectedGroup || isGenerating}
                                    className="flex items-center gap-4 p-5 bg-surface/50 hover:bg-surface border border-white/5 rounded-3xl transition-all group hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                        {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Users size={24} />}
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-sm font-black uppercase tracking-widest text-white leading-none mb-1">
                                            {isGenerating ? "Génération..." : "Listes PDF"}
                                        </span>
                                        <span className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                                            {selectedGroup ? selectedGroup.nom : "Sélectionner un groupe"}
                                        </span>
                                    </div>
                                </button>
                            </div>

                            {/* Progress Indicator (if generating) */}
                            {isGenerating && (
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin text-primary" size={16} />
                                        <p className="text-sm font-bold text-primary">Génération en cours...</p>
                                    </div>

                                    {progressText && (
                                        <div className="p-2 bg-background/50 rounded-lg border border-primary/30">
                                            <p className="text-xs font-bold text-white">
                                                ✏️ {progressText}
                                            </p>
                                        </div>
                                    )}

                                    <div className="text-xs text-grey-light leading-relaxed">
                                        📄 Création des fiches individuelles pour chaque élève du groupe.<br />
                                        ⏱️ Cette opération peut prendre quelques instants selon le nombre d'élèves.<br />
                                        ✨ Le PDF se téléchargera automatiquement une fois prêt.
                                    </div>
                                    <p className="text-[10px] text-grey-medium italic mt-2">
                                        💡 Astuce : Appuyez sur <kbd className="px-1 py-0.5 bg-background rounded text-primary font-mono">ESC</kbd> pour annuler
                                    </p>
                                </div>
                            )}

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
                        </div>
                    )}

                    {currentTab === 'tools' && (
                        <DashboardTools
                            selectedGroup={selectedGroup}
                            groups={groups}
                            onGroupChange={(group) => setSelectedGroup(group || null)}
                            isGenerating={isGenerating}
                            handleGenerateGroupTodoList={() => generateGroupTodoList(selectedGroup)}
                            onOpenRandomPicker={() => setIsRandomPickerOpen(true)}
                        />
                    )}

                    {currentTab === 'students' && (
                        <DashboardStudentList
                            students={students}
                            searchQuery={searchQuery}
                            onStudentClick={handleStudentClick}
                        />
                    )}

                    {currentTab === 'retard' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-surface/50 border border-white/5 rounded-3xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                        <span className="p-2 bg-danger/10 text-danger rounded-lg">
                                            <AlertCircle size={24} />
                                        </span>
                                        Élèves avec travaux en retard
                                        <span className="text-sm font-normal text-grey-medium ml-2 bg-white/5 px-2 py-0.5 rounded-full">
                                            {dashboardData.overdueStudents?.length || 0}
                                        </span>
                                    </h2>
                                </div>

                                {(!dashboardData.overdueStudents || dashboardData.overdueStudents.length === 0) ? (
                                    <div className="text-center py-20 bg-background/30 rounded-2xl border border-white/5 border-dashed">
                                        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4 opacity-80" />
                                        <h3 className="text-lg font-bold text-white mb-2">Tout est à jour !</h3>
                                        <p className="text-grey-medium max-w-sm mx-auto">
                                            Aucun élève n'a d'atelier "en cours" dont la date limite est dépassée.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-4 px-4 text-xs font-bold text-grey-medium uppercase tracking-wider mb-2">
                                            <div className="col-span-6 md:col-span-5">Élève</div>
                                            <div className="col-span-3 text-center">Niveau</div>
                                            <div className="col-span-3 md:col-span-2 text-center">Retards</div>
                                            <div className="hidden md:block col-span-2 text-right">Action</div>
                                        </div>

                                        {dashboardData.overdueStudents.map((student, index) => (
                                            <div
                                                key={student.id}
                                                onClick={() => handleStudentClick(student, 'urgent')}
                                                className="grid grid-cols-12 gap-4 items-center p-4 bg-background/50 hover:bg-white/5 border border-white/5 rounded-xl transition-all cursor-pointer group"
                                            >
                                                {/* Student Info */}
                                                <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                                                    <div className="relative">
                                                        {student.photo_base64 ? (
                                                            <img
                                                                src={student.photo_base64}
                                                                alt={student.prenom || ''}
                                                                className="w-10 h-10 rounded-full object-cover border-2 border-surface shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center text-primary font-bold">
                                                                {student.prenom?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-[10px] font-black border-2 border-surface z-10">
                                                            {index + 1}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-white group-hover:text-primary transition-colors">
                                                            {student.prenom} {student.nom}
                                                        </span>
                                                        <span className="text-xs text-grey-medium">
                                                            {student.Groupe?.nom || 'Sans groupe'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Level */}
                                                <div className="col-span-3 text-center">
                                                    <span className="px-2 py-1 bg-white/5 rounded-md text-xs font-bold text-grey-light">
                                                        {student.Niveau?.nom || '-'}
                                                    </span>
                                                </div>

                                                {/* Overdue Count */}
                                                <div className="col-span-3 md:col-span-2 text-center">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-danger/20 text-danger border border-danger/20 rounded-full font-black text-sm">
                                                        <AlertCircle size={14} />
                                                        {student.overdueCount}
                                                    </span>
                                                </div>

                                                {/* Action */}
                                                <div className="hidden md:flex col-span-2 justify-end">
                                                    <span className="flex items-center gap-2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                                        Voir détail <ChevronRight size={14} />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Placeholder for other tabs (Summary, Analytics) */}
                    {['summary', 'analytics'].includes(currentTab) && (
                        <div className="p-12 text-center text-grey-medium opacity-50 bg-surface/50 rounded-2xl border border-white/5">
                            <p className="uppercase tracking-widest font-bold">Vue en cours de refactorisation...</p>
                            <p className="text-sm mt-2">Le contenu de cet onglet sera disponible bientôt.</p>
                        </div>
                    )}

                </>
            )}

            {/* Modals */}
            <RandomPickerModal
                isOpen={isRandomPickerOpen}
                onClose={() => setIsRandomPickerOpen(false)}
                students={students || []} // Pass students if needed
            />
            <WeeklyPlannerModal
                isOpen={isWeeklyPlannerOpen}
                onClose={() => setIsWeeklyPlannerOpen(false)}
            />
        </div>
    );
};

export default Home;
