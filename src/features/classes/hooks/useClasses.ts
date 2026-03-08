import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, ClassWithAdults, StudentWithRelations } from '../services/classService';
import { getCurrentUser } from '../../../lib/database';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/storage';

export interface ClassesState {
    classes: ClassWithAdults[];
    loading: boolean;
    loadingStudents: boolean;
    selectedClass: ClassWithAdults | null;
    studentsInClass: StudentWithRelations[];
    searchQuery: string;
    viewMode: 'grid' | 'table';
    sortConfig: { key: string | null; direction: 'asc' | 'desc' };
    modals: {
        createEditClass: boolean;
        studentDetails: boolean;
        addStudentToClass: boolean;
        deleteConfirm: boolean;
    };
    activeItem: {
        classToEdit: ClassWithAdults | null;
        studentToEditId: string | null;
        classToDelete: ClassWithAdults | null;
    };
}

export const useClasses = () => {
    const queryClient = useQueryClient();
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // Filters & Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    // Modals visibility state
    const [modals, setModals] = useState({
        createEditClass: false,
        studentDetails: false,
        addStudentToClass: false,
        deleteConfirm: false
    });

    // Selection state for modals
    const [activeItem, setActiveItem] = useState<{
        classToEdit: ClassWithAdults | null;
        studentToEditId: string | null;
        classToDelete: ClassWithAdults | null;
    }>({
        classToEdit: null,
        studentToEditId: null,
        classToDelete: null
    });

    // 0. User fetching
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Fetching des classes
    const { data: classes = [], isLoading: loading } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await classService.getClasses();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 2. Sélection de la classe courante
    const selectedClass = useMemo(() => {
        if (!selectedClassId && classes.length > 0) return classes[0];
        return classes.find(c => c.id === selectedClassId) || (classes.length > 0 ? classes[0] : null);
    }, [classes, selectedClassId]);

    // 3. Fetching des élèves de la classe sélectionnée
    const { data: studentsInClass = [], isLoading: loadingStudents } = useQuery({
        queryKey: ['students-in-class', user?.id, selectedClass?.id],
        queryFn: async () => {
            if (!selectedClass || !user) return [];
            const data = await classService.getStudentsByClass(selectedClass.id);

            // Fetching & caching photo logic stays similar but encapsulated in queryFn
            if (isCacheEnabled() && data) {
                return await Promise.all(
                    data.map(async (student) => {
                        if (student.photo_hash) {
                            const cachedPhoto = await getCachedPhoto(student.id, student.photo_hash);
                            if (cachedPhoto) return { ...student, photo_base64: cachedPhoto } as StudentWithRelations;
                            else if (student.photo_base64) {
                                await setCachedPhoto(student.id, student.photo_base64, student.photo_hash);
                            }
                        }
                        return student as StudentWithRelations;
                    })
                );
            }
            return (data as any) || [];
        },
        enabled: !!selectedClass && !!user,
        staleTime: 1000 * 60 * 5,
    });

    // Sync selectedClassId if current selection disappears
    useEffect(() => {
        if (selectedClass && selectedClass.id !== selectedClassId) {
            setSelectedClassId(selectedClass.id);
        }
    }, [selectedClass, selectedClassId]);

    // --- Actions ---

    const handleSelectClass = (classe: ClassWithAdults) => {
        setSelectedClassId(classe.id);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleModal = (modalName: keyof typeof modals, isOpen: boolean, item: any = null) => {
        setModals(prev => ({ ...prev, [modalName]: isOpen }));

        if (item !== null) {
            if (modalName === 'createEditClass') {
                setActiveItem(prev => ({ ...prev, classToEdit: item }));
            } else if (modalName === 'studentDetails') {
                setActiveItem(prev => ({ ...prev, studentToEditId: item?.id }));
            } else if (modalName === 'deleteConfirm') {
                setActiveItem(prev => ({ ...prev, classToDelete: item }));
            }
        }
    };

    const deleteClassMutation = useMutation({
        mutationFn: (id: string) => classService.deleteClass(id),
        onMutate: async (id) => {
            const queryKey = ['classes', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousClasses = queryClient.getQueryData<ClassWithAdults[]>(queryKey) || [];

            queryClient.setQueryData<ClassWithAdults[]>(queryKey,
                previousClasses.filter(c => c.id !== id)
            );

            if (selectedClassId === id) {
                const remaining = previousClasses.filter(c => c.id !== id);
                setSelectedClassId(remaining.length > 0 ? remaining[0].id : null);
            }

            return { previousClasses, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousClasses) queryClient.setQueryData(context.queryKey, context.previousClasses);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
        }
    });

    const addClassMutation = useMutation({
        mutationFn: (newClass: any) => classService.createClass(newClass),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
        }
    });

    const removeStudentMutation = useMutation({
        mutationFn: (studentId: string) => classService.removeStudentFromClass(studentId),
        onMutate: async (studentId) => {
            const queryKey = ['students-in-class', user?.id, selectedClass?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<StudentWithRelations[]>(queryKey) || [];

            queryClient.setQueryData<StudentWithRelations[]>(queryKey,
                previous.filter(s => s.id !== studentId)
            );
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] });
            queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
        }
    });

    const updateStudentMutation = useMutation({
        mutationFn: ({ studentId, field, value }: { studentId: string, field: string, value: any }) =>
            classService.updateStudentField(studentId, field as any, value),
        onMutate: async ({ studentId, field, value }) => {
            const queryKey = ['students-in-class', user?.id, selectedClass?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<StudentWithRelations[]>(queryKey) || [];

            queryClient.setQueryData<StudentWithRelations[]>(queryKey,
                previous.map(s => s.id === studentId ? { ...s, [field]: value } : s)
            );
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] });
            queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
        }
    });

    const handleAddClass = useCallback((classData: any) => {
        addClassMutation.mutate(classData);
    }, [addClassMutation]);

    const handleUpdateClass = useCallback((_updatedClass: ClassWithAdults) => {
        queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
    }, [queryClient, user?.id]);

    const handleDeleteClass = async () => {
        const target = activeItem.classToDelete;
        if (!target) return;
        deleteClassMutation.mutate(target.id);
        toggleModal('deleteConfirm', false);
    };

    const handleAddStudent = useCallback((_newStudent: StudentWithRelations) => {
        queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] });
        queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
    }, [queryClient, selectedClass?.id, user?.id]);

    const handleRemoveStudent = async (studentId: string) => {
        removeStudentMutation.mutate(studentId);
    };

    const handleUpdateStudent = async (studentId: string, field: string, value: any) => {
        updateStudentMutation.mutate({ studentId, field, value });
    };

    // --- Computed ---

    const filteredClasses = useMemo(() => {
        return classes.filter(c =>
            (c.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.acronyme || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [classes, searchQuery]);

    const sortedStudents = useMemo(() => {
        if (!sortConfig.key) return studentsInClass;
        return [...studentsInClass].sort((a: any, b: any) => {
            if (a[sortConfig.key as string] < b[sortConfig.key as string]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key as string] > b[sortConfig.key as string]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [studentsInClass, sortConfig]);

    return {
        // State
        classes,
        loading,
        loadingStudents,
        selectedClass,
        studentsInClass: sortedStudents,
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        sortConfig,

        // Computed
        filteredClasses,

        // Actions
        handleSelectClass,
        handleSort,
        handleAddClass,
        handleUpdateClass,
        handleDeleteClass,
        handleAddStudent,
        handleRemoveStudent,
        handleUpdateStudent,
        refreshClasses: () => queryClient.invalidateQueries({ queryKey: ['classes', user?.id] }),
        refreshStudents: () => queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] }),

        // Modals / Active Items
        modals,
        activeItem,
        toggleModal
    };
};
