import React from 'react';
import PropTypes from 'prop-types';
import {
    Users, Settings2, Eye, EyeOff, X, Trash2, Maximize,
    Minimize, ChevronDown, Filter, Check, Loader2, Activity, BookOpen
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { getInitials, calculateAge } from '../../lib/utils';
import TimerModal from '../../components/TimerModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Hooks
import { useTimerIntegration } from './hooks/useTimerIntegration';
import { useLayoutPreferences } from './hooks/useLayoutPreferences';
import { useGroupsAndStudents } from './hooks/useGroupsAndStudents';
import { useBranchesAndModules } from './hooks/useBranchesAndModules';
import { useProgressions } from './hooks/useProgressions';
import { useHelpRequests } from './hooks/useHelpRequests';
import { useAdultTracking } from './hooks/useAdultTracking';
import { useMandatoryActivities } from './hooks/useMandatoryActivities';

// Components
import ColumnResizeHandle from './components/ColumnResizeHandle';
import TimerDisplay from './components/TimerDisplay';
import GroupSelector from './components/GroupSelector';
import ProgressionCell from './components/ProgressionCell';
import StudentProgressionGrid from './components/StudentProgressionGrid';
import HelpRequestsPanel from './components/HelpRequestsPanel';
import AdultTrackingPanel from './components/AdultTrackingPanel';
import MandatoryActivitiesPanel from './components/MandatoryActivitiesPanel';
import MandatoryActivitiesModal from './components/MandatoryActivitiesModal';

// Utils
import { calculateModuleProgress, normalizeStatus } from './utils/progressionHelpers';

const SuiviPedagogique = ({ timer, setTimer, timerFinished, setTimerFinished }) => {
    // Timer integration
    const timerHook = useTimerIntegration(timer);

    // Groups and students
    const groupsHook = useGroupsAndStudents();

    // Layout preferences
    const layoutHook = useLayoutPreferences(groupsHook.states.selectedGroupId, groupsHook.states.showPendingOnly || false);

    // Initial load of preferences
    React.useEffect(() => {
        const initLayout = async () => {
            const savedGroupId = await layoutHook.actions.loadLayoutPreferences();
            if (savedGroupId) {
                groupsHook.actions.setSelectedGroupId(savedGroupId);
            } else {
                groupsHook.actions.setShowGroupSelector(true);
            }
        };
        initLayout();
    }, []);

    // Branches and modules
    const [showPendingOnly, setShowPendingOnly] = React.useState(true);
    const branchesHook = useBranchesAndModules(
        groupsHook.states.selectedStudent,
        showPendingOnly,
        groupsHook.states.selectedGroupId
    );

    // Help requests (needs to be initialized before progressions)
    const helpHook = useHelpRequests(
        groupsHook.states.students,
        groupsHook.states.selectedStudent,
        null // Will pass fetchStudentProgressions after initialization
    );

    // Progressions
    const progressionsHook = useProgressions(
        groupsHook.states.selectedStudent,
        groupsHook.states.students,
        groupsHook.states.selectedGroupId,
        branchesHook.states.activities,
        groupsHook.states.manualIndices,
        groupsHook.states.rotationSkips,
        groupsHook.actions.setRotationSkips,
        branchesHook.states.groupedProgressions,
        branchesHook.states.selectedBranchForSuivi,
        helpHook.actions.fetchHelpRequests
    );

    // Update help hook with progressions fetch function
    React.useEffect(() => {
        helpHook.actions.fetchHelpRequests();
    }, [groupsHook.states.students]);

    // Adult tracking
    const adultHook = useAdultTracking();

    // Mandatory activities
    const mandatoryHook = useMandatoryActivities(
        groupsHook.states.selectedGroupId,
        groupsHook.states.students
    );

    // Fetch student progressions when selected student changes
    React.useEffect(() => {
        if (groupsHook.states.selectedStudent) {
            progressionsHook.actions.fetchStudentProgressions(groupsHook.states.selectedStudent.id);
        }
    }, [groupsHook.states.selectedStudent]);

    // Sync fullscreen state with browser events (e.g. ESC key)
    // Sync fullscreen state with browser events (e.g. ESC key)
    React.useEffect(() => {
        const handleFullScreenChange = () => {
            const isFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement);
            timerHook.actions.setIsFullScreen(isFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('mozfullscreenchange', handleFullScreenChange);
        document.addEventListener('MSFullscreenChange', handleFullScreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
        };
    }, []);

    // Current view
    const currentView = groupsHook.states.selectedStudent ? 'modules' : 'students';

    return (
        <>
            <div ref={layoutHook.states.containerRef} className={clsx(
                "w-full h-full flex bg-background relative overflow-hidden transition-all duration-300",
                timerHook.states.isFullScreen && "fixed inset-0 z-[100]"
            )}>
                {/* FLOATING CONTROLS */}
                <div className="absolute top-4 right-4 z-[90] flex flex-col items-end gap-2 group">
                    <div className={clsx("flex items-center gap-2 transition-opacity duration-300", layoutHook.states.showConfigBtn ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto")}>
                        <button
                            onClick={() => {
                                const element = document.documentElement;
                                const isFullscreen = document.fullscreenElement ||
                                    document.webkitFullscreenElement ||
                                    document.mozFullScreenElement ||
                                    document.msFullscreenElement;

                                if (!isFullscreen) {
                                    if (element.requestFullscreen) {
                                        element.requestFullscreen().then(() => {
                                            timerHook.actions.setIsFullScreen(true);
                                        }).catch(err => console.error(err));
                                    } else if (element.webkitRequestFullscreen) {
                                        element.webkitRequestFullscreen();
                                        timerHook.actions.setIsFullScreen(true);
                                    } else if (element.mozRequestFullScreen) {
                                        element.mozRequestFullScreen();
                                        timerHook.actions.setIsFullScreen(true);
                                    } else if (element.msRequestFullscreen) {
                                        element.msRequestFullscreen();
                                        timerHook.actions.setIsFullScreen(true);
                                    }
                                } else {
                                    if (document.exitFullscreen) {
                                        document.exitFullscreen().then(() => {
                                            timerHook.actions.setIsFullScreen(false);
                                        }).catch(err => console.error(err));
                                    } else if (document.webkitExitFullscreen) {
                                        document.webkitExitFullscreen();
                                        timerHook.actions.setIsFullScreen(false);
                                    } else if (document.mozCancelFullScreen) {
                                        document.mozCancelFullScreen();
                                        timerHook.actions.setIsFullScreen(false);
                                    } else if (document.msExitFullscreen) {
                                        document.msExitFullscreen();
                                        timerHook.actions.setIsFullScreen(false);
                                    }
                                }
                            }}
                            className="p-2.5 rounded-xl border flex items-center justify-center transition-all shadow-2xl backdrop-blur-xl bg-surface/60 text-grey-medium border-white/10 hover:border-primary/50 hover:text-white"
                            title={timerHook.states.isFullScreen ? "Quitter le plein écran" : "Plein écran"}
                        >
                            {timerHook.states.isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                        <button
                            onClick={() => groupsHook.actions.setShowGroupSelector(true)}
                            className="p-2.5 rounded-xl border flex items-center justify-center transition-all shadow-2xl backdrop-blur-xl bg-surface/60 text-grey-medium border-white/10 hover:border-primary/50 hover:text-white"
                            title="Changer de groupe"
                        >
                            <Users size={20} />
                        </button>

                        <button
                            onClick={() => layoutHook.actions.setIsEditMode(!layoutHook.states.isEditMode)}
                            className={clsx(
                                "p-2.5 rounded-xl border flex items-center justify-center transition-all shadow-2xl backdrop-blur-xl",
                                layoutHook.states.isEditMode
                                    ? "bg-primary text-black border-primary"
                                    : "bg-surface/60 text-grey-medium border-white/10 hover:border-primary/50 hover:text-white"
                            )}
                            title={layoutHook.states.isEditMode ? "Mode Édition" : "Ajuster Layout"}
                        >
                            {layoutHook.states.isEditMode ? (
                                <Settings2 size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
                            ) : (
                                <Settings2 size={20} />
                            )}
                        </button>
                    </div >

                    {/* SAVING INDICATOR */}
                    < div className={
                        clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md transition-all duration-500",
                            layoutHook.states.isSaving || layoutHook.states.showSyncSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                        )
                    } >
                        {
                            layoutHook.states.isSaving ? (
                                <>
                                    <Loader2 size={10} className="animate-spin text-primary" />
                                    <span className="text-[9px] font-bold text-grey-medium uppercase tracking-tighter">Enregistrement...</span>
                                </>
                            ) : layoutHook.states.showSyncSuccess && (
                                <>
                                    <Check size={10} className="text-success" />
                                    <span className="text-[9px] font-bold text-success uppercase tracking-tighter">Config. synchronisée</span>
                                </>
                            )
                        }
                    </div >
                </div >

                {/* GROUP SELECTOR MODAL */}
                < GroupSelector
                    isOpen={groupsHook.states.showGroupSelector}
                    groups={groupsHook.states.groups}
                    onSelect={groupsHook.actions.handleGroupSelect}
                />

                {/* COLUMN 1: STUDENTS / MODULES */}
                < div
                    ref={el => layoutHook.states.columnRefs.current[0] = el}
                    className="h-full bg-surface/5 flex flex-col transition-colors duration-300 shrink-0 relative"
                    style={{ width: `${layoutHook.states.columnWidths[0]}%` }}
                >
                    {/* TOP ZONE 1A */}
                    < div
                        className="flex flex-col overflow-hidden shrink-0"
                        style={{ height: `${layoutHook.states.rowHeights[0]}%` }}
                    >
                        {/* HEADER */}
                        < div className="flex flex-col border-b border-white/5 shrink-0" >
                            {currentView === 'students' ? (
                                <div className="p-4 flex items-center justify-between h-[60px]">
                                    <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Élèves</span>
                                </div>
                            ) : (
                                <div className="flex flex-col w-full animate-in slide-in-from-left-2 duration-300">
                                    <div className="p-4 flex flex-col gap-4">
                                        {groupsHook.states.selectedStudent && (
                                            <div className="flex flex-col gap-3 animate-in fade-in duration-500">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shrink-0 bg-surface">
                                                        {groupsHook.states.selectedStudent.photo_base64 ? (
                                                            <img src={groupsHook.states.selectedStudent.photo_base64} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                                                                {getInitials(groupsHook.states.selectedStudent)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h3 className="text-xl font-bold text-white leading-tight truncate">
                                                                {groupsHook.states.selectedStudent.prenom}
                                                            </h3>

                                                            <button
                                                                onClick={() => setShowPendingOnly(!showPendingOnly)}
                                                                className={clsx(
                                                                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all shrink-0",
                                                                    showPendingOnly
                                                                        ? "bg-primary/10 border-primary text-primary"
                                                                        : "bg-surface/30 border-white/5 text-grey-medium hover:text-white"
                                                                )}
                                                            >
                                                                <Filter size={10} />
                                                                {showPendingOnly ? "À faire" : "Tous"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div >

                        {/* CONTENT AREA */}
                        < div className="flex-1 overflow-y-auto p-2 custom-scrollbar relative" >
                            {/* VIEW 1: STUDENTS GRID */}
                            {
                                currentView === 'students' && (
                                    <StudentProgressionGrid
                                        students={groupsHook.states.students}
                                        onStudentSelect={(student) => groupsHook.actions.setSelectedStudent(student)}
                                        loading={groupsHook.states.loadingStudents}
                                    />
                                )
                            }

                            {/* VIEW 2: MODULES ACCORDION */}
                            {
                                currentView === 'modules' && (
                                    branchesHook.states.loadingModules ? (
                                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                                            {branchesHook.states.modules.map(module => {
                                                const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                                                const isExpanded = branchesHook.states.selectedModule?.id === module.id;

                                                return (
                                                    <div
                                                        key={module.id}
                                                        className={clsx(
                                                            "rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col",
                                                            isExpanded
                                                                ? "bg-surface/40 border-primary/40 shadow-xl shadow-primary/5"
                                                                : isExpired
                                                                    ? "bg-surface/30 border-danger/40 hover:border-danger/60"
                                                                    : "bg-surface/30 border-white/10 hover:bg-surface/50 hover:border-primary/30"
                                                        )}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                if (isExpanded) {
                                                                    branchesHook.actions.setSelectedModule(null);
                                                                    branchesHook.actions.setActivities([]);
                                                                } else {
                                                                    branchesHook.actions.setSelectedModule(module);
                                                                }
                                                            }}
                                                            className={clsx(
                                                                "w-full text-left px-4 py-3.5 transition-all flex flex-col gap-2 group",
                                                                isExpanded ? "bg-primary/5" : "hover:bg-white/[0.02]"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <ChevronDown
                                                                        size={16}
                                                                        className={clsx(
                                                                            "transition-transform duration-300 text-grey-medium shrink-0",
                                                                            isExpanded && "rotate-180 text-primary"
                                                                        )}
                                                                    />
                                                                    <div className={clsx(
                                                                        "text-sm font-bold transition-colors truncate",
                                                                        isExpanded ? "text-primary" : "text-gray-200 group-hover:text-white"
                                                                    )}>
                                                                        {module.nom}
                                                                    </div>
                                                                </div>
                                                                {module.date_fin && (
                                                                    <div className="text-[11px] font-medium text-primary/70 shrink-0">
                                                                        {format(new Date(module.date_fin), 'dd/MM', { locale: fr })}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3 w-full">
                                                                <div className="flex-grow h-2 rounded-full bg-white/10 overflow-hidden min-w-[60px]">
                                                                    <div
                                                                        className={clsx(
                                                                            "h-full transition-all duration-700 ease-out",
                                                                            module.percent >= 70 ? "bg-success" :
                                                                                module.percent >= 40 ? "bg-primary" :
                                                                                    "bg-danger"
                                                                        )}
                                                                        style={{
                                                                            width: `${module.percent || 0}%`
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-[9px] text-grey-medium font-medium whitespace-nowrap">
                                                                    {module.completedActivities || 0}/{module.totalActivities || 0}
                                                                </span>
                                                            </div>
                                                        </button>

                                                        {/* INLINE ACTIVITIES */}
                                                        {isExpanded && (
                                                            <div className="px-3 pb-4 space-y-2.5 animate-in slide-in-from-top-2 duration-300 border-t border-white/5 pt-3">
                                                                {branchesHook.states.loadingActivities ? (
                                                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary/50" size={16} /></div>
                                                                ) : (
                                                                    branchesHook.states.activities.map(activity => (
                                                                        <ProgressionCell
                                                                            key={activity.id}
                                                                            activity={activity}
                                                                            currentStatus={normalizeStatus(progressionsHook.states.progressions[activity.id])}
                                                                            onStatusClick={progressionsHook.actions.handleStatusClick}
                                                                            studentLevelId={groupsHook.states.selectedStudent?.niveau_id}
                                                                        />
                                                                    ))
                                                                )}
                                                                {branchesHook.states.activities.length === 0 && !branchesHook.states.loadingActivities && (
                                                                    <p className="text-center text-grey-medium text-[10px] py-2 italic">Aucune activité.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {branchesHook.states.modules.length === 0 && !branchesHook.states.loadingModules && (
                                                <p className="text-center text-grey-medium text-sm py-4">Aucun module en cours.</p>
                                            )}
                                        </div>
                                    )
                                )
                            }
                        </div >
                    </div >

                    {/* HORIZONTAL DIVIDER */}
                    < ColumnResizeHandle
                        orientation="horizontal"
                        onMouseDown={layoutHook.actions.handleRowMouseDown(0)}
                        isEditMode={layoutHook.states.isEditMode}
                    />

                    {/* BOTTOM ZONE 1B */}
                    < div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-4" >
                        {
                            groupsHook.states.selectedStudent && (
                                <button
                                    onClick={() => {
                                        groupsHook.actions.setSelectedStudent(null);
                                        branchesHook.actions.setSelectedModule(null);
                                        branchesHook.actions.setActivities([]);
                                    }}
                                    className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl border border-primary/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/5 active:scale-95 group"
                                >
                                    <Check size={16} className="group-hover:scale-110 transition-transform" />
                                    <span>Fin pour cet utilisateur</span>
                                </button>
                            )
                        }
                    </div >
                </div >

                {/* VERTICAL DIVIDER 1 */}
                < ColumnResizeHandle
                    orientation="vertical"
                    onMouseDown={layoutHook.actions.handleColumnMouseDown(0)}
                    isEditMode={layoutHook.states.isEditMode}
                />

                {/* COLUMN 2: HELP REQUESTS */}
                < div
                    ref={el => layoutHook.states.columnRefs.current[1] = el}
                    className="h-full bg-surface/5 flex flex-col shrink-0"
                    style={{ width: `${layoutHook.states.columnWidths[1]}%` }}
                >
                    {/* TOP ZONE 2A */}
                    < div
                        className="flex flex-col overflow-hidden shrink-0"
                        style={{ height: `${layoutHook.states.rowHeights[1]}%` }}
                    >
                        <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Suivi Personnalisé</span>
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {helpHook.states.helpRequests.length}
                            </span>
                        </div>

                        <HelpRequestsPanel
                            helpRequests={helpHook.states.helpRequests}
                            expandedRequestId={helpHook.states.expandedRequestId}
                            helpersCache={helpHook.states.helpersCache}
                            itemToDelete={progressionsHook.states.itemToDelete}
                            onExpand={helpHook.actions.handleExpandHelp}
                            onStatusClick={progressionsHook.actions.handleStatusClick}
                            onSetItemToDelete={progressionsHook.actions.setItemToDelete}
                        />
                    </div >

                    {/* HORIZONTAL DIVIDER */}
                    < ColumnResizeHandle
                        orientation="horizontal"
                        onMouseDown={layoutHook.actions.handleRowMouseDown(1)}
                        isEditMode={layoutHook.states.isEditMode}
                    />

                    {/* BOTTOM ZONE 2B */}
                    < div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-4" >
                        <button
                            onClick={progressionsHook.actions.handleAddStudentsForSuivi}
                            className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl border border-primary/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/5 active:scale-95 group"
                        >
                            <Activity size={16} className="group-hover:scale-110 transition-transform" />
                            <span>Générer le Suivi Automatique</span>
                        </button>
                    </div >
                </div >

                {/* VERTICAL DIVIDER 2 */}
                < ColumnResizeHandle
                    orientation="vertical"
                    onMouseDown={layoutHook.actions.handleColumnMouseDown(1)}
                    isEditMode={layoutHook.states.isEditMode}
                />

                {/* COLUMN 3: MANDATORY MODULES */}
                < div
                    ref={el => layoutHook.states.columnRefs.current[2] = el}
                    className="h-full bg-surface/5 flex flex-col shrink-0"
                    style={{ width: `${layoutHook.states.columnWidths[2]}%` }}
                >
                    <MandatoryActivitiesPanel
                        mandatoryGroups={mandatoryHook.states.resolvedMandatoryModules}
                        onAddClick={() => mandatoryHook.actions.setIsModalOpen(true)}
                        onRemove={mandatoryHook.actions.removeModule}
                    />
                </div >

                {/* VERTICAL DIVIDER 3 */}
                < ColumnResizeHandle
                    orientation="vertical"
                    onMouseDown={layoutHook.actions.handleColumnMouseDown(2)}
                    isEditMode={layoutHook.states.isEditMode}
                />

                {/* COLUMN 4: ADULT TRACKING */}
                < div
                    ref={el => layoutHook.states.columnRefs.current[3] = el}
                    className="flex-1 h-full bg-surface/5 flex flex-col"
                >
                    <div style={{ height: `${layoutHook.states.rowHeights[3]}%` }}></div>
                    <ColumnResizeHandle
                        orientation="horizontal"
                        onMouseDown={layoutHook.actions.handleRowMouseDown(3)}
                        isEditMode={layoutHook.states.isEditMode}
                    />
                    <AdultTrackingPanel
                        adultActivities={adultHook.states.adultActivities}
                        showModal={adultHook.states.showAdultModal}
                        allAdults={adultHook.states.allAdults}
                        activityTypes={adultHook.states.availableActivityTypes}
                        currentAdult={adultHook.states.currentAdultSelection}
                        currentActivity={adultHook.states.currentActivityTypeSelection}
                        loadingAdults={adultHook.states.loadingAdults}
                        onAddClick={() => adultHook.actions.setShowAdultModal(true)}
                        onAdultChange={adultHook.actions.setCurrentAdultSelection}
                        onActivityChange={adultHook.actions.setCurrentActivityTypeSelection}
                        onSave={adultHook.actions.handleAddAdultActivity}
                        onDelete={adultHook.actions.handleDeleteAdultSuivi}
                        onCloseModal={() => adultHook.actions.setShowAdultModal(false)}
                    />
                </div >
            </div >

            {/* DELETE CONFIRMATION MODAL */}
            {
                progressionsHook.states.itemToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-text-main mb-2">Retirer du suivi ?</h2>
                            <p className="text-sm text-grey-medium mb-6">
                                Êtes-vous sûr de vouloir retirer <span className="text-white font-bold">{progressionsHook.states.itemToDelete.eleve?.prenom} {progressionsHook.states.itemToDelete.eleve?.nom}</span> de la liste de suivi ?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => progressionsHook.actions.setItemToDelete(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={progressionsHook.actions.handleDeleteSuivi}
                                    className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                                >
                                    Retirer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* TIMER MODAL */}
            <TimerModal
                isOpen={timerHook.states.showTimerModal}
                onClose={() => timerHook.actions.setShowTimerModal(false)}
                onStart={(duration, message) => {
                    setTimer({
                        active: true,
                        duration,
                        timeLeft: duration,
                        message
                    });
                    timerHook.actions.setShowTimerModal(false);
                }}
            />

            {/* MANDATORY MODULES MODAL */}
            <MandatoryActivitiesModal
                isOpen={mandatoryHook.states.isModalOpen}
                onClose={() => mandatoryHook.actions.setIsModalOpen(false)}
                levels={mandatoryHook.states.levels}
                selectedLevelId={mandatoryHook.states.selectedLevelId}
                onLevelChange={mandatoryHook.actions.setSelectedLevelId}
                availableModules={mandatoryHook.states.availableModules}
                mandatoryModules={mandatoryHook.states.mandatoryModules}
                onToggle={mandatoryHook.actions.toggleMandatory}
                loading={mandatoryHook.states.loading}
            />
        </>
    );
};

SuiviPedagogique.propTypes = {
    timer: PropTypes.shape({
        active: PropTypes.bool,
        duration: PropTypes.number,
        timeLeft: PropTypes.number,
        message: PropTypes.string
    }).isRequired,
    setTimer: PropTypes.func.isRequired,
    timerFinished: PropTypes.bool,
    setTimerFinished: PropTypes.func
};

export default SuiviPedagogique;
