import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
// @ts-ignore
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { Tables } from '../../../types/supabase';
import { studentService } from '../services/studentService';
import { toast } from 'sonner';

// Helper type for Student with joined fields
export interface StudentDetailed extends Tables<'Eleve'> {
    Classe?: {
        nom: string;
        ClasseAdulte?: {
            role: string;
            Adulte: { id: string; nom: string; prenom: string };
        }[];
    };
    Niveau?: { id: string; nom: string };
    EleveGroupe?: {
        Groupe: { id: string; nom: string };
    }[];
    importance_suivi?: number | null;
    trust_trend?: 'up' | 'down' | 'stable' | null;
}

/**
 * useStudentsData
 * 
 * Hook pour la gestion des élèves :
 * - Chargement de la liste (via TanStack Query)
 * - Sélection d'un élève
 * - Filtres (classe, groupe, recherche)
 * - CRUD (création, édition, suppression via Mutations)
 */
export const useStudentsData = (initialStudentId: string | null = null) => {
    const queryClient = useQueryClient();
    const { isOnline, addToQueue } = useOfflineSync();

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<StudentDetailed | null>(null);

    // 0. User fetching (standardized for keys)
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Fetching des élèves
    const { data: students = [], isLoading: loading } = useQuery({
        queryKey: ['students', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const data = await studentService.getStudentsForTeacher(user.id);
            return (data as any) as StudentDetailed[];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });


    // 2. Sélection de l'élève courant
    const selectedStudent = useMemo(() => {
        if (!selectedStudentId && students.length > 0) return students[0];
        return students.find(s => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);
    }, [students, selectedStudentId]);

    // Update selection if initialStudentId changes
    useEffect(() => {
        if (initialStudentId) {
            setSelectedStudentId(initialStudentId);
        }
    }, [initialStudentId]);

    // 3. Mutations
    const saveStudentMutation = useMutation({
        mutationFn: async ({ studentData, groupIds, isEdit, editId, photoBase64 }: {
            studentData: any,
            groupIds: string[],
            isEdit: boolean,
            editId: string | null,
            photoBase64: string | null
        }) => {
            const user = await getCurrentUser();
            if (!user) throw new Error("User not authenticated");

            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'Eleve',
                    method: isEdit ? 'update' : 'insert',
                    payload: { ...studentData, titulaire_id: user.id },
                    match: isEdit ? { id: editId } : undefined,
                    contextDescription: `${isEdit ? 'Maj' : 'Création'} élève ${studentData.prenom}`
                });
                return editId || 'offline-id';
            }

            return await studentService.saveStudent(
                studentData,
                groupIds,
                user.id,
                isEdit,
                editId,
                photoBase64
            );
        },
        onMutate: async (newStudent) => {
            const queryKey = ['students', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousStudents = queryClient.getQueryData<StudentDetailed[]>(queryKey) || [];

            if (newStudent.isEdit && newStudent.editId) {
                queryClient.setQueryData<StudentDetailed[]>(queryKey,
                    previousStudents.map(s => s.id === newStudent.editId ? { ...s, ...newStudent.studentData } : s)
                );
            } else {
                // To avoid disappearing from filters, we try to match the Classe and Groupe
                // from existing data in the cache if available.
                const classes = queryClient.getQueryData<any[]>(['classes', user?.id]) || [];
                const groups = queryClient.getQueryData<any[]>(['groups', user?.id]) || [];

                const matchedClass = classes.find(c => c.id === newStudent.studentData.classe_id);
                const matchedGroups = newStudent.groupIds.map(gid => ({
                    Groupe: groups.find(g => g.id === gid) || { id: gid, nom: '...' }
                }));

                const tempStudent = {
                    id: 'temp-' + Date.now(),
                    ...newStudent.studentData,
                    Classe: matchedClass ? { nom: matchedClass.nom } : undefined,
                    EleveGroupe: matchedGroups.length > 0 ? matchedGroups : undefined,
                    created_at: new Date().toISOString()
                } as StudentDetailed;

                queryClient.setQueryData<StudentDetailed[]>(queryKey, [tempStudent, ...previousStudents]);

                // Selection optimization
                if (!selectedStudentId) setSelectedStudentId(tempStudent.id);
            }

            return { previousStudents, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousStudents) {
                queryClient.setQueryData(context.queryKey, context.previousStudents);
            }
            toast.error("Échec de l'enregistrement");
        },
        onSuccess: (data: any, variables) => {
            toast.success("Élève enregistré");
            handleCloseModal();

            // If it was a creation, we might have a real ID now. 
            // We can replace the temp ID immediately in the cache to avoid a flicker
            if (!variables.isEdit && data && typeof data === 'object' && data.id) {
                const queryKey = ['students', user?.id];
                queryClient.setQueryData<StudentDetailed[]>(queryKey, (old = []) =>
                    old.map(s => s.id.startsWith('temp-') ? { ...s, ...data } : s)
                );
                setSelectedStudentId(data.id);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
        }
    });

    const updateImportanceMutation = useMutation({
        mutationFn: async ({ id, val, prenom }: { id: string; val: number | null, prenom?: string }) => {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'Eleve',
                    method: 'update',
                    payload: { importance_suivi: val },
                    match: { id },
                    contextDescription: `Maj importance ${prenom || 'élève'}`
                });
                return;
            }
            await studentService.updateStudentImportance(id, val);
        },
        onMutate: async ({ id, val }) => {
            const queryKey = ['students', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousStudents = queryClient.getQueryData<StudentDetailed[]>(queryKey);

            if (previousStudents) {
                queryClient.setQueryData<StudentDetailed[]>(queryKey,
                    previousStudents.map(s => s.id === id ? { ...s, importance_suivi: val } : s)
                );
            }
            return { previousStudents, queryKey };
        },
        onError: (err, _variables, context) => {
            if (context?.previousStudents && context.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousStudents);
            }
            console.error(err);
            toast.error("Échec de la mise à jour");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (student: StudentDetailed) => {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'Eleve',
                    method: 'delete',
                    payload: {},
                    match: { id: student.id },
                    contextDescription: `Suppression élève ${student.prenom}`
                });
                return;
            }
            await studentService.deleteStudent(student.id);
        },
        onMutate: async (student) => {
            const queryKey = ['students', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousStudents = queryClient.getQueryData<StudentDetailed[]>(queryKey);

            if (previousStudents) {
                queryClient.setQueryData<StudentDetailed[]>(queryKey,
                    previousStudents.filter(s => s.id !== student.id)
                );
            }
            return { previousStudents, queryKey };
        },
        onError: (_err, _student, context) => {
            if (context?.previousStudents && context.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousStudents);
            }
            toast.error("Erreur lors de la suppression");
        },
        onSuccess: () => {
            toast.success("Élève supprimé");
            if (selectedStudentId === studentToDelete?.id) {
                setSelectedStudentId(null);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
            setStudentToDelete(null);
        }
    });

    // Callbacks
    const handleUpdateImportance = useCallback((newVal: string) => {
        const val = newVal === '' ? null : parseInt(newVal, 10);
        if (selectedStudent) {
            updateImportanceMutation.mutate({ id: selectedStudent.id, val, prenom: selectedStudent.prenom });
        }
    }, [selectedStudent, updateImportanceMutation]);

    const handleStudentSaved = useCallback((studentData: any, groupIds: string[], photoBase64: string | null = null) => {
        saveStudentMutation.mutate({ studentData, groupIds, isEdit: isEditing, editId, photoBase64 });
    }, [saveStudentMutation, isEditing, editId]);

    const handleEdit = useCallback((student: StudentDetailed) => {
        setIsEditing(true);
        setEditId(student.id);
        setShowModal(true);
    }, []);

    const handleOpenCreate = useCallback(() => {
        setIsEditing(false);
        setEditId(null);
        setShowModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setIsEditing(false);
        setEditId(null);
    }, []);

    const handleDelete = useCallback(() => {
        if (studentToDelete) {
            deleteMutation.mutate(studentToDelete);
        }
    }, [studentToDelete, deleteMutation]);

    // 5. Filtrage mémoïsé
    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            (s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.prenom.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (filterClass === 'all' || s.Classe?.nom === filterClass) &&
            (filterGroup === 'all' || s.EleveGroupe?.some(eg => eg.Groupe?.nom === filterGroup))
        );
    }, [students, searchQuery, filterClass, filterGroup]);

    return {
        students,
        selectedStudent,
        setSelectedStudent: (s: StudentDetailed | null) => setSelectedStudentId(s?.id || null),
        loading,
        searchQuery,
        setSearchQuery,
        filterClass,
        setFilterClass,
        filterGroup,
        setFilterGroup,
        showModal,
        isEditing,
        editId,
        studentToDelete,
        setStudentToDelete,
        filteredStudents,
        fetchStudents: () => queryClient.invalidateQueries({ queryKey: ['students', user?.id] }),
        handleStudentSaved,
        handleUpdateImportance,
        handleEdit,
        handleOpenCreate,
        handleCloseModal,
        handleDelete
    };
};
