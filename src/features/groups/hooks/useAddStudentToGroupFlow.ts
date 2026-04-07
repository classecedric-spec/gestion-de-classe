/**
 * Nom du module/fichier : useAddStudentToGroupFlow.ts
 * 
 * Données en entrée : 
 *   - `showModal` : Indique si la fenêtre de sélection des élèves doit s'afficher.
 *   - `groupId` : L'identifiant du groupe de destination (ex: "Groupe de Besoin - Mathématiques").
 *   - `onAdded` : Fonction de rappel exécutée après une inscription réussie.
 *   - `handleCloseModal` : Fonction pour refermer la fenêtre.
 * 
 * Données en sortie : 
 *   - Une liste filtrée d'élèves (ceux que l'on peut ajouter, sans les doublons).
 *   - Des outils de recherche et de filtrage (par classe, par niveau, par nom).
 *   - Des fonctions pour cocher/décocher les élèves et valider l'inscription.
 * 
 * Objectif principal : Gérer le processus délicat de l'inscription massive d'élèves dans un groupe spécifique. Ce Hook est le "cerveau" de la fenêtre d'ajout : il charge l'annuaire complet de l'enseignant, permet de filtrer finement les enfants (ex: "Montre-moi tous les élèves de CP qui ne sont pas encore dans ce groupe"), et exécute l'enregistrement groupé dans la base de données de manière sécurisée.
 * 
 * Ce que ça affiche : Rien (fournisseur de logique pour le composant AddStudentToGroupModal).
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';

// Structure enrichie : un élève avec le nom de sa classe et la liste de ses groupes actuels.
interface StudentWithDetails extends Tables<'Eleve'> {
    Classe?: { nom: string } | null;
    EleveGroupe?: { groupe_id: string; Groupe?: { id: string; nom: string } }[];
}

/**
 * Assistant orchestrant le flux d'ajout massif d'élèves dans un groupe.
 */
