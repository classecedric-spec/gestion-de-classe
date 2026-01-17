import { useState, useEffect, useMemo, useCallback } from 'react';
import { classService } from '../services/classService';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/photoCache';

export const useClasses = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [studentsInClass, setStudentsInClass] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Filters & Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Modals visibility state
    const [modals, setModals] = useState({
        createEditClass: false,
        studentDetails: false,
        addStudentToClass: false,
        deleteConfim: false
    });

    // Selection state for modals
    const [activeItem, setActiveItem] = useState({
        classToEdit: null,
        studentToEditId: null,
        classToDelete: null
    });

    // --- Data Fetching ---

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
                // We need to fetch students for this specific class now
                // However, fetchStudents isn't defined yet (it's declared below).
                // To avoid circular or hoisting issues, we can just let a useEffect handle the initial student fetch
                // OR simpler: we don't fetch students here?
                // The original code did: handleSelectClass(data[0])

                // Let's defer student fetching to component effect when selectedClass changes?
                // No, useClasses is a hook.

                // Better approach: Define fetchStudents BEFORE fetchClasses or use a useEffect for "When selectedClass changes, fetch students".
                // I'll adopt the useEffect approach for reaction.
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    const fetchStudents = useCallback(async (classId) => {
        if (!classId) return;
        setLoadingStudents(true);
        try {
            const data = await classService.getStudentsByClass(classId);

            // Apply photo caching logic (kept from original)
            if (isCacheEnabled() && data) {
                const studentsWithCachedPhotos = await Promise.all(
                    data.map(async (student) => {
                        if (student.photo_hash) {
                            const cachedPhoto = await getCachedPhoto(student.id, student.photo_hash);
                            if (cachedPhoto) return { ...student, photo_base64: cachedPhoto };
                            else if (student.photo_base64) {
                                await setCachedPhoto(student.id, student.photo_base64, student.photo_hash);
                            }
                        }
                        return student;
                    })
                );
                setStudentsInClass(studentsWithCachedPhotos || []);
            } else {
                setStudentsInClass(data || []);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

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
    }, [selectedClass, fetchStudents]); // fetchStudents is stable (useCallback) if we fix its deps

    // --- Actions ---

    const handleSelectClass = (classe) => {
        setSelectedClass(classe);
        fetchStudents(classe.id);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDeleteClass = async () => {
        const target = activeItem.classToDelete;
        if (!target) return;

        setLoading(true);
        try {
            await classService.deleteClass(target.id);

            if (selectedClass?.id === target.id) {
                setSelectedClass(null);
                setStudentsInClass([]);
            }
            toggleModal('deleteConfirm', false);
            fetchClasses();
        } catch (error) {
            alert('Erreur suppression: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        try {
            await classService.removeStudentFromClass(studentId);
            if (selectedClass) fetchStudents(selectedClass.id);
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const handleUpdateStudent = async (studentId, field, value) => {
        // Optimistic update
        setStudentsInClass(prev => prev.map(s =>
            s.id === studentId ? { ...s, [field]: value } : s
        ));

        try {
            await classService.updateStudentField(studentId, field, value);
        } catch (error) {
            console.error('Error updating student:', error);
            // Revert could be added here
            if (selectedClass) fetchStudents(selectedClass.id);
        }
    };

    // --- Computed ---

    const filteredClasses = useMemo(() => {
        return classes.filter(c =>
            c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.acronyme?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [classes, searchQuery]);

    const sortedStudents = useMemo(() => {
        if (!sortConfig.key) return studentsInClass;
        return [...studentsInClass].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [studentsInClass, sortConfig]);

    // --- Modal Helpers ---

    const toggleModal = (modalName, isOpen, item = null) => {
        setModals(prev => ({ ...prev, [modalName]: isOpen }));

        if (item !== undefined) {
            // Logic specific to each modal/item type could go here
            // For simplicity, we just set the relevant active item state
            if (modalName === 'createEditClass') {
                setActiveItem(prev => ({ ...prev, classToEdit: item }));
            } else if (modalName === 'studentDetails') {
                setActiveItem(prev => ({ ...prev, studentToEditId: item?.id }));
            } else if (modalName === 'deleteConfirm') {
                setActiveItem(prev => ({ ...prev, classToDelete: item }));
            }
        }
    };

    return {
        // State
        classes,
        loading,
        loadingStudents,
        selectedClass,
        studentsInClass: sortedStudents, // Return sorted directly
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        sortConfig,

        // Computed
        filteredClasses,

        // Actions
        handleSelectClass,
        handleSort,
        handleDeleteClass,
        handleRemoveStudent,
        handleUpdateStudent,
        refreshClasses: fetchClasses,
        refreshStudents: () => fetchStudents(selectedClass?.id),

        // Modals / Active Items
        modals,
        activeItem,
        toggleModal
    };
};
