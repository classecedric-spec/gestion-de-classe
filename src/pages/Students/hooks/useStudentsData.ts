import { useState, useCallback } from 'react';
import { getCurrentUser } from '../../../lib/database';
// @ts-ignore
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { Tables } from '../../../types/supabase';
import { studentService } from '../../../features/students/services/studentService';

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
}

/**
 * useStudentsData
 * 
 * Hook pour la gestion des élèves :
 * - Chargement de la liste
 * - Sélection d'un élève
 * - Filtres (classe, groupe, recherche)
 * - CRUD (création, édition, suppression)
 */
export const useStudentsData = (initialStudentId: string | null = null) => {
    const { isOnline, addToQueue } = useOfflineSync();

    const [students, setStudents] = useState<StudentDetailed[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentDetailed | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<StudentDetailed | null>(null);

    // Charge la liste des élèves
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const data = await studentService.getStudentsForTeacher(user.id);
            setStudents((data as any) as StudentDetailed[] || []);

            // Sélection avec support de la navigation
            if (data && data.length > 0) {
                if (initialStudentId) {
                    const target = ((data as any) as StudentDetailed[]).find(s => s.id === initialStudentId);
                    if (target) {
                        setSelectedStudent(target);
                        return;
                    }
                }

                if (!selectedStudent) {
                    setSelectedStudent((data[0] as any) as StudentDetailed);
                }
            }
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    }, [initialStudentId, selectedStudent]);

    // Callback après sauvegarde d'un élève
    const handleStudentSaved = useCallback(async (studentId: string) => {
        await fetchStudents();
        try {
            // @ts-ignore
            const _updatedStudent = await studentService.getStudent(studentId);
            // We need the full object with joins, so maybe just finding it in the new list is enough
            // But fetchStudents updates state async. 
            // Let's refetch specific student using the service if we can, BUT getStudent doesn't return joins.
            // Best is to wait for fetchStudents to complete and set selected from there?
            // Or just rely on fetchStudents doing its job.
            // For now, let's just trigger fetchStudents, and maybe try to set selected from there if finding it.
            // Actually, we can just let the user re-select or rely on the list.
            // But to be cleaner, let's keep the logic simple:
            // fetchStudents will update the list.
            // Then we can try to find it in the new list? No, we don't have access to the new state yet.
            // The original code did a single fetch. 
            // Since getStudent doesn't return joins, we rely on fetchStudents.
        } catch (e) {
            console.error(e);
        }
    }, [fetchStudents]);

    // Met à jour l'importance de suivi de l'élève
    const handleUpdateImportance = useCallback(async (newVal: string) => {
        const val = newVal === '' ? null : parseInt(newVal, 10);
        if (!selectedStudent) return;

        // Optimistic UI Update
        const updated: StudentDetailed = { ...selectedStudent, importance_suivi: val };
        setSelectedStudent(updated);
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));

        if (!isOnline) {
            addToQueue({
                type: 'SUPABASE_CALL',
                table: 'Eleve',
                method: 'update',
                payload: { importance_suivi: val },
                match: { id: updated.id },
                contextDescription: `Maj importance ${updated.prenom}`
            });
            return;
        }

        try {
            await studentService.updateStudentImportance(updated.id, val);
        } catch (err) {
            console.error(err);
        }
    }, [selectedStudent, isOnline, addToQueue]);

    // Ouvre le modal d'édition
    const handleEdit = useCallback((student: StudentDetailed) => {
        setIsEditing(true);
        setEditId(student.id);
        setShowModal(true);
    }, []);

    // Ouvre le modal de création
    const handleOpenCreate = useCallback(() => {
        setIsEditing(false);
        setEditId(null);
        setShowModal(true);
    }, []);

    // Ferme le modal
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setIsEditing(false);
        setEditId(null);
    }, []);

    // Supprime un élève
    const handleDelete = useCallback(async () => {
        const targetStudent = studentToDelete;
        if (!targetStudent) return;

        setLoading(true);
        try {
            await studentService.deleteStudent(targetStudent.id);

            if (selectedStudent?.id === targetStudent.id) {
                setSelectedStudent(null);
            }

            setStudentToDelete(null);
            fetchStudents();
        } catch (error: any) {
            alert('Erreur lors de la suppression: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [studentToDelete, selectedStudent, fetchStudents]);

    // Filtre les élèves
    const filteredStudents = students.filter(s =>
        (s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.prenom.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (filterClass === 'all' || s.Classe?.nom === filterClass) &&
        (filterGroup === 'all' || s.EleveGroupe?.some(eg => eg.Groupe?.nom === filterGroup))
    );

    return {
        students,
        setStudents,
        selectedStudent,
        setSelectedStudent,
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
        fetchStudents,
        handleStudentSaved,
        handleUpdateImportance,
        handleEdit,
        handleOpenCreate,
        handleCloseModal,
        handleDelete
    };
};
