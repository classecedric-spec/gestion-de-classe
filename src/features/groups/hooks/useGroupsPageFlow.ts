/**
 * Nom du module/fichier : useGroupsPageFlow.ts
 * 
 * Données en entrée : 
 *   - Aucune directe au démarrage. Ce Hook se connecte à d'autres assistants spécialisés (données des groupes, liste des élèves, générateur PDF) pour regrouper toute l'intelligence de la page.
 * 
 * Données en sortie : 
 *   - `states` : Un catalogue complet de l'état de l'écran (quel groupe est sélectionné, quelle fenêtre popup est ouverte, quelles colonnes du tableau sont affichées).
 *   - `actions` : Une boîte à outils contenant toutes les fonctions pour réagir aux clics de l'enseignant (ajouter un élève, modifier un groupe, imprimer un PDF).
 * 
 * Objectif principal : Être la "Tour de Contrôle" de la page de gestion des groupes. Ce Hook orchestre les interactions complexes entre la liste de gauche, la vue détaillée de droite et les nombreuses fenêtres surgissantes (modales). Il s'occupe également de mémoriser les préférences de l'enseignant (ex: l'ordre des colonnes de son tableau de suivi) pour qu'il retrouve son environnement de travail intact à chaque connexion.
 * 
 * Ce que ça affiche : Rien (fournisseur de logique centralisée pour le composant GroupsPage).
 */

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { Tables } from '../../../types/supabase';
import { useGroupsData } from './useGroupsData';
import { useGroupStudents, StudentWithClass } from './useGroupStudents';
import { useGroupPdfGenerator } from '../../dashboard/hooks/useGroupPdfGenerator';
import { trackingService } from '../../tracking/services/trackingService';

/**
 * Cerveau central coordonnant l'intégralité de la page de gestion des groupes.
 */