export function useAddStudentToGroupFlow(
    showModal: boolean,
    groupId: string,
    onAdded?: () => void,
    handleCloseModal?: () => void
) {
    // ÉTATS DE DONNÉES (Listes chargées depuis le serveur)
    const [students, setStudents] = useState<StudentWithDetails[]>([]);
    const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
    const [groups, setGroups] = useState<{ id: string; nom: string }[]>([]);
    const [niveaux, setNiveaux] = useState<{ id: string; nom: string }[]>([]);

    // ÉTATS DE CHARGEMENT
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ÉTATS DES FILTRES (Ce que l'utilisateur saisit à l'écran)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'nom' | 'prenom'>('nom');

    // ÉTAT DE SÉLECTION
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    /** 
     * INITIALISATION : 
     * À chaque ouverture de la fenêtre, on vide la sélection précédente et on rafraîchit l'annuaire.
     */
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

    /** 
     * RÉCUPÉRATION DE L'ANNUAIRE : 
     * Télécharge tous les élèves de l'enseignant avec leurs classes et leurs groupes 
     * pour permettre un filtrage précis.
     */
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Chargement des élèves et de leurs appartenances actuelles.
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

            // Chargement des listes de référence pour construire les menus de filtres.
            const { data: classesData } = await supabase.from('Classe').select('id, nom').order('nom');
            const { data: groupsData } = await supabase.from('Groupe').select('id, nom').order('nom');
            const { data: niveauxData } = await supabase.from('Niveau').select('id, nom').order('ordre');

            setStudents((studentsData as any) || []);
            setClasses(classesData || []);
            setGroups(groupsData || []);
            setNiveaux(niveauxData || []);
        } catch (error) {
            console.error('Erreur lors du chargement de l\'annuaire:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * GESTION DES CASES À COCHER : 
     * Permet de sélectionner ou désélectionner un élève d'un clic sur sa carte.
     */
    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    /**
     * TOUT SÉLECTIONNER : 
     * Permet de cocher d'un coup tous les élèves qui apparaissent après un filtrage.
     */
    const handleSelectAll = (filteredIds: string[]) => {
        if (selectedStudentIds.length === filteredIds.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredIds);
        }
    };

    /**
     * ENREGISTREMENT DÉFINITIF : 
     * Envoie la liste des nouveaux inscrits au Cloud en une seule fois.
     */
    const handleSave = async () => {
        if (selectedStudentIds.length === 0) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non identifié");

            // VÉRIFICATION ANTI-DOUBLONS : 
            // On vérifie quels élèves sont déjà dans ce groupe (au cas où).
            const { data: existingRelations } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', groupId);

            const existingIds = existingRelations?.map((r: any) => r.eleve_id) || [];
            const newIds = selectedStudentIds.filter(id => !existingIds.includes(id));

            if (newIds.length > 0) {
                // Création massive des nouveaux liens d'appartenance.
                const insertRows = newIds.map(eleveId => ({
                    eleve_id: eleveId,
                    groupe_id: groupId,
                    user_id: user.id
                }));

                const { error } = await supabase.from('EleveGroupe').insert(insertRows);
                if (error) throw error;
            }

            // Fins de parcours : on rafraîchit l'affichage du groupe et on ferme la fenêtre.
            if (onAdded) onAdded();
            if (handleCloseModal) handleCloseModal();
        } catch (error: any) {
            alert('Erreur lors de l\'ajout : ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    /**
     * LOGIQUE DE FILTRAGE : 
     * Cette section calcule en temps réel la liste des élèves affichés à l'écran.
     * Elle combine la recherche par nom, le filtre par classe et exclut 
     * systématiquement les enfants déjà présents dans le groupe cible.
     */
    const filteredStudents = students.filter(student => {
        const matchesSearch =
            (student.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.prenom || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = selectedClasses.length === 0 || (student.classe_id && selectedClasses.includes(student.classe_id));
        const matchesNiveau = selectedNiveaux.length === 0 || (student.niveau_id && selectedNiveaux.includes(student.niveau_id));

        const studentGroupIds = student.EleveGroupe?.map(eg => eg.groupe_id) || [];
        const matchesGroup = selectedGroups.length === 0 || selectedGroups.some(gId => studentGroupIds.includes(gId));

        // RÈGLE D'OR : On ne montre pas un élève qui est déjà membre de ce groupe.
        const inCurrentGroup = studentGroupIds.includes(groupId);
        return matchesSearch && matchesClass && matchesNiveau && matchesGroup && !inCurrentGroup;
    }).sort((a, b) => {
        // Tri alphabétique personnalisable (par nom ou par prénom).
        if (sortBy === 'nom') return (a.nom || '').localeCompare(b.nom || '');
        return (a.prenom || '').localeCompare(b.prenom || '');
    });

    return {
        states: {
            students: filteredStudents, classes, groups, niveaux,
            loading, saving, searchQuery, selectedClasses,
            selectedGroups, selectedNiveaux, sortBy,
            showFilters, selectedStudentIds
        },
        actions: {
            setSearchQuery, setSelectedClasses, setSelectedGroups,
            setSelectedNiveaux, setSortBy, setShowFilters,
            handleToggleStudent, handleSelectAll, handleSave
        }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant veut ajouter des élèves à son groupe "Soutien Lecture". Il clique sur le bouton "+".
 * 2. La fenêtre surgit, le Hook `useAddStudentToGroupFlow` s'active :
 *    - Il charge tous les élèves de l'enseignant.
 *    - Il cache automatiquement ceux qui sont déjà inscrits en "Soutien Lecture".
 * 3. L'enseignant utilise les filtres :
 *    - Il tape "Ma" dans la recherche.
 *    - Il sélectionne la classe "CE1-Bleu".
 * 4. La liste affiche alors uniquement "Marc" et "Mathieu" (les deux élèves de CE1-Bleu correspondants).
 * 5. L'enseignant coche les deux noms.
 * 6. Il clique sur "Valider l'ajout (2 élèves)" :
 *    - Le Hook vérifie les doublons pour la sécurité.
 *    - Il crée les liens officiels dans le Cloud en une seule fois.
 * 7. La fenêtre se ferme et le groupe "Soutien Lecture" affiche maintenant ses deux nouveaux membres.
 */
