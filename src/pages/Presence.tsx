import React, { useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { SmartTabs, Button, EmptyState } from '../components/ui';
import PageLayout from '../components/layout/PageLayout';

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

    // --- Header Content Props ---
    const centerContent = (
        <div className="hidden md:block">
            <SmartTabs
                tabs={[
                    { id: 'matin', label: 'Matin' },
                    { id: 'apres_midi', label: 'Après-midi' }
                ]}
                activeTab={currentPeriod}
                onChange={(id) => setCurrentPeriod(id as 'matin' | 'apres_midi')}
                level={3}
                className="min-w-[200px]"
                disableCompact={true}
            />
        </div>
    );

    const rightContent = (
        <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-white/5 shadow-sm h-[52px] group transition-all duration-300 hover:border-primary/20">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setIsConfigOpen(true)}
                        className="p-2 aspect-square h-full"
                        icon={Settings}
                        title="Configuration"
                    />
                    <div className="w-px h-6 bg-white/10 mx-1" />
                </div>

                {/* Date Picker - Height matched to selector approx */}
                <div className="relative h-full flex items-center">
                    <label htmlFor="presence-date-picker" className="sr-only">Date</label>
                    <input
                        id="presence-date-picker"
                        type="date"
                        title="Sélectionner la date"
                        value={currentDate}
                        onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="h-full px-3 bg-black/20 border border-white/5 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary/50 font-medium [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer flex items-center"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <PageLayout
            title="Présence"
            subtitle="Gérez les présences et l'organisation de la classe"
            centerContent={centerContent}
            rightContent={rightContent}
            containerClassName="p-6"
        >
            {/* Mobile Period Selector (visible only on small screens) */}
            <div className="md:hidden flex justify-center mb-6">
                <SmartTabs
                    tabs={[
                        { id: 'matin', label: 'Matin' },
                        { id: 'apres_midi', label: 'Après-midi' }
                    ]}
                    activeTab={currentPeriod}
                    onChange={(id) => setCurrentPeriod(id as 'matin' | 'apres_midi')}
                    level={3}
                    fullWidth
                />
            </div>

            {/* MAIN CONTENT */}
            {selectedSetup ? (
                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="h-full flex gap-6 min-h-0 overflow-hidden">

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
                                <Button
                                    onClick={markUnassignedAbsent}
                                    variant="secondary"
                                    className="w-full hover:text-danger hover:border-danger/30 group"
                                >
                                    <span className="w-2 h-2 rounded-full bg-danger group-hover:animate-pulse" />
                                    Marquer restants comme absents
                                </Button>
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
                                                color={cat.couleur ?? undefined}
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

                                {categories.length === 0 && (
                                    <EmptyState
                                        title="Aucune catégorie"
                                        description="Aucune catégorie configurée pour ce setup."
                                        size="sm"
                                        className="col-span-full py-12"
                                    />
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
                <EmptyState
                    title="Configuration requise"
                    description="Sélectionnez ou créez une configuration pour commencer à gérer les présences."
                    action={
                        <Button onClick={() => setIsConfigOpen(true)}>
                            Configurer
                        </Button>
                    }
                    className="flex-1"
                />
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
        </PageLayout>
    );
};

export default Presence;
