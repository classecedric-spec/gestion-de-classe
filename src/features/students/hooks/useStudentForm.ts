/**
 * Nom du module/fichier : useStudentForm.ts
 * 
 * Données en entrée : 
 *   - isEditing / editId : Indiquent si l'on est en train de modifier un élève existant ou d'en créer un nouveau.
 *   - onSaved : Fonction appelée lors de la validation finale pour enregistrer les données.
 *   - onClose : Fonction pour fermer la fenêtre du formulaire.
 * 
 * Données en sortie : 
 *   - student : L'objet contenant toutes les informations saisies par l'enseignant (Nom, Parents, Classe, etc.).
 *   - Listes de choix (classesList, groupsList, niveauxList) pour remplir les menus déroulants.
 *   - Fonctions de mise à jour (handleInputChange, handleToggleGroup, etc.).
 *   - États de chargement et contrôles des sous-fenêtres (pour créer une classe à la volée par exemple).
 * 
 * Objectif principal : Piloter toute la logique interne du formulaire de saisie des élèves. Il s'occupe de recueillir chaque lettre tapée, de pré-remplir les champs si on modifie un élève connu, et de préparer les données pour qu'elles soient prêtes à être envoyées au serveur. Il offre aussi la possibilité de créer "à la volée" une nouvelle classe ou un nouveau groupe sans quitter le formulaire de l'élève.
 * 
 * Ce que ça affiche : Rien (fournisseur de logique pour le composant visuel `StudentModal`).
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '../../../lib/database';
import { studentService } from '../services/studentService';
import { levelService } from '../../levels/services/levelService';
import { classService } from '../../classes/services/classService';
import { groupService } from '../../groups/services/groupService';
import { Tables, TablesInsert } from '../../../types/supabase';

/**
 * Structure de l'état local du formulaire (ce qui est affiché dans les champs).
 */
export interface StudentFormState {
    nom: string;
    prenom: string;
    date_naissance: string;
    classe_id: string;
    groupe_ids: string[];
    niveau_id: string;
    parent1_nom: string;
    parent1_prenom: string;
    parent1_email: string;
    parent2_nom: string;
    parent2_prenom: string;
    parent2_email: string;
    nom_parents: string;
    photo_base64: string;
    photo_url: string;
    sex: string;
}

export interface UseStudentFormProps {
    studentId?: string | null;
    isEditing: boolean;
    onClose: () => void;
    onSaved: (studentData: any, groupIds: string[], photoBase64: string | null) => void;
    editId: string | null;
}

/**
 * Hook gérant l'état et la logique du formulaire élève.
 */
