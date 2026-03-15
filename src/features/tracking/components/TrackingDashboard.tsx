import React, { useState } from 'react';
import { Check, Activity } from 'lucide-react';
import clsx from 'clsx';
import TimerModal from '../../../components/TimerModal';
import RandomPickerModal from '../../../components/RandomPickerModal';
import GroupSelector from './desktop/GroupSelector';
import ColumnResizeHandle from './desktop/ColumnResizeHandle';
import MandatoryActivitiesPanel from './desktop/MandatoryActivitiesPanel';
import MandatoryActivitiesModal from './desktop/MandatoryActivitiesModal';

// Hooks
import { Timer } from '../hooks/useTimerIntegration';
import { useTrackingDashboardFlow } from '../hooks/useTrackingDashboardFlow';

// Components
import { DashboardControls } from './dashboard/DashboardControls';
import { DashboardRecapModal } from './dashboard/DashboardRecapModal';
import { StudentColumnWrapper } from './dashboard/columns/StudentColumnWrapper';
import { HelpColumnWrapper } from './dashboard/columns/HelpColumnWrapper';
import { AdultColumnWrapper } from './dashboard/columns/AdultColumnWrapper';

import { getNextStatus } from '../../../lib/helpers/statusHelpers';

interface TrackingDashboardProps {
    timer: Timer;
    setTimer: (timer: Timer) => void;
    kioskOpen?: boolean;
    toggleKiosk?: () => void;
    loadingKiosk?: boolean;
    kioskPlanningOpen?: boolean;
    toggleKioskPlanning?: () => void;
    loadingKioskPlanning?: boolean;
}

const withStyle = (style: React.CSSProperties) => ({ style });

/**
 * @component TrackingDashboard
 * @description Page principale du tableau de bord de suivi (DASHBOARD). 
 * Orchestre les différents panneaux de suivi (élèves, demandes d'aide, activités obligatoires) 
 * et gère les interactions temps réel.
 * @param {TrackingDashboardProps} props - Propriétés du dashboard incluant le timer.
 * @example
 * <TrackingDashboard timer={globalTimer} setTimer={setGlobalTimer} />
 */
