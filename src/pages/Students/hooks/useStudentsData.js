import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useOfflineSync } from '../../../context/OfflineSyncContext';

/**
 * useStudentsData
 * 
 * Hook pour la gestion des élèves :
 * - Chargement de la liste
 * - Sélection d'un élève
 * - Filtres (classe, groupe, recherche)
 * - CRUD (création, édition, suppression)
 */
export const useStudentsData = (initialStudentId = null, initialTab = null) => {
    const { isOnline, addToQueue } = useOfflineSync();

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Charge la liste des élèves
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('Eleve')
                .select(`
                    *,
                    Classe (
                        nom,
                        ClasseAdulte (
                            role,
                            Adulte (id, nom, prenom)
                        )
                    ),
                    Niveau (nom),
                    EleveGroupe (
                        Groupe (id, nom)
                    )
                `)
                .eq('titulaire_id', user.id)
                .order('nom', { ascending: true });

            if (error) throw error;
            setStudents(data || []);

            // Sélection avec support de la navigation
            if (data && data.length > 0) {
                if (initialStudentId) {
                    const target = data.find(s => s.id === initialStudentId);
                    if (target) {
                        setSelectedStudent(target);
                        return;
                    }
                }

                if (!selectedStudent) {
                    setSelectedStudent(data[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    }, [initialStudentId, selectedStudent]);

    // Callback après sauvegarde d'un élève
    const handleStudentSaved = useCallback(async (studentId) => {
        await fetchStudents();
        if (selectedStudent && selectedStudent.id === studentId) {
            const { data: updatedStudent } = await supabase
                .from('Eleve')
                .select(`
                    *,
                    Classe (
                        nom,
                        ClasseAdulte (
                            role,
                            Adulte (id, nom, prenom)
                        )
                    ),
                    Niveau (nom),
                    EleveGroupe (
                        Groupe (id, nom)
                    )
                `)
                .eq('id', studentId)
                .single();
            if (updatedStudent) setSelectedStudent(updatedStudent);
        }
    }, [fetchStudents, selectedStudent]);

    // Met à jour l'importance de suivi de l'élève
    const handleUpdateImportance = useCallback(async (newVal) => {
        const val = newVal === '' ? null : parseInt(newVal, 10);

        // Optimistic UI Update
        const updated = { ...selectedStudent, importance_suivi: val };
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

        await supabase
            .from('Eleve')
            .update({ importance_suivi: val })
            .eq('id', updated.id);
    }, [selectedStudent, isOnline, addToQueue]);

    // Ouvre le modal d'édition
    const handleEdit = useCallback((student) => {
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
            const { error } = await supabase.from('Eleve').delete().eq('id', targetStudent.id);
            if (error) throw error;

            if (selectedStudent?.id === targetStudent.id) {
                setSelectedStudent(null);
            }

            setStudentToDelete(null);
            fetchStudents();
        } catch (error) {
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