export const useStudentForm = ({ isEditing, editId, onSaved, onClose }: UseStudentFormProps) => {
    // État initial vide pour un nouvel élève
    const initialStudentState: StudentFormState = {
        nom: '', prenom: '', date_naissance: '', classe_id: '',
        groupe_ids: [], niveau_id: '', parent1_nom: '', parent1_prenom: '',
        parent1_email: '', parent2_nom: '', parent2_prenom: '',
        parent2_email: '', nom_parents: '', photo_base64: '', photo_url: '', sex: ''
    };

    const [student, setStudent] = useState<StudentFormState>(initialStudentState);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('enfant');

    // Listes de données nécessaires pour les menus déroulants du formulaire
    const [classesList, setClassesList] = useState<Tables<'Classe'>[]>([]);
    const [groupsList, setGroupsList] = useState<Tables<'Groupe'>[]>([]);
    const [niveauxList, setNiveauxList] = useState<Tables<'Niveau'>[]>([]);

    // Contrôles pour ouvrir des fenêtres de création rapide (si la classe n'existe pas encore)
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [showAddNiveauModal, setShowAddNiveauModal] = useState(false);

    /**
     * INITIALISATION : Au chargement, on prépare les listes (classes, groupes) 
     * et on remplit les champs si on est en mode "Édition".
     */
    useEffect(() => {
        loadDependencies();
        if (isEditing && editId) {
            loadStudentData(editId);
        } else {
            setStudent(initialStudentState);
            setActiveTab('enfant');
        }
    }, [isEditing, editId]);

    /**
     * PRÉPARATION : Récupère toutes les options disponibles pour les menus déroulants.
     */
    const loadDependencies = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [classes, groups, niveaux] = await Promise.all([
                classService.getClasses(user.id),
                groupService.getGroups(user.id),
                levelService.fetchLevels(user.id)
            ]);
            setClassesList(classes);
            setGroupsList(groups);
            setNiveauxList(niveaux);
        } catch (err) {
            console.error("Erreur lors du chargement des options du formulaire:", err);
        }
    };

    /**
     * RÉCUPÉRATION : Si on modifie un élève, on va chercher son dossier complet en base de données.
     */
    const loadStudentData = async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const data = await studentService.getStudent(id, user.id);
            const groupIds = await studentService.getStudentGroupIds(id, user.id);

            if (data) {
                setStudent({
                    nom: data.nom || '',
                    prenom: data.prenom || '',
                    date_naissance: data.date_naissance || '',
                    classe_id: data.classe_id || '',
                    groupe_ids: groupIds,
                    niveau_id: data.niveau_id || '',
                    parent1_nom: data.parent1_nom || '',
                    parent1_prenom: data.parent1_prenom || '',
                    parent1_email: data.parent1_email || '',
                    parent2_nom: data.parent2_nom || '',
                    parent2_prenom: data.parent2_prenom || '',
                    parent2_email: data.parent2_email || '',
                    nom_parents: data.nom_parents || '',
                    photo_base64: '', // On repart d'une photo vide pour les nouveaux uploads
                    photo_url: data.photo_url || '',
                    sex: data.sex || ''
                });
            }
        } catch (err) {
            console.error("Erreur lors du chargement des données de l'élève:", err);
        }
    };

    /**
     * GESTIONNAIRES DE SAISIE : Mettent à jour la fiche "brouillon" dès que l'enseignant tape une information.
     */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setStudent(prev => ({ ...prev, [name]: value }));
    };

    const updateField = (name: keyof StudentFormState, value: string | string[]) => {
        setStudent(prev => ({ ...prev, [name]: value }));
    };

    // Cas particulier : si l'enseignant choisit "Créer nouveau" dans une liste, on ouvre la fenêtre correspondante.
    const handleClassChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'create_new') setShowAddClassModal(true);
        else setStudent(prev => ({ ...prev, classe_id: value }));
    };

    const handleNiveauChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'create_new') setShowAddNiveauModal(true);
        else setStudent(prev => ({ ...prev, niveau_id: value }));
    };

    /**
     * GESTIONNAIRE DE GROUPES (ÉTIQUETTES) : Permet de cocher/décocher 
     * un groupe de besoin pour l'élève en cours.
     */
    const handleToggleGroup = (groupId: string) => {
        setStudent(prev => {
            const currentIds = prev.groupe_ids || [];
            if (currentIds.includes(groupId)) {
                return { ...prev, groupe_ids: currentIds.filter(id => id !== groupId) };
            } else {
                return { ...prev, groupe_ids: [...currentIds, groupId] };
            }
        });
    };

    /**
     * RAPPELS DE CRÉATION RAPIDE : Si une classe ou un groupe est créé "à la volée", 
     * on met à jour notre liste locale et on sélectionne automatiquement le nouvel élément.
     */
    const handleClassAdded = (newClass?: Tables<'Classe'>) => {
        if (newClass) {
            setClassesList(prev => [...prev, newClass].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setStudent(prev => ({ ...prev, classe_id: newClass.id }));
        }
    };

    const handleGroupAdded = (newGroup: Tables<'Groupe'>) => {
        if (newGroup) {
            setGroupsList(prev => [...prev, newGroup].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setStudent(prev => {
                const currentIds = prev.groupe_ids || [];
                if (currentIds.includes(newGroup.id)) return prev;
                return { ...prev, groupe_ids: [...currentIds, newGroup.id] };
            });
        }
    };

    const handleNiveauAdded = (newNiveau: Tables<'Niveau'>) => {
        if (newNiveau) {
            setNiveauxList(prev => [...prev, newNiveau].sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
            setStudent(prev => ({ ...prev, niveau_id: newNiveau.id }));
        }
    };

    const handleLevelSubmit = async (levelData: TablesInsert<'Niveau'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non authentifié.");
            const newLevel = await levelService.createLevel(levelData, user.id);
            if (newLevel) {
                handleNiveauAdded(newLevel);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Erreur lors de la création rapide du niveau:", error);
            throw error;
        }
    };

    /**
     * VALIDATION ET ENVOI : Prépare l'objet final pour l'enregistrement 
     * et demande au système parent (useStudentsData) de lancer la sauvegarde.
     */
    const submitForm = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non connecté.");

            const studentData: TablesInsert<'Eleve'> = {
                nom: student.nom,
                prenom: student.prenom,
                date_naissance: student.date_naissance || null,
                classe_id: student.classe_id || null,
                niveau_id: student.niveau_id || null,
                parent1_nom: student.parent1_nom,
                parent1_prenom: student.parent1_prenom,
                parent1_email: student.parent1_email,
                parent2_nom: student.parent2_nom,
                parent2_prenom: student.parent2_prenom,
                parent2_email: student.parent2_email,
                nom_parents: student.nom_parents,
                photo_url: student.photo_url,
                sex: student.sex,
                titulaire_id: user.id
            } as any;

            // On délègue la sauvegarde réelle au Hook parent pour profiter de l'optimisme visuel et du mode offline.
            onSaved(studentData, student.groupe_ids, student.photo_base64 || null);
            onClose();
            return true;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue';
            console.error("Erreur lors de la validation du formulaire:", err);
            alert("Erreur de validation : " + errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        student, loading, activeTab, setActiveTab,
        classesList, groupsList, niveauxList,
        showAddClassModal, setShowAddClassModal,
        showAddGroupModal, setShowAddGroupModal,
        showAddNiveauModal, setShowAddNiveauModal,
        handleInputChange, updateField,
        handleClassChange, handleNiveauChange, handleToggleGroup,
        handleClassAdded, handleGroupAdded, handleNiveauAdded, handleLevelSubmit,
        submitForm
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le professeur clique sur "Modifier l'élève".
 * 2. Le Hook `useStudentForm` charge les informations de l'élève (ex: "Thomas") et les insère dans les champs.
 * 3. Il charge aussi toutes les classes de l'école (ex: CP-A, CP-B) pour le menu déroulant.
 * 4. L'enseignant change le nom du parent : le Hook met à jour l'état `student.parent1_nom` sur-le-champ.
 * 5. L'enseignant passe à l'onglet "Groupes" : le Hook change l'onglet visible (`activeTab`).
 * 6. Au clic sur "Enregistrer" :
 *    - Le Hook vérifie que le nom et le prénom de l'élève sont bien saisis.
 *    - Il transmet le paquet complet (Profil + Parents + Groupes + Photo) au système parent.
 *    - Il ferme la fenêtre une fois le signal envoyé.
 */
