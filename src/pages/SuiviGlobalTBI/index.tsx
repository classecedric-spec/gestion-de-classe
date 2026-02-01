import React, { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';
// @ts-ignore
import { useUpdateProgression } from '../../hooks/useUpdateProgression';

import { useTBIData } from './hooks/useTBIData';
import { useAdultTracking, useTimer } from './hooks/useAdultTimer';

// Components
import { TBINavigationPanel } from './components/TBINavigationPanel';
import { TBIHelpPanel } from './components/TBIHelpPanel';
import { TBIAdultTimerPanel } from './components/TBIAdultTimerPanel';

/**
 * Suivi Global TBI - Optimisé pour Tableau Blanc Interactif
 * Résolution: 960x540 pixels, Mode Paysage
 */
const SuiviGlobalTBI: React.FC = () => {
    const { updateProgression } = useUpdateProgression();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Hooks
    const {
        groups, selectedGroupId, setSelectedGroupId,
        students, selectedStudent,
        modules, selectedModule,
        activities, progressions, setProgressions,
        view, helpRequests,
        handleStudentClick, handleModuleClick, handleBackToStudents,
        handleHelpStatusClick, fetchHelpRequests
    } = useTBIData();

    const {
        allAdults, activeAdults, adultActivities, availableActivityTypes,
        showTaskSelectorFor, setShowTaskSelectorFor,
        handleAddAdultToView, handleRemoveAdultFromView, handleAddTaskEntry, handleDeleteTaskEntry
    } = useAdultTracking();

    const {
        timerMinutes, setTimerMinutes, timerSeconds, setTimerSeconds,
        timerActive, timeLeft, showTimerConfig, setShowTimerConfig,
        startTimer, stopTimer, resetTimer, formatTime
    } = useTimer();

    // Time update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Status handlers
    const handleStatusClick = async (activityId: string, currentStatus: string) => {
        if (!selectedStudent) return;
        await updateProgression(selectedStudent.id, activityId, currentStatus, setProgressions, fetchHelpRequests);
    };

    return (
        <div className="h-screen w-screen bg-background flex flex-col overflow-hidden max-w-[960px] max-h-[540px]">
            {/* HEADER */}
            <div className="bg-surface/80 border-b border-white/10 px-2 py-1 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Users className="text-primary" size={12} />
                    <select
                        title="Sélectionner le groupe"
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="bg-background border border-white/10 text-white rounded-md py-0.5 px-2 appearance-none text-[10px] font-bold"
                    >
                        <option value="">Groupe...</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                    </select>
                </div>

                {selectedStudent && (
                    <div className="text-[11px] font-bold text-primary">
                        {selectedStudent.prenom} {selectedStudent.nom}
                    </div>
                )}

                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-md">
                    <Clock size={10} className="text-primary" />
                    <span className="text-[11px] font-black text-white font-mono">
                        {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* MAIN - 3 Columns */}
            <div className="flex-1 flex overflow-hidden">
                {/* COL 1: Navigation (40%) */}
                <TBINavigationPanel
                    view={view}
                    students={students}
                    modules={modules}
                    activities={activities}
                    selectedStudent={selectedStudent}
                    selectedModule={selectedModule}
                    progressions={progressions}
                    onStudentClick={handleStudentClick}
                    onModuleClick={handleModuleClick}
                    onBackToStudents={handleBackToStudents}
                    onStatusClick={handleStatusClick}
                />

                {/* COL 2: Help Requests (40%) */}
                <TBIHelpPanel
                    helpRequests={helpRequests}
                    onHelpStatusClick={handleHelpStatusClick}
                />

                {/* COL 3: Adult + Timer (20%) */}
                <TBIAdultTimerPanel
                    allAdults={allAdults}
                    activeAdults={activeAdults}
                    adultActivities={adultActivities}
                    availableActivityTypes={availableActivityTypes}
                    showTaskSelectorFor={showTaskSelectorFor}
                    setShowTaskSelectorFor={setShowTaskSelectorFor}
                    onAddAdult={handleAddAdultToView}
                    onRemoveAdult={handleRemoveAdultFromView}
                    onAddTaskEntry={handleAddTaskEntry}
                    onDeleteTaskEntry={handleDeleteTaskEntry}
                    timerMinutes={timerMinutes}
                    setTimerMinutes={setTimerMinutes}
                    timerSeconds={timerSeconds}
                    setTimerSeconds={setTimerSeconds}
                    timerActive={timerActive}
                    timeLeft={timeLeft}
                    showTimerConfig={showTimerConfig}
                    setShowTimerConfig={setShowTimerConfig}
                    startTimer={startTimer}
                    stopTimer={stopTimer}
                    resetTimer={resetTimer}
                    formatTime={formatTime}
                />
            </div>
        </div>
    );
};

export default SuiviGlobalTBI;
