import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

export interface StudentWithClass extends Tables<'Eleve'> {
    Classe?: { nom: string };
}

/**
 * useGroupStudents - Hook pour la gestion des élèves dans un groupe
 */
export const useGroupStudents = (selectedGroup: Tables<'Groupe'> | null) => {
    const [studentsInGroup, setStudentsInGroup] = useState<StudentWithClass[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState<StudentWithClass | null>(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);

    const fetchStudentsInGroup = useCallback(async (groupId: string) => {
        if (!groupId) {
            setStudentsInGroup([]);
            return;
        }

        setLoadingStudents(true);
        try {
            // 1. Get Eleve IDs from Join Table
            const { data: links, error: linkError } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            if (linkError) throw linkError;

            const studentIds = links.map(l => l.eleve_id);

            if (studentIds.length === 0) {
                setStudentsInGroup([]);
                return;
            }

            // 2. Fetch Students
            const { data, error } = await supabase
                .from('Eleve')
                .select('*, Classe(nom)')
                .in('id', studentIds)
                .order('nom');

            if (error) throw error;
            setStudentsInGroup(data as StudentWithClass[] || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    const handleRemoveClick = useCallback((e: React.MouseEvent, student: StudentWithClass) => {
        e.stopPropagation();
        setStudentToRemove(student);
        setShowRemoveModal(true);
    }, []);

    const confirmRemoveStudent = useCallback(async () => {
        if (!selectedGroup || !studentToRemove) return;

        try {
            const { error } = await supabase
                .from('EleveGroupe')
                .delete()
                .match({ eleve_id: studentToRemove.id, groupe_id: selectedGroup.id });

            if (error) throw error;
            await fetchStudentsInGroup(selectedGroup.id);
            setShowRemoveModal(false);
            setStudentToRemove(null);
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        }
    }, [selectedGroup, studentToRemove, fetchStudentsInGroup]);

    useEffect(() => {
        if (selectedGroup) {
            fetchStudentsInGroup(selectedGroup.id);
        } else {
            setStudentsInGroup([]);
        }
    }, [selectedGroup, fetchStudentsInGroup]);

    return {
        studentsInGroup,
        loadingStudents,
        studentToRemove,
        showRemoveModal,
        setShowRemoveModal,
        handleRemoveClick,
        confirmRemoveStudent,
        fetchStudentsInGroup
    };
};
