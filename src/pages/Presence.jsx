import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Settings, CheckSquare } from 'lucide-react';
import clsx from 'clsx';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';

import PresenceConfigurationModal from '../components/PresenceConfigurationModal';
import PresenceStudentCard from '../components/PresenceStudentCard';
import PresenceColumn from '../components/PresenceColumn';
import ConfirmationModal from '../components/ConfirmationModal';

const Presence = () => {
    // Data State
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [students, setStudents] = useState([]);

    const [setups, setSetups] = useState([]);
    const [selectedSetup, setSelectedSetup] = useState(null);
    const [categories, setCategories] = useState([]);

    const [attendances, setAttendances] = useState([]); // Map: studentId -> attendance record

    // UI State
    const [loading, setLoading] = useState(true);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Edit Mode
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeDragStudent, setActiveDragStudent] = useState(null);
    const [error, setError] = useState(null);
    const [showAbsentConfirmation, setShowAbsentConfirmation] = useState(false);
    const [isSetupLocked, setIsSetupLocked] = useState(false);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor)
    );

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchStudents(selectedGroup.id);
        }
    }, [selectedGroup]);

    useEffect(() => {
        if (selectedSetup) {
            fetchCategories(selectedSetup.id);
        } else {
            setCategories([]);
        }
    }, [selectedSetup]);

    useEffect(() => {
        if (selectedGroup && students.length > 0 && setups.length > 0) {
            autoSelectSetupForDate();
        }
    }, [selectedGroup, currentDate, students, setups, attendances.length > 0]);

    const autoSelectSetupForDate = async () => {
        try {
            const { data, error } = await supabase
                .from('Attendance')
                .select('setup_id')
                .eq('date', currentDate)
                .in('eleve_id', students.map(s => s.id))
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const existingSetupId = data[0].setup_id;
                const existingSetup = setups.find(s => s.id === existingSetupId);
                if (existingSetup) {
                    setSelectedSetup(existingSetup);
                    setIsSetupLocked(true);
                    return;
                }
            }
            setIsSetupLocked(false);
        } catch (err) {
            console.error("Error auto-selecting setup:", err);
            setIsSetupLocked(false);
        }
    };

    useEffect(() => {
        if (selectedGroup && selectedSetup && students.length > 0) {
            fetchAttendances();
        }
    }, [selectedGroup, selectedSetup, currentDate, students]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: groupsData, error: groupsError } = await supabase
                .from('Groupe')
                .select('*')
                .order('nom');
            if (groupsError) throw groupsError;
            setGroups(groupsData || []);
            if (groupsData?.length > 0) setSelectedGroup(groupsData[0]);

            await fetchSetups();
        } catch (err) {
            console.error("Error initializing:", err);
            if (err.message && err.message.includes('relation') && err.message.includes('does not exist')) {
                setError("Les tables de base de données nécessaires n'existent pas encore. Veuillez exécuter la migration SQL.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchSetups = async () => {
        const { data, error } = await supabase.from('SetupPresence').select('*').order('nom');
        if (error) {
            if (error.code === '42P01') { setError("Tables manquantes. Migration requise."); return; }
            throw error;
        }
        setSetups(data || []);
        if (data?.length > 0 && !selectedSetup) setSelectedSetup(data[0]);
    };

    const fetchStudents = async (groupId) => {
        try {
            const { data: links } = await supabase.from('EleveGroupe').select('eleve_id').eq('groupe_id', groupId);
            const studentIds = links?.map(l => l.eleve_id) || [];
            if (studentIds.length === 0) { setStudents([]); return; }

            const { data } = await supabase.from('Eleve').select('*, Classe(nom)').in('id', studentIds).order('nom');
            setStudents(data || []);
        } catch (err) { console.error("Error fetching students:", err); }
    };

    const fetchCategories = async (setupId) => {
        try {
            const { data, error } = await supabase.from('CategoriePresence').select('*').eq('setup_id', setupId).order('created_at');
            if (error) throw error;
            setCategories(data || []);
        } catch (err) { console.error("Error fetching categories:", err); }
    };

    const fetchAttendances = async () => {
        if (!selectedGroup || !students.length) return;
        try {
            const { data, error } = await supabase.from('Attendance').select('*').eq('date', currentDate).eq('setup_id', selectedSetup?.id).in('eleve_id', students.map(s => s.id));
            if (error) throw error;
            setAttendances(data || []);
        } catch (err) { console.error("Error fetching attendances:", err); }
    };

    const handleUnlockEditing = () => {
        setIsEditing(true);
        setShowConfigModal(false);
    };

    const handleLockEditing = () => {
        setIsEditing(false);
    };

    // Dnd Handlers
    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
        const student = students.find(s => s.id === event.active.id);
        setActiveDragStudent(student);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragStudent(null);

        if (!over) return;

        const studentId = active.id;
        const targetId = over.id; // Could be categoryId OR 'unassigned'

        // Logic check: moving to same category?
        const currentAtt = attendances.find(a => a.eleve_id === studentId);
        const currentCatId = currentAtt?.categorie_id || 'unassigned';

        if (currentCatId === targetId) return; // No change

        // If 'unassigned', we delete the record
        if (targetId === 'unassigned') {
            await removeAttendance(studentId);
        } else {
            // It's a category ID
            await updateAttendance(studentId, targetId);
        }
    };

    const updateAttendance = async (studentId, categoryId) => {
        if (!selectedSetup) return;

        const existingRecord = attendances.find(a => a.eleve_id === studentId);
        const newRecord = {
            date: currentDate,
            eleve_id: studentId,
            setup_id: selectedSetup.id,
            categorie_id: categoryId,
            status: 'present',
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        // Optimistic UI Update
        const optimisticAtt = { ...newRecord, id: existingRecord?.id || `temp-${Date.now()}` };
        if (existingRecord) {
            setAttendances(prev => prev.map(a => a.id === existingRecord.id ? optimisticAtt : a));
        } else {
            setAttendances(prev => [...prev, optimisticAtt]);
        }

        try {
            if (existingRecord) {
                const { error } = await supabase.from('Attendance').update({ categorie_id: categoryId, status: 'present' }).eq('id', existingRecord.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('Attendance').insert([newRecord]).select().single();
                if (error) throw error;
                // Replace temp ID
                setAttendances(prev => prev.map(a => a.id === optimisticAtt.id ? data : a));
            }
        } catch (err) {
            console.error("Error saving:", err);
            fetchAttendances(); // Revert on error
        }
    };

    const removeAttendance = async (studentId) => {
        const existingRecord = attendances.find(a => a.eleve_id === studentId);
        if (!existingRecord) return;

        // Optimistic UI Update
        setAttendances(prev => prev.filter(a => a.id !== existingRecord.id));

        try {
            const { error } = await supabase.from('Attendance').delete().eq('id', existingRecord.id);
            if (error) throw error;
        } catch (err) {
            console.error("Error deleting:", err);
            fetchAttendances(); // Revert
        }
    };

    // Replaced Handler with Modal Logic
    const confirmMarkUnassignedAbsent = async () => {
        console.log("Confirming mark unassigned as absent...");
        const unassignedStudents = students.filter(s => !attendances.find(a => a.eleve_id === s.id));
        if (unassignedStudents.length === 0) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const absentCat = categories.find(c => c.nom === 'Absent');

            const updates = unassignedStudents.map(s => ({
                date: currentDate,
                eleve_id: s.id,
                setup_id: selectedSetup.id,
                categorie_id: absentCat?.id || null,
                status: 'absent',
                user_id: user.id
            }));

            const { data, error } = await supabase.from('Attendance').insert(updates).select();
            if (error) throw error;
            setAttendances(prev => [...prev, ...data]);
        } catch (err) { console.error(err); alert(err.message); } finally { setLoading(false); }
    };

    const handleMarkUnassignedAbsent = () => {
        const unassignedCount = students.filter(s => !attendances.find(a => a.eleve_id === s.id)).length;
        if (unassignedCount === 0) return;
        setShowAbsentConfirmation(true);
    };

    // Filter Students for Columns
    const unassignedStudents = students.filter(s => !attendances.find(a => a.eleve_id === s.id && a.status === 'present'));

    // Unassigned = No record found
    const getStudentsForCategory = (catId) => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.categorie_id === catId;
        });
    };

    // Students who are "Absent" (status=absent) but maybe no category ID or category ID matches 'Absent'
    const absentStudents = students.filter(s => {
        const att = attendances.find(a => a.eleve_id === s.id);
        return att && att.status === 'absent';
    });

    // Pure unassigned
    const pureUnassigned = students.filter(s => !attendances.find(a => a.eleve_id === s.id));

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-full flex flex-col bg-background text-text-main">
                {/* Header */}
                <div className="group/header bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-40 bg-surface pl-16">

                    {/* Left & Center Group (similar to SuiviGlobal) */}
                    <div className="flex items-center gap-6">
                        {/* Date Picker */}
                        <div className="flex items-center gap-4">
                            <input
                                type="date"
                                value={currentDate}
                                onChange={e => setCurrentDate(e.target.value)}
                                className="bg-background/50 border border-white/10 rounded-xl px-4 py-1.5 text-sm text-white focus:border-primary outline-none font-bold"
                            />
                        </div>

                        {/* Title Section */}
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-white uppercase tracking-widest leading-none">
                                {selectedGroup ? selectedGroup.nom : "Chargement..."}
                            </h1>
                            {selectedSetup && (
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                                        {selectedSetup.nom}
                                    </p>
                                    {isSetupLocked && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                            <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Locked</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {/* Bulk Absents (Integrated here for cleaner look) */}
                        <button
                            onClick={handleMarkUnassignedAbsent}
                            disabled={pureUnassigned.length === 0}
                            className={clsx(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                                pureUnassigned.length > 0
                                    ? "bg-danger/10 text-danger border-danger/20 hover:bg-danger hover:text-white"
                                    : "opacity-20 cursor-not-allowed text-grey-medium border-white/5"
                            )}
                        >
                            Marquer {pureUnassigned.length} absents
                        </button>

                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {isEditing && (
                            <button
                                onClick={handleLockEditing}
                                className="w-10 h-10 rounded-xl bg-primary text-text-dark flex items-center justify-center hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 animate-in zoom-in spin-in-90 duration-300"
                                title="Terminer l'édition"
                            >
                                <CheckSquare size={20} />
                            </button>
                        )}

                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-grey-medium hover:text-white hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover/header:opacity-100"
                            title="Configuration"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Board */}
                <div className="flex-1 flex overflow-hidden p-4 gap-4">
                    {/* LEFT COLUMN: Unassigned (20%) */}
                    <div className="w-1/5 min-w-[200px] flex flex-col">
                        <PresenceColumn
                            id="unassigned"
                            title="Non Assignés"
                            count={pureUnassigned.length}
                            isUnassigned={true}
                        >
                            {pureUnassigned.map(s => (
                                <PresenceStudentCard key={s.id} student={s} />
                            ))}
                        </PresenceColumn>
                    </div>

                    {/* RIGHT SECTION: Categories (80%) */}
                    <div className="w-4/5 px-4 h-full">
                        <div className="grid grid-cols-4 grid-rows-2 gap-4 h-full pb-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="h-full min-h-0">
                                    <PresenceColumn
                                        id={cat.id}
                                        title={cat.nom}
                                        color={cat.couleur}
                                        count={getStudentsForCategory(cat.id).length}
                                    >
                                        {getStudentsForCategory(cat.id).map(s => (
                                            <PresenceStudentCard
                                                key={s.id}
                                                student={s}
                                                currentStatus={{ status: 'present', categorie_id: cat.id }}
                                                disabled={!isEditing} // Lock if not editing
                                            />
                                        ))}
                                    </PresenceColumn>
                                </div>
                            ))}

                            {/* System Absent Column */}
                            {absentStudents.length > 0 && !categories.some(c => c.nom === 'Absent') && (
                                <div className="h-full min-h-0">
                                    <PresenceColumn
                                        id="system-absent"
                                        title="Absents"
                                        color="#EF4444"
                                        count={absentStudents.length}
                                    >
                                        {absentStudents.map(s => (
                                            <PresenceStudentCard
                                                key={s.id}
                                                student={s}
                                                currentStatus={{ status: 'absent' }}
                                                disabled={!isEditing} // Lock if not editing
                                            />
                                        ))}
                                    </PresenceColumn>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeDragStudent ? (
                        <PresenceStudentCard
                            student={activeDragStudent}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>

                <PresenceConfigurationModal
                    isOpen={showConfigModal}
                    onClose={() => setShowConfigModal(false)}
                    onConfigSaved={() => { fetchSetups(); if (selectedSetup) fetchCategories(selectedSetup.id); }}
                    groups={groups}
                    selectedGroup={selectedGroup}
                    onSelectGroup={setSelectedGroup}
                    setups={setups}
                    selectedSetup={selectedSetup}
                    onSelectSetup={setSelectedSetup}
                    onUnlockEditing={handleUnlockEditing}
                    activeCategories={categories}
                    studentsForExport={students}
                    attendancesForExport={attendances}
                    currentDateForExport={currentDate}
                    isSetupLocked={isSetupLocked}
                />

                <ConfirmationModal
                    isOpen={showAbsentConfirmation}
                    onClose={() => setShowAbsentConfirmation(false)}
                    onConfirm={confirmMarkUnassignedAbsent}
                    title="Confirmer les absences"
                    message={`Voulez-vous marquer les ${students.filter(s => !attendances.find(a => a.eleve_id === s.id)).length} élèves non-assignés comme Absents pour cette journée ?`}
                    confirmText="Marquer comme Absents"
                    isDangerous={true}
                />
            </div>
        </DndContext>
    );
};

export default Presence;
