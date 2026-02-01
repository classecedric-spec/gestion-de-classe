/**
 * @hook useAddStudentToGroupFlow
 * @description Gère l'état et la logique du processus d'ajout d'élèves à un groupe.
 * Gère le chargement des données (élèves, classes, groupes, niveaux), les filtres et l'enregistrement.
 * 
 * @param {boolean} showModal - État de visibilité de la modale.
 * @param {string} groupId - ID du groupe cible.
 * @param {Function} onAdded - Callback après ajout réussi.
 * @param {Function} handleCloseModal - Fonction pour fermer la modale.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

interface StudentWithDetails extends Tables<'Eleve'> {
    Classe?: { nom: string } | null;
    EleveGroupe?: { groupe_id: string; Groupe?: { id: string; nom: string } }[];
}

export function useAddStudentToGroupFlow(
    showModal: boolean,
    groupId: string,
    onAdded?: () => void,
    handleCloseModal?: () => void
) {
    const [students, setStudents] = useState<StudentWithDetails[]>([]);
    const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
    const [groups, setGroups] = useState<{ id: string; nom: string }[]>([]);
    const [niveaux, setNiveaux] = useState<{ id: string; nom: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);
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
            setSelectedNiveaux([]);
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
                        groupe_id,
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

            const { data: niveauxData, error: niveauxError } = await supabase
                .from('Niveau')
                .select('id, nom')
                .order('ordre', { ascending: true });

            if (niveauxError) throw niveauxError;

            setStudents((studentsData as any) || []);
            setClasses(classesData || []);
            setGroups(groupsData || []);
            setNiveaux(niveauxData || []);
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const { data: existingRelations } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            const existingIds = existingRelations?.map((r: any) => r.eleve_id) || [];
            const newIds = selectedStudentIds.filter(id => !existingIds.includes(id));

            if (newIds.length > 0) {
                const insertRows = newIds.map(eleveId => ({
                    eleve_id: eleveId,
                    groupe_id: groupId,
                    user_id: user.id
                }));

                const { error } = await supabase
                    .from('EleveGroupe')
                    .insert(insertRows);

                if (error) throw error;
            }

            if (onAdded) onAdded();
            if (handleCloseModal) handleCloseModal();
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            (student.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.prenom || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = selectedClasses.length === 0 || (student.classe_id && selectedClasses.includes(student.classe_id));
        const matchesNiveau = selectedNiveaux.length === 0 || (student.niveau_id && selectedNiveaux.includes(student.niveau_id));

        const studentGroupIds = student.EleveGroupe?.map(eg => eg.groupe_id) || [];
        const matchesGroup = selectedGroups.length === 0 || selectedGroups.some(gId => studentGroupIds.includes(gId));

        const inCurrentGroup = studentGroupIds.includes(groupId);
        return matchesSearch && matchesClass && matchesNiveau && matchesGroup && !inCurrentGroup;
    }).sort((a, b) => {
        if (sortBy === 'nom') return (a.nom || '').localeCompare(b.nom || '');
        return (a.prenom || '').localeCompare(b.prenom || '');
    });

    return {
        states: {
            students: filteredStudents,
            classes,
            groups,
            niveaux,
            loading,
            saving,
            searchQuery,
            selectedClasses,
            selectedGroups,
            selectedNiveaux,
            sortBy,
            showFilters,
            selectedStudentIds
        },
        actions: {
            setSearchQuery,
            setSelectedClasses,
            setSelectedGroups,
            setSelectedNiveaux,
            setSortBy,
            setShowFilters,
            handleToggleStudent,
            handleSelectAll,
            handleSave
        }
    };
}