export function useGroupsPageFlow() {
    // ÉTAT : Navigation interne (onglets : Liste des élèves, Tableau de suivi, Actions).
    const [activeTab, setActiveTab] = useState<'students' | 'actions' | 'tableau'>('students');

    // ÉTAT : Personnalisation du tableau (quelles colonnes le professeur a choisi d'afficher).
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['classe', 'importance_suivi']);
    const [eleveProfilCompetences, setEleveProfilCompetences] = useState<any>({});
    const [branches, setBranches] = useState<any[]>([]);

    // RÉGLAGE VISUEL : On utilise des références pour mesurer et aligner les entêtes de colonnes.
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    /** 
     * ÉTATS DES FENÊTRES POPUP (MODALES) : 
     * On gère ici l'ouverture et la fermeture de tous les formulaires surgissants du module.
     */
    const [showModal, setShowModal] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Tables<'Groupe'> | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<Tables<'Groupe'> | null>(null);

    const [showStudentModal, setShowStudentModal] = useState(false);
    const [isEditingStudent, setIsEditingStudent] = useState(false);
    const [editStudentId, setEditStudentId] = useState<string | null>(null);
    const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);

    const [showQRModal, setShowQRModal] = useState(false);
    const [qrInitialTab, setQrInitialTab] = useState<'encodage' | 'planification' | 'both'>('encodage');

    /** 
     * CONNEXION AUX ASSISTANTS SPÉCIALISÉS : 
     * On récupère la logique des données, des élèves et des impressions PDF.
     */
    const groupsData = useGroupsData();
    const groupStudentsData = useGroupStudents(groupsData.selectedGroup);
    const pdfGenerator = useGroupPdfGenerator();

    /** 
     * CHARGEMENT DES PRÉFÉRENCES : 
     * Dès l'ouverture, on va chercher dans le Cloud les réglages favoris de l'enseignant.
     */
    useEffect(() => {
        const loadPrefs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Quelles colonnes étaient affichées la dernière fois ?
                const prefs = await trackingService.loadUserPreference(user.id, 'group_tableau_visible_columns');
                if (prefs && Array.isArray(prefs)) {
                    setVisibleColumns(prefs.filter(c => c !== 'sex'));
                }

                // Quels sont les profils de compétences par matière des élèves ?
                const profile = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
                if (profile) setEleveProfilCompetences(profile);

                // Liste des matières pour construire les colonnes dynamiques.
                const { data: branchData } = await supabase.from('Branche').select('id, nom').order('ordre');
                if (branchData) setBranches(branchData || []);
            }
        };
        loadPrefs();
    }, []);

    /**
     * GESTION DU TABLEAU : 
     * Affiche ou masque une colonne et enregistre ce choix instantanément dans le Cloud.
     */
    const toggleColumn = useCallback(async (columnId: string) => {
        setVisibleColumns(prev => {
            const next = prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId];

            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    trackingService.saveUserPreference(user.id, 'group_tableau_visible_columns', next);
                }
            });

            return next;
        });
    }, []);

    const reorderColumns = useCallback(async (newOrder: string[]) => {
        setVisibleColumns(newOrder);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await trackingService.saveUserPreference(user.id, 'group_tableau_visible_columns', newOrder);
        }
    }, []);

    /**
     * MODIFICATION DIRECTE : 
     * Permet de changer une info élève ou une compétence matière directement dans le tableau.
     */
    const updateStudentField = useCallback(async (studentId: string, field: string, value: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Cas particulier : compétence par matière (sauvegardée dans les préférences prof).
            if (field.startsWith('branch_')) {
                const branchId = field.replace('branch_', '');
                const currentProfile = { ...eleveProfilCompetences };
                const studentData = currentProfile[studentId] || {};
                studentData[branchId] = value;
                currentProfile[studentId] = studentData;

                setEleveProfilCompetences(currentProfile);
                await trackingService.saveUserPreference(user.id, 'eleve_profil_competences', currentProfile);
                return;
            }

            // Cas général : modification directe d'un champ de la fiche élève.
            const { error } = await supabase
                .from('Eleve')
                .update({ [field]: value })
                .eq('id', studentId);

            if (error) throw error;
            groupStudentsData.fetchStudentsInGroup(groupsData.selectedGroup?.id || '');
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'élève:', error);
        }
    }, [eleveProfilCompetences, groupStudentsData, groupsData.selectedGroup]);

    /**
     * ALIGNEMENT VISUEL : 
     * Force les entêtes de gauche et de droite à avoir la même hauteur pour une ligne d'horizon parfaite.
     */
    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50); // Gestion des rendus différés
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [groupsData.groups.length, groupsData.selectedGroup, groupStudentsData.studentsInGroup.length]);

    // Raccourci clavier : Échap pour annuler une génération PDF trop longue.
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (pdfGenerator.isGenerating && e.key === 'Escape') pdfGenerator.cancelGeneration();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [pdfGenerator.isGenerating, pdfGenerator.cancelGeneration]);

    /** 
     * ACTIONS D'INTERFACE : 
     * Fonctions simples appelées par les boutons pour ouvrir/fermer les différentes fenêtres.
     */
    const handleAddClick = () => {
        setIsEditingGroup(false);
        setGroupToEdit(null);
        setShowModal(true);
    };

    const handleEditGroupClick = (e: React.MouseEvent, group: Tables<'Groupe'>) => {
        e.stopPropagation();
        setIsEditingGroup(true);
        setGroupToEdit(group);
        setShowModal(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, group: Tables<'Groupe'>) => {
        e.stopPropagation();
        setGroupToDelete(group);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        await groupsData.handleDeleteGroup(groupToDelete.id);
        setGroupToDelete(null);
    };

    const handleEditStudent = (student: StudentWithClass) => {
        setEditStudentId(student.id);
        setIsEditingStudent(true);
        setShowStudentModal(true);
    };

    const handleStudentSaved = () => {
        if (groupsData.selectedGroup) groupStudentsData.fetchStudentsInGroup(groupsData.selectedGroup.id);
        setShowStudentModal(false);
    };

    const handleCloseGroupModal = () => {
        setShowModal(false);
        setIsEditingGroup(false);
        setGroupToEdit(null);
    };

    return {
        states: {
            activeTab, headerHeight, leftContentRef, rightContentRef,
            showModal, isEditingGroup, groupToEdit, groupToDelete,
            showStudentModal, isEditingStudent, editStudentId,
            showAddToGroupModal, showQRModal, qrInitialTab,
            groupsData, groupStudentsData, pdfGenerator,
            visibleColumns, eleveProfilCompetences, branches
        },
        actions: {
            setActiveTab, setShowModal, setIsEditingGroup, setGroupToEdit,
            setGroupToDelete, setShowStudentModal, setIsEditingStudent,
            setEditStudentId, setShowAddToGroupModal, setShowQRModal,
            setQRInitialTab: setQrInitialTab, handleAddClick, handleEditGroupClick,
            handleDeleteClick, confirmDeleteGroup, handleEditStudent,
            handleStudentSaved, handleCloseGroupModal, toggleColumn,
            reorderColumns, updateStudentField
        }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre l'onglet "Groupes". Le Hook `useGroupsPageFlow` réinitialise l'affichage.
 * 2. Il charge les préférences de l'enseignant : "Quelles colonnes de suivi voulait-il voir la dernière fois ?".
 * 3. Il s'assure que les titres des colonnes de gauche et de droite sont alignés visuellement.
 * 4. L'enseignant clique sur "Créer un nouveau groupe" :
 *    - Le Hook ouvre la fenêtre surgissante (`showModal`).
 *    - Il prépare le formulaire en mode "Création".
 * 5. Si l'enseignant veut voir les points forts de ses élèves :
 *    - Il utilise le sélecteur de colonnes.
 *    - Le Hook ajoute les colonnes de compétences demandées et enregistre ce choix dans le Cloud.
 * 6. L'enseignant remarque une absence et veut modifier une fiche élève :
 *    - Il clique sur l'icône Éditer de l'élève.
 *    - Le Hook identifie l'élève et ouvre la modale de modification.
 * 7. En un mot : ce fichier gère tout le "voyage" de l'utilisateur sur la page de gestion des groupes.
 */
