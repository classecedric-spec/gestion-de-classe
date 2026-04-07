/**
 * Nom du module/fichier : useAddStudentToClassFlow.ts
 * 
 * Données en entrée : 
 *   - showModal : Indique si la fenêtre de sélection est actuellement ouverte.
 *   - classId : Identifiant unique de la classe vers laquelle on veut transférer les élèves (destination).
 *   - onAdded : Fonction appelée automatiquement après un succès pour rafraîchir l'écran.
 *   - handleCloseModal : Fonction permettant de fermer la fenêtre à la fin.
 * 
 * Données en sortie : 
 *   - Un objet regroupant les états (liste d'élèves filtrée, sélections en cours, indicateurs de chargement).
 *   - Un objet regroupant les actions (cocher un élève, appliquer des filtres, lancer la sauvegarde).
 * 
 * Objectif principal : Gérer la logique complexe permettant à un enseignant d'aller piocher des élèves dans sa base globale pour les "importer" dans une classe précise. Le Hook gère la recherche, les filtres croisés (par classe d'origine ou par groupe) et l'enregistrement massif des changements en base de données.
 * 
 * Ce que ça affiche : Rien. Il fournit le "cerveau" au composant visuel `AddStudentToClassModal`.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

/**
 * Structure d'un élève enrichie avec son appartenance actuelle à une classe ou un groupe.
 */
interface StudentWithDetails extends Tables<'Eleve'> {
    Classe?: { nom: string } | null;
    EleveGroupe?: { Groupe: { id: string; nom: string } | null }[];
}

/**
 * Ce Hook centralise le processus de recherche et d'affectation multiple d'élèves.
 */
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

    // États pour la recherche et les filtres (Filtres & Search)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'nom' | 'prenom'>('nom');

    // États pour l'interface (UI state)
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    /**
     * Réinitialisation : dès que la fenêtre s'ouvre, on remet les filtres à zéro 
     * et on déclenche le chargement des nouveaux élèves disponibles.
     */
    useEffect(() => {
        if (showModal) {
            fetchData();
            setSelectedStudentIds([]);
            setSearchQuery('');
            setSelectedClasses([]);
            setSelectedGroups([]);
        }
    }, [showModal]);

    /**
     * Chargement complet : récupère tous les élèves rattachés à cet enseignant, 
     * ainsi que la liste des classes et groupes existants pour alimenter les menus de filtres.
     */
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Récupération des élèves
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

            // 2. Récupération des classes pour les boutons de filtre
            const { data: classesData, error: classesError } = await supabase
                .from('Classe')
                .select('id, nom')
                .order('nom');

            if (classesError) throw classesError;

            // 3. Récupération des groupes pour les boutons de filtre
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

    /**
     * Sélection individuelle : permet de cocher ou décocher un élève spécifique 
     * dans la liste des transferts potentiels.
     */
    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    /**
     * Sélection groupée : permet de cocher tous les élèves actuellement visibles 
     * (après application des filtres) en un seul clic.
     */
    const handleSelectAll = (filteredIds: string[]) => {
        if (selectedStudentIds.length === filteredIds.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredIds);
        }
    };

    /**
     * Action finale : enregistre l'affectation massive sur le serveur Supabase.
     */
    const handleSave = async () => {
        if (selectedStudentIds.length === 0) return;
        setSaving(true);
        try {
            // On met à jour le champ 'classe_id' pour TOUS les élèves sélectionnés d'un seul coup
            const { error } = await supabase
                .from('Eleve')
                .update({ classe_id: classId })
                .in('id', selectedStudentIds);

            if (error) throw error;

            // Notifications de succès
            onAdded();
            handleCloseModal();
        } catch (err) {
            console.error('Error adding students to class:', err);
        } finally {
            setSaving(false);
        }
    };

    /**
     * Logique de filtrage réactive : affine dynamiquement la liste affichée 
     * en fonction de la barre de recherche et des catégories sélectionnées.
     */
    const filteredStudents = students.filter(student => {
        // Règle 1 : On n'affiche pas les élèves qui sont déjà inscrits dans la classe cible
        if (student.classe_id === classId) return false;

        // Règle 2 : Filtrage par texte (Nom ou Prénom)
        const matchesSearch =
            (student.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.prenom || '').toLowerCase().includes(searchQuery.toLowerCase());

        // Règle 3 : Filtrage par appartenance à une classe d'origine
        const matchesClass = selectedClasses.length === 0 || (student.classe_id && selectedClasses.includes(student.classe_id));
        
        // Règle 4 : Filtrage par appartenance à un groupe
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant souhaite affecter des élèves existants à sa classe 'CP-GS'.
 * 2. Une fenêtre s'ouvre, pilotée par ce Hook.
 * 3. Au démarrage : le Hook charge tous les élèves de l'école (via Supabase).
 * 4. L'enseignant utilise les outils interactifs :
 *    - Tape un nom dans la recherche -> La liste s'affine en temps réel.
 *    - Utilise les filtres "Ancienne Classe" -> Affiche uniquement les élèves de l'an dernier.
 * 5. L'enseignant "Coche" les noms des élèves qu'il veut importer.
 * 6. Lors du clic sur "Valider l'ajout" :
 *    - Le Hook lance une commande unique vers le serveur pour mettre à jour tous les profils.
 *    - Il ferme ensuite la fenêtre et demande à l'écran principal de se rafraîchir.
 */
