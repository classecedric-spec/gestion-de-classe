import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { attendanceService } from '../services/attendanceService';
import { toast } from 'sonner';

export const useAttendance = () => {
    // Data State
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [students, setStudents] = useState([]);
    const [setups, setSetups] = useState([]);
    const [selectedSetup, setSelectedSetup] = useState(null);
    const [categories, setCategories] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [sessionSetups, setSessionSetups] = useState({ matin: null, apres_midi: null });

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentPeriod, setCurrentPeriod] = useState('matin');
    const [isEditing, setIsEditing] = useState(false);
    const [isSetupLocked, setIsSetupLocked] = useState(false);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Fetch Groups
                const groupsData = await attendanceService.fetchGroups();
                setGroups(groupsData);

                // Fetch Setups
                const setupsData = await attendanceService.fetchSetups();
                setSetups(setupsData);
                if (setupsData.length > 0) setSelectedSetup(setupsData[0]);

                // Restore User Preference for Group
                const { data: { user } } = await supabase.auth.getUser();
                if (user && groupsData.length > 0) {
                    const lastGroupId = await attendanceService.getUserPreferences(user.id, 'presence_last_group_id');
                    const lastGroup = groupsData.find(g => g.id === lastGroupId);
                    setSelectedGroup(lastGroup || groupsData[0]);
                } else if (groupsData.length > 0) {
                    setSelectedGroup(groupsData[0]);
                }

            } catch (err) {
                console.error("Initialization error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Fetch Students when Group Changes
    useEffect(() => {
        if (!selectedGroup) return;
        const loadStudents = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                attendanceService.saveGroupPreference(user.id, selectedGroup.id);
            }
            const data = await attendanceService.fetchStudentsByGroup(selectedGroup.id);
            setStudents(data);
        };
        loadStudents();
    }, [selectedGroup]);

    // Fetch Categories when Setup Changes
    useEffect(() => {
        if (!selectedSetup) {
            setCategories([]);
            return;
        }
        attendanceService.fetchCategories(selectedSetup.id).then(setCategories);
    }, [selectedSetup]);

    // Auto-select Setup based on Date/Period/Students
    useEffect(() => {
        const autoSelect = async () => {
            if (!selectedGroup || students.length === 0 || setups.length === 0) return;

            try {
                const existingSetupId = await attendanceService.checkExistingSetup(currentDate, currentPeriod, students.map(s => s.id));

                if (existingSetupId) {
                    const existingSetup = setups.find(s => s.id === existingSetupId);
                    if (existingSetup) {
                        setSelectedSetup(existingSetup);
                        setIsSetupLocked(true);
                        return;
                    }
                }

                // Not found in DB, unlock and revert to session memory
                setIsSetupLocked(false);
                if (sessionSetups[currentPeriod]) {
                    setSelectedSetup(sessionSetups[currentPeriod]);
                }
            } catch (err) {
                console.error("Auto-select error:", err);
                setIsSetupLocked(false);
            }
        };
        autoSelect();
    }, [selectedGroup, currentDate, currentPeriod, students, setups]); // Removed sessionSetups to avoid loop

    // Fetch Attendances
    const refreshAttendances = useCallback(async () => {
        if (!selectedGroup || !selectedSetup || students.length === 0) return;
        try {
            const data = await attendanceService.fetchAttendances(currentDate, currentPeriod, students.map(s => s.id), selectedSetup.id);
            setAttendances(data);
        } catch (err) {
            console.error("Fetch attendances error:", err);
        }
    }, [selectedGroup, selectedSetup, currentDate, currentPeriod, students]);

    useEffect(() => {
        refreshAttendances();
    }, [refreshAttendances]);


    // Action: Move Student (Drag & Drop)
    const moveStudent = async (studentId, targetId) => {
        if (!selectedSetup) return;

        // Check if moving to same place
        const currentRecord = attendances.find(a => a.eleve_id === studentId);
        const currentCatId = currentRecord?.categorie_id || 'unassigned';
        if (currentCatId === targetId) return;

        const { data: { user } } = await supabase.auth.getUser();

        // Optimistic Update
        const newRecord = {
            id: currentRecord?.id || `temp-${Date.now()}`,
            date: currentDate,
            periode: currentPeriod,
            eleve_id: studentId,
            setup_id: selectedSetup.id,
            categorie_id: targetId,
            status: 'present',
            user_id: user.id
        };

        if (targetId === 'unassigned') {
            // Remove
            setAttendances(prev => prev.filter(a => a.eleve_id !== studentId));
            if (currentRecord?.id && !currentRecord.id.toString().startsWith('temp')) {
                try {
                    await attendanceService.deleteAttendance(currentRecord.id);
                } catch (err) {
                    toast.error("Erreur lors de la suppression");
                    refreshAttendances();
                }
            }
        } else {
            // Upsert
            if (currentRecord) {
                setAttendances(prev => prev.map(a => a.eleve_id === studentId ? newRecord : a));
            } else {
                setAttendances(prev => [...prev, newRecord]);
            }

            try {
                const result = await attendanceService.upsertAttendance(newRecord);
                // Update real ID if insert
                if (!currentRecord) {
                    setAttendances(prev => prev.map(a => a.id === newRecord.id ? result : a));
                }
            } catch (err) {
                toast.error("Erreur lors de l'enregistrement");
                refreshAttendances();
            }
        }
    };

    // Action: Mark Unassigned Absent
    const markUnassignedAbsent = async () => {
        const unassigned = students.filter(s => !attendances.find(a => a.eleve_id === s.id));
        if (unassigned.length === 0) return;

        const absentCat = categories.find(c => c.nom === 'Absent');
        const { data: { user } } = await supabase.auth.getUser();

        const newRecords = unassigned.map(s => ({
            date: currentDate,
            periode: currentPeriod,
            eleve_id: s.id,
            setup_id: selectedSetup.id,
            categorie_id: absentCat?.id || null,
            status: 'absent',
            user_id: user.id
        }));

        setLoading(true);
        try {
            const data = await attendanceService.bulkInsertAttendances(newRecords);
            setAttendances(prev => [...prev, ...data]);
            toast.success(`${data.length} élèves marqués absents`);
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setLoading(false);
        }
    };

    // Helpers used in UI
    const getStudentsForCategory = (catId) => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.categorie_id === catId;
        });
    };

    const getUnassignedStudents = () => {
        return students.filter(s => !attendances.find(a => a.eleve_id === s.id && a.status === 'present')); // Note: Logic slightly diff from original pureUnassigned
    };

    const getPureUnassignedStudents = () => {
        return students.filter(s => !attendances.find(a => a.eleve_id === s.id));
    };

    const getSystemAbsentStudents = () => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.status === 'absent';
        });
    };

    return {
        // State
        groups, selectedGroup,
        students,
        setups, selectedSetup,
        categories,
        attendances,
        currentDate, currentPeriod,
        loading, error,
        isEditing, isSetupLocked,

        // Setters
        setSelectedGroup,
        setSelectedSetup: (setup) => {
            setSelectedSetup(setup);
            setSessionSetups(prev => ({ ...prev, [currentPeriod]: setup }));
        },
        setCurrentDate,
        setCurrentPeriod,
        setIsEditing,
        unlockEditing: () => {
            setIsSetupLocked(false);
            toast.success("Édition réactivée");
        },
        refreshData: () => {
            attendanceService.fetchSetups().then(setSetups);
            if (selectedSetup) attendanceService.fetchCategories(selectedSetup.id).then(setCategories);
        }, // For modal callbacks

        // Actions
        moveStudent,
        markUnassignedAbsent,

        // Getters
        getStudentsForCategory,
        getUnassignedStudents, // Contains Absents if not categorized? Org code was weird here
        getPureUnassignedStudents, // Really no record
        getSystemAbsentStudents
    };
};

export default useAttendance;
