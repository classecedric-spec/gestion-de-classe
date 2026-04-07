/**
 * Nom du module/fichier : useGroupsAndStudents.ts
 * 
 * Données en entrée : 
 *   - L'historique de navigation (via `useLocation`) pour savoir si l'enseignant vient d'une fiche élève précise.
 *   - L'utilisateur connecté (pour charger ses préférences).
 * 
 * Données en sortie : 
 *   - La liste des classes (groupes) de l'enseignant.
 *   - L'élève actuellement sélectionné pour le suivi.
 *   - Les réglages de "confiance" et de "rotation" pour l'entraide.
 * 
 * Objectif principal : Gérer la "Population" du dashboard. Ce hook s'occupe de savoir quel groupe d'élèves doit être affiché à l'écran et quel enfant est au centre de l'attention. Il fait aussi le lien entre la page d'accueil (Home) et le dashboard de suivi : si on clique sur Lucas sur l'accueil, ce hook s'assure que le dashboard s'ouvre directement sur la fiche de Lucas.
 * 
 * Ce que ça contient : 
 *   - Le chargement des classes et des élèves depuis Supabase.
 *   - La mémorisation des préférences (ex: quel groupe était ouvert la dernière fois).
 *   - La logique de bouton "Retour" pour quitter la fiche d'un élève.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { useInAppMigration } from '../../../hooks/useInAppMigration';
import { Student, Group } from '../../attendance/services/attendanceService';
import { groupService } from '../../groups/services/groupService';
import { trackingService } from '../services/trackingService';
import { userService } from '../../users/services/userService';

/**
 * Hook de gestion des groupes et des élèves pour le tableau de bord.
 */
export function useGroupsAndStudents() {
    const location = useLocation();

    // ÉTATS : Les groupes (classes)
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showGroupSelector, setShowGroupSelector] = useState(false);

    // ÉTATS : Les élèves
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // ÉTATS : Préférences de l'adulte (indices de confiance, élèves déjà suivis)
    const [manualIndices, setManualIndices] = useState<Record<string, any>>({});
    const [rotationSkips, setRotationSkips] = useState<Record<string, any>>({});
    const [defaultLuckyCheckIndex, setDefaultLuckyCheckIndex] = useState<number>(50);

    // RÉFÉRENCE : Mémorise une sélection en attente (quand on vient de l'accueil)
    const pendingStudentSelection = useRef<string | null>(null);

    /** 
     * CHARGEMENT DES CLASSES :
     * On récupère la liste des groupes créés par l'enseignant.
     */
    const fetchGroups = async () => {
        await fetchWithCache(
            'groups',
            async () => {
                return await groupService.getGroups();
            },
            setGroups
        );
    };

    /** 
     * CHARGEMENT DES ÉLÈVES :
     * On récupère les prénoms, noms et photos des élèves du groupe choisi.
     */
    const fetchStudents = async (groupId: string) => {
        setLoadingStudents(true);
        try {
            await fetchWithCache(
                `students_pedago_${groupId}`,
                async () => {
                    const data = await trackingService.getStudentsForPedago(groupId);
                    return data || [];
                },
                (data) => setStudents(data as Student[]),
                (_err) => {
                    setStudents([]);
                }
            );
        } finally {
            setLoadingStudents(false);
        }
    };

    /** 
     * CHARGEMENT DES PRÉFÉRENCES :
     * On récupère les indices de confiance personnalisés de l'enseignant.
     */
    const loadManualIndices = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const value = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
        if (value) setManualIndices(value as Record<string, any>);
    };

    const loadRotationSkips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const value = await trackingService.loadUserPreference(user.id, 'suivi_rotation_skips');
        if (value) setRotationSkips(value as Record<string, any>);
    };

    const loadDefaultLuckyCheckIndex = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const value = await trackingService.loadUserPreference(user.id, 'default_lucky_check_index');
        if (value !== undefined && value !== null) setDefaultLuckyCheckIndex(Number(value));
    };

    /** 
     * NAVIGATION DEPUIS L'ACCUEIL : 
     * Si l'enseignant a cliqué sur un élève depuis la page d'accueil, 
     * on détecte son ID ici et on ouvre automatiquement sa fiche.
     */
    useEffect(() => {
        if (location.state?.eleve_id && groups.length > 0 && !selectedStudent) {
            const targetStudentId = location.state.eleve_id;

            // Si les élèves sont déjà chargés, on le trouve et on l'affiche.
            if (students.length > 0) {
                const found = students.find(s => s.id === targetStudentId);
                if (found) {
                    setSelectedStudent(found);
                    window.history.replaceState({}, document.title); // On nettoie l'URL
                    return;
                }
            }

            // Sinon, on cherche dans quel groupe il se trouve pour charger la bonne classe.
            const findStudentGroup = async () => {
                const { data } = await supabase
                    .from('EleveGroupe')
                    .select('groupe_id')
                    .eq('eleve_id', targetStudentId)
                    .single();

                if (data && data.groupe_id) {
                    const grp = groups.find(g => g.id === data.groupe_id);
                    if (grp) {
                        setSelectedGroupId(grp.id);
                        pendingStudentSelection.current = targetStudentId;
                    }
                }
            };
            findStudentGroup();
        }
    }, [location.state, groups, selectedStudent, students]);

    // Initialisation au montage du composant.
    useEffect(() => {
        fetchGroups();
        loadManualIndices();
        loadRotationSkips();
        loadDefaultLuckyCheckIndex();
    }, []);

    // Déclenché quand on change de classe.
    useEffect(() => {
        if (selectedGroupId) {
            fetchStudents(selectedGroupId);
            setSelectedStudent(null); 
        }
    }, [selectedGroupId]);

    // Migration technique des données locales (InAppMigration).
    useInAppMigration(students, 'Eleve', 'eleve');
    useInAppMigration(groups, 'Groupe', 'groupe');

    /** 
     * ACTIONS : Sélection d'un groupe et mémorisation.
     */
    const handleGroupSelect = async (groupId: string) => {
        setSelectedGroupId(groupId);
        setShowGroupSelector(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await userService.updateLastSelectedGroup(user.id, groupId);
        } catch (error) {
            console.error('Error saving selected group:', error);
        }
    };

    const handleBack = () => {
        setSelectedStudent(null);
    };

    return {
        states: {
            groups,
            selectedGroupId,
            showGroupSelector,
            students,
            selectedStudent,
            loadingStudents,
            manualIndices,
            rotationSkips,
            defaultLuckyCheckIndex
        },
        actions: {
            setSelectedGroupId,
            setShowGroupSelector,
            setSelectedStudent,
            setManualIndices,
            setRotationSkips,
            handleGroupSelect,
            handleBack
        }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : L'enseignant arrive sur le dashboard. Le hook charge les classes "CM1" et "CM2".
 * 2. PRÉFÉRENCE : Il détecte que la dernière fois, l'enseignant travaillait avec les "CM1". Il les sélectionne par défaut.
 * 3. ANALYSE : Le hook télécharge alors les photos et les noms des 20 élèves de CM1.
 * 4. ACTION : L'enseignant clique sur la photo de Julie.
 * 5. RÉACTION : `setSelectedStudent(Julie)` est activé. Toutes les autres parties de l'écran (historique, progrès) se mettent à jour pour Julie.
 * 6. RETOUR : L'enseignant clique sur la flèche retour. Le hook repasse `selectedStudent` à nulle, et on revient au trombinoscope de la classe.
 */
