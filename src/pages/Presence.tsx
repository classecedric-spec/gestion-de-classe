import React, { useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

import useAttendance from '../features/attendance/hooks/useAttendance';
import AttendanceStudentCard from '../features/attendance/components/AttendanceStudentCard';
import AttendanceColumn from '../features/attendance/components/AttendanceColumn';
import AttendanceConfigModal from '../features/attendance/components/AttendanceConfigModal';
import { Student } from '../features/attendance/services/attendanceService';

const Presence: React.FC = () => {
    const {
        // State
        groups, selectedGroup, setSelectedGroup,
        setups, selectedSetup, setSelectedSetup,
        categories,
        attendances,
        students,
        currentDate, setCurrentDate,
        currentPeriod, setCurrentPeriod,
        loading, error,
        isSetupLocked,
        refreshData,
        unlockEditing,

        // Actions
        moveStudent,
        markUnassignedAbsent,

        // Getters
        getStudentsForCategory,
    } = useAttendance();

    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [activeDragItem, setActiveDragItem] = useState<Student | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // HANDLERS
    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current) {
            setActiveDragItem(event.active.data.current.student);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const studentId = active.id as string;
        const targetId = over.id as string; // This is the Column ID (category ID or 'unassigned' or 'absent')

        if (targetId === 'absent') {
            const absentCat = categories.find(c => c.nom === 'Absent');
            if (absentCat) {
                await moveStudent(studentId, absentCat.id);
            } else {
                toast.error("Catégorie 'Absent' introuvable");
            }
        } else {
            await moveStudent(studentId, targetId);
        }
    };

    if (error) {
        return <div className="p-10 text-center text-red-500">Erreur: {error}</div>;
    }

    if (!selectedGroup && !loading && groups.length === 0) {
        return <div className="p-10 text-center text-grey-medium">Aucun groupe trouvé. Veuillez configurez vos classes.</div>;
    }

    const trulyUnassigned = students.filter(s => !attendances.some(a => a.eleve_id === s.id));


    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 min-h-[50px]">
                {/* LEFT: Title */}
                <div className="z-10 bg-background/50 backdrop-blur-sm pr-4">
                    <h1 className="text-3xl font-bold text-text-main mb-1">Présence</h1>
                    <p className="text-grey-medium">Gérez les présences et l'organisation de la classe</p>
                </div>

                {/* CENTER: Period Selector */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 hidden md:block">
                    {/* Period Toggle - Dashboard Style */}
                    <div className="flex bg-black/20 p-1.5 rounded-xl gap-2 min-w-[200px] shadow-sm border border-white/5">
                        <button
                            onClick={() => setCurrentPeriod('matin')}
                            className={clsx(
                                "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300",
                                currentPeriod === 'matin'
                                    ? "bg-primary text-text-dark shadow-lg scale-[1.02]"
                                    : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            Matin
                        </button>
                        <button
                            onClick={() => setCurrentPeriod('apres_midi')}
                            className={clsx(
                                "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300",
                                currentPeriod === 'apres_midi'
                                    ? "bg-primary text-text-dark shadow-lg scale-[1.02]"
                                    : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            Après-midi
                        </button>
                    </div>
                </div>

                {/* RIGHT: Settings & Date */}
                <div className="z-10 flex items-center gap-3 self-end md:self-auto">

                    <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-white/5 shadow-sm h-[52px] group transition-all duration-300 hover:border-primary/20">
                        <div className="flex items-center gap-2 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-in-out">
                            <button
                                onClick={() => setIsConfigOpen(true)}
                                className="p-2 aspect-square h-full hover:bg-white/5 rounded-lg text-grey-light hover:text-primary transition-colors flex items-center justify-center"
                                title="Configuration"
                            >
                                <Settings size={20} />
                            </button>

                            <div className="w-px h-6 bg-white/10 mx-1" />
                        </div>

                        {/* Date Picker - Height matched to selector approx */}
                        <div className="relative h-full flex items-center">
                            <input
                                type="date"
                                value={currentDate}
                                onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                                onChange={(e) => setCurrentDate(e.target.value)}
                                className="h-full px-3 bg-black/20 border border-white/5 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary/50 font-medium [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer flex items-center"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Period Selector (visible only on small screens) */}
            <div className="md:hidden flex justify-center mb-6">
                <div className="flex bg-black/20 p-1.5 rounded-xl gap-2 w-full max-w-sm shadow-sm border border-white/5">
                    <button
                        onClick={() => setCurrentPeriod('matin')}
                        className={clsx(
                            "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300",
                            currentPeriod === 'matin'
                                ? "bg-primary text-text-dark shadow-lg scale-[1.02]"
                                : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        Matin
                    </button>
                    <button
                        onClick={() => setCurrentPeriod('apres_midi')}
                        className={clsx(
                            "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300",
                            currentPeriod === 'apres_midi'
                                ? "bg-primary text-text-dark shadow-lg scale-[1.02]"
                                : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                    >
                        Après-midi
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            {selectedSetup ? (
                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">

                        {/* LEFT: Unassigned & Absents */}
                        <div className="w-1/4 min-w-[280px] flex flex-col gap-4">
                            {/* Unassigned Students */}
                            <div className="flex-1 min-h-0 flex flex-col">
                                <AttendanceColumn
                                    id="unassigned"
                                    title="Non assignés"
                                    count={trulyUnassigned.length}
                                    color="#9CA3AF"
                                    isUnassigned={true}
                                >
                                    {trulyUnassigned.map(student => (
                                        <AttendanceStudentCard
                                            key={student.id}
                                            student={student}
                                            disabled={isSetupLocked}
                                        />
                                    ))}
                                </AttendanceColumn>
                            </div>

                            {/* Action: Mark rest as absent */}
                            {trulyUnassigned.length > 0 && !isSetupLocked && (
                                <button
                                    onClick={markUnassignedAbsent}
                                    className="py-3 px-4 bg-surface hover:bg-white/5 border border-white/5 rounded-xl text-sm font-bold text-grey-light hover:text-danger hover:border-danger/30 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span className="w-2 h-2 rounded-full bg-danger group-hover:animate-pulse" />
                                    Marquer restants comme absents
                                </button>
                            )}
                        </div>

                        {/* RIGHT: Categories Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl p-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-20">
                                {categories.map(cat => {
                                    const catStudents = getStudentsForCategory(cat.id);

                                    return (
                                        <div key={cat.id} className="h-[300px] min-h-[300px]">
                                            <AttendanceColumn
                                                id={cat.id}
                                                title={cat.nom}
                                                color={cat.couleur}
                                                count={catStudents.length}
                                            >
                                                {catStudents.map(student => (
                                                    <AttendanceStudentCard
                                                        key={student.id}
                                                        student={student}
                                                        currentStatus={{ status: 'present' }}
                                                        disabled={isSetupLocked}
                                                    />
                                                ))}
                                            </AttendanceColumn>
                                        </div>
                                    );
                                })}

                                {/* If no setup selected or empty */}
                                {categories.length === 0 && (
                                    <div className="col-span-full h-40 flex items-center justify-center text-grey-dark italic border border-dashed border-white/10 rounded-xl">
                                        Aucune catégorie configurée.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    <DragOverlay>
                        {activeDragItem ? (
                            <AttendanceStudentCard student={activeDragItem} isOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-grey-medium animate-pulse">
                    <p>Sélectionnez ou créez une configuration pour commencer</p>
                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="mt-4 px-6 py-2 bg-primary text-text-dark rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        Configurer
                    </button>
                </div>
            )}

            {/* Config Modal */}
            <AttendanceConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                // Data
                groups={groups}
                selectedGroup={selectedGroup}
                onSelectGroup={(group) => setSelectedGroup(group || null)}
                setups={setups}
                selectedSetup={selectedSetup}
                onSelectSetup={setSelectedSetup}
                isSetupLocked={isSetupLocked}
                onUnlockEditing={unlockEditing}

                // Callbacks
                onConfigSaved={refreshData}

                // Export Data
                activeCategories={categories}
                studentsForExport={students}
                currentDateForExport={currentDate}
            />
        </div>
    );
};

export default Presence;