const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
    timer,
    setTimer,
    kioskOpen,
    toggleKiosk,
    loadingKiosk,
    kioskPlanningOpen,
    toggleKioskPlanning,
    loadingKioskPlanning
}) => {
    const [showPendingOnly, setShowPendingOnly] = useState(true);
    const { states, actions } = useTrackingDashboardFlow(timer, setTimer, showPendingOnly);

    // Aliases for readability (preserving existing component structure)
    const {
        timerHook,
        groupsHook,
        layoutHook,
        branchesHook,
        helpHook,
        progressionsHook,
        adultHook,
        mandatoryHook,
        isRandomPickerOpen,
        currentView
    } = states;

    const { setIsRandomPickerOpen } = actions;

    // Extracted styles to avoid inline style warnings
    const column1Style = { width: `${layoutHook.states.columnWidths[0]}%` };
    const row1Style = { height: `${layoutHook.states.rowHeights[0]}%` };
    const column2Style = { width: `${layoutHook.states.columnWidths[1]}%` };
    const row2Style = { height: `${layoutHook.states.rowHeights[1]}%` };
    const column3Style = { width: `${layoutHook.states.columnWidths[2]}%` };
    const row3Style = { height: `${layoutHook.states.rowHeights[3]}%` };

    return (
        <>
            <div ref={layoutHook.states.containerRef} className={clsx(
                "w-full h-full flex bg-background relative overflow-hidden transition-all duration-300",
                timerHook.states.isFullScreen && "fixed inset-0 z-[100]"
            )}>
                {/* FLOATING CONTROLS */}
                <DashboardControls
                    isFullScreen={timerHook.states.isFullScreen}
                    setFullScreen={timerHook.actions.setIsFullScreen}
                    onShowGroupSelector={() => groupsHook.actions.setShowGroupSelector(true)}
                    isEditMode={layoutHook.states.isEditMode}
                    setIsEditMode={layoutHook.actions.setIsEditMode}
                    isSaving={layoutHook.states.isSaving}
                    showSyncSuccess={layoutHook.states.showSyncSuccess}
                    kioskOpen={kioskOpen}
                    toggleKiosk={toggleKiosk}
                    loadingKiosk={loadingKiosk}
                    kioskPlanningOpen={kioskPlanningOpen}
                    toggleKioskPlanning={toggleKioskPlanning}
                    loadingKioskPlanning={loadingKioskPlanning}
                />

                <GroupSelector
                    isOpen={groupsHook.states.showGroupSelector}
                    groups={groupsHook.states.groups}
                    onSelect={groupsHook.actions.handleGroupSelect}
                />

                {/* COLUMN 1: STUDENTS / MODULES */}
                <div
                    ref={el => { layoutHook.states.columnRefs.current[0] = el; }}
                    className="h-full bg-surface/5 flex flex-col transition-colors duration-300 shrink-0 relative"
                    {...withStyle(column1Style)}
                >
                    <div className="flex flex-col shrink-0 relative" {...withStyle(row1Style)}>
                        <StudentColumnWrapper
                            currentView={currentView}
                            selectedStudent={groupsHook.states.selectedStudent}
                            showPendingOnly={showPendingOnly}
                            setShowPendingOnly={setShowPendingOnly}
                            students={groupsHook.states.students}
                            loadingStudents={groupsHook.states.loadingStudents}
                            modules={branchesHook.states.modules}
                            loadingModules={branchesHook.states.loadingModules}
                            selectedModule={branchesHook.states.selectedModule}
                            activities={branchesHook.states.activities}
                            loadingActivities={branchesHook.states.loadingActivities}
                            progressions={progressionsHook.states.progressions}
                            onStudentSelect={groupsHook.actions.setSelectedStudent}
                            onStatusClick={(activityId: string, statusOrCurrent: string, previousStatus?: string) => {
                                if (previousStatus) {
                                    // Explicit update from ProgressionCell (id, newStatus, currentStatus)
                                    progressionsHook.actions.handleStatusClick(activityId, statusOrCurrent, previousStatus);
                                } else {
                                    // Toggle/Cycle update (id, currentStatus)
                                    const newStatus = getNextStatus(statusOrCurrent);
                                    progressionsHook.actions.handleStatusClick(activityId, newStatus, statusOrCurrent);
                                }
                            }}
                            onSelectModule={(module: any) => { // Wrapper logic for toggle
                                if (!module) { // Collapsed
                                    branchesHook.actions.setSelectedModule(null);
                                    branchesHook.actions.setActivities([]);
                                } else {
                                    branchesHook.actions.setSelectedModule(module);
                                }
                            }}
                        />
                    </div>

                    <ColumnResizeHandle orientation="horizontal" onMouseDown={layoutHook.actions.handleRowMouseDown(0)} isEditMode={layoutHook.states.isEditMode} />

                    {/* BOTTOM ZONE 1B (Action Button) - kept here as it's layout specific */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-4">
                        {groupsHook.states.selectedStudent && (
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
                        )}
                    </div>
                </div>

                <ColumnResizeHandle orientation="vertical" onMouseDown={layoutHook.actions.handleColumnMouseDown(0)} isEditMode={layoutHook.states.isEditMode} />

                {/* COLUMN 2: HELP REQUESTS */}
                <div
                    ref={el => { layoutHook.states.columnRefs.current[1] = el; }}
                    className="h-full bg-surface/5 flex flex-col shrink-0"
                    {...withStyle(column2Style)}
                >
                    <div className="flex flex-col shrink-0 relative" {...withStyle(row2Style)}>
                        <HelpColumnWrapper
                            helpRequests={helpHook.states.helpRequests}
                            expandedRequestId={helpHook.states.expandedRequestId}
                            helpersCache={helpHook.states.helpersCache}
                            itemToDelete={progressionsHook.states.itemToDelete}
                            onExpand={(requestId: string | null) => {
                                if (!requestId) return;
                                const req = helpHook.states.helpRequests.find(r => r.id === requestId);
                                if (req?.activite?.id) helpHook.actions.handleExpandHelp(requestId, req.activite.id);
                            }}
                            onStatusClick={(activityId: string, statusOrCurrent: string, previousStatus?: string, studentId?: string) => {
                                if (previousStatus) {
                                    // Explicit update (id, newStatus, currentStatus, studentId)
                                    progressionsHook.actions.handleStatusClick(activityId, statusOrCurrent, previousStatus, studentId || null);
                                } else {
                                    // Cycle update
                                    const newStatus = getNextStatus(statusOrCurrent);
                                    progressionsHook.actions.handleStatusClick(activityId, newStatus, statusOrCurrent, studentId || null);
                                }
                            }}
                            onSetItemToDelete={progressionsHook.actions.setItemToDelete}
                            onGenerateAutoSuivi={() => progressionsHook.actions.handleAddStudentsForSuivi()}
                        />
                    </div>
                    <ColumnResizeHandle orientation="horizontal" onMouseDown={layoutHook.actions.handleRowMouseDown(1)} isEditMode={layoutHook.states.isEditMode} />

                    {/* BOTTOM ZONE 2B (Action Button) */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-4">
                        <button
                            onClick={() => progressionsHook.actions.handleAddStudentsForSuivi()}
                            className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-xl border border-primary/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/5 active:scale-95 group"
                        >
                            <Activity size={16} className="group-hover:scale-110 transition-transform" />
                            <span>Générer le Suivi Automatique</span>
                        </button>
                    </div>
                </div>

                <ColumnResizeHandle orientation="vertical" onMouseDown={layoutHook.actions.handleColumnMouseDown(1)} isEditMode={layoutHook.states.isEditMode} />

                {/* COLUMN 3: MANDATORY MODULES */}
                <div
                    ref={el => { layoutHook.states.columnRefs.current[2] = el; }}
                    className="h-full bg-surface/5 flex flex-col shrink-0"
                    {...withStyle(column3Style)}
                >
                    <MandatoryActivitiesPanel
                        mandatoryGroups={mandatoryHook.states.resolvedMandatoryModules}
                        onAddClick={() => mandatoryHook.actions.setIsModalOpen(true)}
                        onRemove={mandatoryHook.actions.removeModule}
                    />
                </div>

                <ColumnResizeHandle orientation="vertical" onMouseDown={layoutHook.actions.handleColumnMouseDown(2)} isEditMode={layoutHook.states.isEditMode} />

                {/* COLUMN 4: ADULT TRACKING */}
                <div
                    ref={el => { layoutHook.states.columnRefs.current[3] = el; }}
                    className="flex-1 h-full bg-surface/5 flex flex-col"
                >
                    <AdultColumnWrapper
                        adultActivities={adultHook.states.adultActivities}
                        showAdultModal={adultHook.states.showAdultModal}
                        allAdults={adultHook.states.allAdults}
                        availableActivityTypes={adultHook.states.availableActivityTypes}
                        currentAdultSelection={adultHook.states.currentAdultSelection}
                        currentActivityTypeSelection={adultHook.states.currentActivityTypeSelection}
                        loadingAdults={adultHook.states.loadingAdults}
                        onOpenRandomPicker={() => setIsRandomPickerOpen(true)}
                        onAddClick={() => adultHook.actions.setShowAdultModal(true)}
                        onAdultChange={adultHook.actions.setCurrentAdultSelection}
                        onActivityChange={adultHook.actions.setCurrentActivityTypeSelection}
                        onSave={() => {
                            if (adultHook.states.currentAdultSelection && adultHook.states.currentActivityTypeSelection) {
                                adultHook.actions.handleAddAdultActivity(adultHook.states.currentAdultSelection, adultHook.states.currentActivityTypeSelection);
                            }
                        }}
                        onDelete={adultHook.actions.handleDeleteAdultSuivi}
                        onCloseModal={() => adultHook.actions.setShowAdultModal(false)}
                    />
                    <div {...withStyle(row3Style)}></div>
                    <ColumnResizeHandle orientation="horizontal" onMouseDown={layoutHook.actions.handleRowMouseDown(3)} isEditMode={layoutHook.states.isEditMode} />
                </div>
            </div>

            <DashboardRecapModal
                itemToDelete={progressionsHook.states.itemToDelete}
                onCancel={() => progressionsHook.actions.setItemToDelete(null)}
                onConfirm={progressionsHook.actions.handleDeleteSuivi}
            />

            <TimerModal
                isOpen={timerHook.states.showTimerModal}
                onClose={() => timerHook.actions.setShowTimerModal(false)}
                onStart={(duration: number, message: string) => {
                    setTimer({ active: true, duration, timeLeft: duration, message });
                    timerHook.actions.setShowTimerModal(false);
                }}
            />

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

            <RandomPickerModal
                isOpen={isRandomPickerOpen}
                onClose={() => setIsRandomPickerOpen(false)}
                students={groupsHook.states.students || []}
            />
        </>
    );
};

export default TrackingDashboard;
