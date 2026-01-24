import { useState, useEffect, useMemo, useCallback } from 'react';
import { classService, ClassWithAdults, StudentWithRelations } from '../services/classService';
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
    const [classes, setClasses] = useState<ClassWithAdults[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<ClassWithAdults | null>(null);
    const [studentsInClass, setStudentsInClass] = useState<StudentWithRelations[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

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

    // --- Data Fetching ---

    const fetchStudents = useCallback(async (classId: string) => {
        if (!classId) return;
        setLoadingStudents(true);
        try {
            const data = await classService.getStudentsByClass(classId);

            // Apply photo caching logic
            if (isCacheEnabled() && data) {
                const studentsWithCachedPhotos = await Promise.all(
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
                setStudentsInClass(studentsWithCachedPhotos || []);
            } else {
                setStudentsInClass((data as any) || []);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    const fetchClasses = useCallback(async (keepSelection = false) => {
        setLoading(true);
        try {
            const data = await classService.getClasses();
            setClasses(data);

            // Re-sync selected class if it was updated
            if (keepSelection && selectedClass) {
                const updated = data.find(c => c.id === selectedClass.id);
                if (updated) setSelectedClass(updated);
            } else if (data.length > 0 && !selectedClass) {
                // Default select first class if none selected
                setSelectedClass(data[0]);
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    // Initial Load
    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    // Load students when a class is selected
    useEffect(() => {
        if (selectedClass) {
            fetchStudents(selectedClass.id);
        } else {
            setStudentsInClass([]);
        }
    }, [selectedClass, fetchStudents]);

    // --- Actions ---

    const handleSelectClass = (classe: ClassWithAdults) => {
        setSelectedClass(classe);
        fetchStudents(classe.id);
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

    const handleAddClass = useCallback((newClass: ClassWithAdults) => {
        // Optimistic update: add new class to local state immediately
        setClasses(prev => {
            const updated = [...prev, newClass];
            return updated.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        });

        // Select the newly created class
        setSelectedClass(newClass);
    }, []);

    const handleUpdateClass = useCallback((updatedClass: ClassWithAdults) => {
        // Optimistic update: replace old class with updated data
        setClasses(prev =>
            prev.map(c => c.id === updatedClass.id ? updatedClass : c)
                .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        );

        // Sync selection if the updated class is current
        if (selectedClass?.id === updatedClass.id) {
            setSelectedClass(updatedClass);
        }
    }, [selectedClass]);

    const handleDeleteClass = async () => {
        const target = activeItem.classToDelete;
        if (!target) return;

        const previousClasses = [...classes];
        const previousSelection = selectedClass;

        // Optimistic UI Update: remove class from local state immediately
        const remainingClasses = classes.filter(c => c.id !== target.id);
        setClasses(remainingClasses);

        // If the deleted class was selected, select first remaining class
        if (selectedClass?.id === target.id) {
            setSelectedClass(remainingClasses.length > 0 ? remainingClasses[0] : null);
            setStudentsInClass([]);
        }

        toggleModal('deleteConfirm', false);

        try {
            await classService.deleteClass(target.id);
        } catch (error: any) {
            alert('Erreur suppression: ' + error.message);
            // Revert on error
            setClasses(previousClasses);
            setSelectedClass(previousSelection);
            if (previousSelection?.id === target.id) {
                fetchStudents(target.id);
            }
        }
    };



    const handleAddStudent = useCallback((newStudent: StudentWithRelations) => {
        // Optimistic Check: Does this student belong to the currently selected class?
        if (selectedClass && newStudent.classe_id === selectedClass.id) {
            setStudentsInClass(prev => {
                // Prevent duplicates just in case
                if (prev.some(s => s.id === newStudent.id)) return prev;

                const updated = [...prev, newStudent];
                // Sort by name (simple default sort)
                return updated.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
            });
        }
    }, [selectedClass]);

    const handleRemoveStudent = async (studentId: string) => {
        // Optimistic update
        const previousStudents = [...studentsInClass];
        setStudentsInClass(prev => prev.filter(s => s.id !== studentId));

        try {
            await classService.removeStudentFromClass(studentId);
        } catch (error: any) {
            alert('Erreur: ' + error.message);
            // Revert on error
            setStudentsInClass(previousStudents);
        }
    };

    const handleUpdateStudent = async (studentId: string, field: string, value: any) => {
        // Optimistic update
        setStudentsInClass(prev => prev.map(s =>
            s.id === studentId ? { ...s, [field]: value } : s
        ));

        try {
            await classService.updateStudentField(studentId, field as any, value);
        } catch (error) {
            console.error('Error updating student:', error);
            if (selectedClass) fetchStudents(selectedClass.id);
        }
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
        refreshClasses: fetchClasses,
        refreshStudents: () => fetchStudents(selectedClass?.id || ''),

        // Modals / Active Items
        modals,
        activeItem,
        toggleModal
    };
};
