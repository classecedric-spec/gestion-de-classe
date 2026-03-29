import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
import { attendanceService, Group, SetupPresence, Attendance } from '../services/attendanceService';
import { toast } from 'sonner';

export const useAttendance = () => {
    const queryClient = useQueryClient();

    // UI Local State
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentPeriod, setCurrentPeriod] = useState('matin');
    const [isEditing, setIsEditing] = useState(false);
    const [isSetupLocked, setIsSetupLocked] = useState(false);

    // Selection Local State (IDs)
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);

    // 0. User fetching
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Groups fetching
    const { data: groups = [] } = useQuery({
        queryKey: ['groups', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await attendanceService.fetchGroups();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // Handle initial group selection and preference
    useEffect(() => {
        if (!selectedGroupId && groups.length > 0 && user) {
            attendanceService.getUserPreferences(user.id, 'presence_last_group_id').then(lastGroupId => {
                const lastGroup = groups.find(g => g.id === lastGroupId);
                setSelectedGroupId(lastGroup?.id || groups[0].id);
            });
        }
    }, [groups, selectedGroupId, user]);

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId) || null, [groups, selectedGroupId]);

    // 2. Students fetching (by group)
    const { data: students = [] } = useQuery({
        queryKey: ['students', user?.id, selectedGroupId],
        queryFn: async () => {
            if (!selectedGroupId) return [];
            return await attendanceService.fetchStudentsByGroup(selectedGroupId);
        },
        enabled: !!selectedGroupId && !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 3. Setups fetching
    const { data: setups = [] } = useQuery({
        queryKey: ['attendance-setup', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await attendanceService.fetchSetups();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 4. Categories fetching (by setup)
    const { data: categories = [] } = useQuery({
        queryKey: ['attendance-categories', user?.id, selectedSetupId],
        queryFn: async () => {
            if (!selectedSetupId) return [];
            return await attendanceService.fetchCategories(selectedSetupId);
        },
        enabled: !!selectedSetupId && !!user,
        staleTime: 1000 * 60 * 5,
    });

    const selectedSetup = useMemo(() => setups.find(s => s.id === selectedSetupId) || (setups.length > 0 ? setups[0] : null), [setups, selectedSetupId]);

    // 5. Existing setup check (Auto-select)
    const { data: existingSetupId } = useQuery({
        queryKey: ['attendance-check-setup', user?.id, currentDate, currentPeriod, selectedGroupId],
        queryFn: async () => {
            if (!selectedGroupId || students.length === 0) return null;
            return await attendanceService.checkExistingSetup(currentDate, currentPeriod, students.map(s => s.id));
        },
        enabled: !!user && !!selectedGroupId && students.length > 0,
    });

    useEffect(() => {
        if (existingSetupId) {
            setSelectedSetupId(existingSetupId);
            setIsSetupLocked(true);
        } else {
            setIsSetupLocked(false);
            if (setups.length > 0 && !selectedSetupId) setSelectedSetupId(setups[0].id);
        }
    }, [existingSetupId, setups, selectedSetupId]);

    // 6. Attendances fetching
    const { data: attendances = [], isLoading: loading } = useQuery({
        queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId],
        queryFn: async () => {
            if (!selectedGroupId || !selectedSetupId || students.length === 0) return [];
            return await attendanceService.fetchAttendances(currentDate, currentPeriod, students.map(s => s.id), selectedSetupId);
        },
        enabled: !!user && !!selectedGroupId && !!selectedSetupId && students.length > 0,
        staleTime: 1000 * 60,
    });

    // 7. Mutations
    const upsertMutation = useMutation({
        mutationFn: (rec: Attendance) => attendanceService.upsertAttendance(rec),
        onMutate: async (newRecord) => {
            const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Attendance[]>(queryKey) || [];

            const exists = previous.find(a => a.eleve_id === newRecord.eleve_id);
            if (exists) {
                queryClient.setQueryData<Attendance[]>(queryKey, previous.map(a => a.eleve_id === newRecord.eleve_id ? { ...a, ...newRecord } : a));
            } else {
                queryClient.setQueryData<Attendance[]>(queryKey, [...previous, newRecord]);
            }
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId] });
        },
        onSuccess: (_data, variables) => {
            // Update the temp ID with the real server ID in the cache
            if (variables.id?.toString().startsWith('temp-') && _data?.id) {
                const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
                queryClient.setQueryData<Attendance[]>(queryKey, (old = []) =>
                    old.map(a => a.id === variables.id ? { ...a, id: _data.id } : a)
                );
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => attendanceService.deleteAttendance(id),
        onMutate: async (id) => {
            const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Attendance[]>(queryKey) || [];
            queryClient.setQueryData<Attendance[]>(queryKey, previous.filter(a => a.id !== id.toString()));
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId] });
        }
    });

    const bulkMutation = useMutation({
        mutationFn: (recs: any[]) => attendanceService.bulkInsertAttendances(recs),
        onMutate: async (newRecords) => {
            const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Attendance[]>(queryKey) || [];

            const optimisticRecords: Attendance[] = newRecords.map((r: any, i: number) => ({
                id: `bulk-temp-${Date.now()}-${i}`,
                ...r,
                created_at: new Date().toISOString(),
                updated_at: null
            }));
            queryClient.setQueryData<Attendance[]>(queryKey, [...previous, ...optimisticRecords]);
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSuccess: () => {
            // After bulk insert succeeds, sync with server to get real IDs
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId] });
        }
    });

    // Actions
    const moveStudent = async (studentId: string, targetId: string) => {
        if (!selectedSetup || !user) return;

        const currentRecord = attendances.find(a => a.eleve_id === studentId);
        const currentCatId = currentRecord?.categorie_id || 'unassigned';
        if (currentCatId === targetId) return;

        if (targetId === 'unassigned') {
            if (currentRecord?.id) deleteMutation.mutate(currentRecord.id);
        } else {
            const newRecord: Attendance = {
                id: currentRecord?.id || `temp-${Date.now()}`,
                date: currentDate,
                periode: currentPeriod,
                eleve_id: studentId,
                setup_id: selectedSetup.id,
                categorie_id: targetId === 'unassigned' ? null : targetId,
                status: 'present',
                user_id: user.id,
                created_at: currentRecord?.created_at || new Date().toISOString(),
                updated_at: currentRecord?.updated_at || null
            };
            upsertMutation.mutate(newRecord);
        }
    };

    const markUnassignedAbsent = async () => {
        const unassigned = students.filter(s => !attendances.find(a => a.eleve_id === s.id));
        if (unassigned.length === 0 || !user || !selectedSetup) return;

        const absentCat = categories.find(c => c.nom === 'Absent');
        const newRecords = unassigned.map(s => ({
            date: currentDate,
            periode: currentPeriod,
            eleve_id: s.id,
            setup_id: selectedSetup.id,
            categorie_id: absentCat?.id || null,
            status: 'absent',
            user_id: user.id
        }));

        bulkMutation.mutate(newRecords);
    };

    const markUnassignedPresent = async () => {
        const unassigned = students.filter(s => !attendances.find(a => a.eleve_id === s.id));
        if (unassigned.length === 0 || !user || !selectedSetup) return;

        const presentCat = categories.find(c => c.nom !== 'Absent');
        const newRecords = unassigned.map(s => ({
            date: currentDate,
            periode: currentPeriod,
            eleve_id: s.id,
            setup_id: selectedSetup.id,
            categorie_id: presentCat?.id || null,
            status: 'present',
            user_id: user.id
        }));

        bulkMutation.mutate(newRecords);
    };

    // Helpers used in UI
    const getStudentsForCategory = (catId: string) => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.categorie_id === catId;
        });
    };

    const getUnassignedStudents = () => {
        return students.filter(s => !attendances.find(a => a.eleve_id === s.id && a.status === 'present'));
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
        groups, selectedGroup,
        students,
        setups, selectedSetup,
        categories,
        attendances,
        currentDate, currentPeriod,
        loading, error: null,
        isEditing, isSetupLocked,

        setSelectedGroup: (group: Group | null) => {
            setSelectedGroupId(group?.id || null);
            if (group && user) attendanceService.saveGroupPreference(user.id, group.id);
        },
        setSelectedSetup: (setup: SetupPresence | null) => {
            setSelectedSetupId(setup?.id || null);
        },
        setCurrentDate,
        setCurrentPeriod,
        setIsEditing,
        unlockEditing: () => {
            setIsSetupLocked(false);
            toast.success("Édition réactivée");
        },
        refreshData: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['attendance-categories', user?.id, selectedSetupId] });
        },

        moveStudent,
        markUnassignedAbsent,
        markUnassignedPresent,

        getStudentsForCategory,
        getUnassignedStudents,
        getPureUnassignedStudents,
        getSystemAbsentStudents
    };
};

export default useAttendance;
