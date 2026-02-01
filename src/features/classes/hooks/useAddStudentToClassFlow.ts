/**
 * @hook useAddStudentToClassFlow
 * @description Gère l'état et la logique du processus d'ajout d'élèves à une classe spécifique.
 * Gère le chargement des données, le filtrage des élèves et la mise à jour de leur classe.
 * 
 * @param {boolean} showModal - État de visibilité de la modale.
 * @param {string} classId - ID de la classe cible.
 * @param {Function} onAdded - Callback après ajout réussi.
 * @param {Function} handleCloseModal - Fonction pour fermer la modale.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

interface StudentWithDetails extends Tables<'Eleve'> {
    Classe?: { nom: string } | null;
    EleveGroupe?: { Groupe: { id: string; nom: string } | null }[];
}

export function useAddStudentToClassFlow(
    showModal: boolean,
    classId: string,
    onAdded: () => void,
    handleCloseModal: () => void
) {
    const [students, setStudents] = useState<StudentWithDetails[]>([]);
    const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
    const [groups, setGroups] = useState<{ id: string; nom: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'nom' | 'prenom'>('nom');

    // UI state
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    useEffect(() => {
        if (showModal) {
            fetchData();
            setSelectedStudentIds([]);
            setSearchQuery('');
            setSelectedClasses([]);
            setSelectedGroups([]);
        }
    }, [showModal]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: studentsData, error: studentsError } = await supabase
                .from('Eleve')
                .select(`
                    *,
                    Classe (nom),
                    EleveGroupe (
                        Groupe (id, nom)
                    )
                `)
                .eq('titulaire_id', user.id);

            if (studentsError) throw studentsError;

            const { data: classesData, error: classesError } = await supabase
                .from('Classe')
                .select('id, nom')
                .order('nom');

            if (classesError) throw classesError;

            const { data: groupsData, error: groupsError } = await supabase
                .from('Groupe')
                .select('id, nom')
                .order('nom');

            if (groupsError) throw groupsError;

            setStudents((studentsData as any) || []);
            setClasses(classesData || []);
            setGroups(groupsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (filteredIds: string[]) => {
        if (selectedStudentIds.length === filteredIds.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredIds);
        }
    };

    const handleSave = async () => {
        if (selectedStudentIds.length === 0) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('Eleve')
                .update({ classe_id: classId })
                .in('id', selectedStudentIds);

            if (error) throw error;

            onAdded();
            handleCloseModal();
        } catch (err) {
            console.error('Error adding students to class:', err);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(student => {
        if (student.classe_id === classId) return false;

        const matchesSearch =
            (student.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.prenom || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = selectedClasses.length === 0 || (student.classe_id && selectedClasses.includes(student.classe_id));
        const studentGroupIds = student.EleveGroupe?.map(eg => eg.Groupe?.id).filter(Boolean) || [];
        const matchesGroup = selectedGroups.length === 0 || selectedGroups.some(gid => studentGroupIds.includes(gid));

        return matchesSearch && matchesClass && matchesGroup;
    }).sort((a, b) => (a[sortBy] || '').localeCompare(b[sortBy] || ''));

    return {
        states: {
            students: filteredStudents,
            classes,
            groups,
            loading,
            saving,
            searchQuery,
            selectedClasses,
            selectedGroups,
            sortBy,
            showFilters,
            selectedStudentIds
        },
        actions: {
            setSearchQuery,
            setSelectedClasses,
            setSelectedGroups,
            setSortBy,
            setShowFilters,
            handleToggleStudent,
            handleSelectAll,
            handleSave
        }
    };
}
