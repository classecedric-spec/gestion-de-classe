/**
 * Nom du module/fichier : useStudentsData.ts
 * 
 * Données en entrée : Un identifiant d'élève (ID) initial facultatif (pour ouvrir directement une fiche précise).
 * 
 * Données en sortie : 
 *   - students / filteredStudents : La liste brute et la liste filtrée des élèves (par nom, classe ou groupe).
 *   - selectedStudent : L'élève actuellement sélectionné par l'enseignant.
 *   - loading : Indicateur de chargement des données.
 *   - Filtres (searchQuery, filterClass, filterGroup) et leurs fonctions de modification.
 *   - États de fenêtres (modales) pour la création, l'édition ou la suppression.
 *   - Fonctions d'action (handleStudentSaved, handleEdit, handleDelete, etc.).
 * 
 * Objectif principal : Centraliser toute la logique de gestion des données des élèves sur l'écran principal. Ce Hook est le "cerveau" de la page Élèves : il orchestre le chargement initial, la recherche ultra-rapide (en temps réel), et les opérations de mise à jour. Il intègre une gestion intelligente du mode hors-ligne : les modifications sont appliquées visuellement instantanément (optimisme) et synchronisées avec le serveur dès que la connexion le permet.
 * 
 * Ce que ça affiche : Rien (fournisseur de données et de fonctions pour les composants visuels).
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
// @ts-ignore
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { Tables } from '../../../types/supabase';
import { studentService } from '../services/studentService';
import { toast } from 'sonner';

/**
 * Structure d'un élève enrichie avec ses relations (Sa classe, son niveau, ses groupes).
 */
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
    trust_trend?: 'up' | 'down' | 'stable' | null;
}

/**
 * Hook principal pour l'écran de gestion des élèves.
 */
export const useStudentsData = (initialStudentId: string | null = null) => {
    const queryClient = useQueryClient();
    const { isOnline, addToQueue } = useOfflineSync();

    // États locaux : Sélection, Recherche et Filtres
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterGroup, setFilterGroup] = useState('all');

    // États de contrôle des fenêtres surgissantes (Modales)
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<StudentDetailed | null>(null);

    // 0. Récupération de l'identité du professeur connecté (pour filtrer ses élèves)
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    /**
     * ÉTAPE 1 : RÉCUPÉRATION DES ÉLÈVES
     * On demande la liste complète des élèves du professeur titulaire. 
     * On utilise un système de cache (Query) pour que l'affichage soit instantané si on a déjà chargé les données.
     */
    const { data: students = [], isLoading: loading } = useQuery({
        queryKey: ['students', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const data = await studentService.getStudentsForTeacher(user.id);
            return (data as any) as StudentDetailed[];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Les données sont considérées comme "fraîches" pendant 5 minutes.
    });


    /**
     * ÉTAPE 2 : CALCUL DE L'ÉLÈVE SÉLECTIONNÉ
     * Détermine quel dossier d'élève afficher à droite. Par défaut, on affiche le premier de la liste.
     */
    const selectedStudent = useMemo(() => {
        if (!selectedStudentId && students.length > 0) return students[0];
        return students.find(s => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);
    }, [students, selectedStudentId]);

    // Synchronisation si l'identifiant change via un lien externe (URL)
    useEffect(() => {
        if (initialStudentId) {
            setSelectedStudentId(initialStudentId);
        }
    }, [initialStudentId]);

    /**
     * ÉTAPE 3 : MACHINE À SAUVEGARDER (MUTATION)
     * Gère tout le processus d'enregistrement (Création ou Modification).
     * S'occupe aussi de la mise en file d'attente si l'enseignant est hors-ligne.
     */
    const saveStudentMutation = useMutation({
        mutationFn: async ({ studentData, groupIds, isEdit, editId, photoBase64 }: {
            studentData: any,
            groupIds: string[],
            isEdit: boolean,
            editId: string | null,
            photoBase64: string | null
        }) => {
            const user = await getCurrentUser();
            if (!user) throw new Error("Utilisateur non authentifié.");

            // GESTION HORS-LIGNE : Si pas internet, on met l'action au "congélateur" (file d'attente).
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'Eleve',
                    method: isEdit ? 'update' : 'insert',
                    payload: { ...studentData, titulaire_id: user.id },
                    match: isEdit ? { id: editId } : undefined,
                    contextDescription: `${isEdit ? 'Mise à jour' : 'Création'} de l'élève ${studentData.prenom}`
                });
                return editId || 'offline-id';
            }

            // GESTION EN LIGNE : Envoi normal au serveur.
            return await studentService.saveStudent(
                studentData,
                groupIds,
                user.id,
                isEdit,
                editId,
                photoBase64
            );
        },
        onMutate: async (newStudent) => {
            /** 
             * OPTIMISME VISUEL : On met à jour l'écran IMMÉDIATEMENT avant même que le serveur ne réponde.
             * Cela donne une sensation de fluidité incroyable à l'utilisateur.
             */
            const queryKey = ['students', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousStudents = queryClient.getQueryData<StudentDetailed[]>(queryKey) || [];

            if (newStudent.isEdit && newStudent.editId) {
                queryClient.setQueryData<StudentDetailed[]>(queryKey,
                    previousStudents.map(s => s.id === newStudent.editId ? { ...s, ...newStudent.studentData } : s)
                );
            } else {
                // Pour une création, on invente un élève temporaire le temps que le serveur donne l'ID réel.
                const tempStudent = {
                    id: 'temp-' + Date.now(),
                    ...newStudent.studentData,
                    created_at: new Date().toISOString()
                } as StudentDetailed;

                queryClient.setQueryData<StudentDetailed[]>(queryKey, [tempStudent, ...previousStudents]);
                if (!selectedStudentId) setSelectedStudentId(tempStudent.id);
            }

            return { previousStudents, queryKey };
        },
        onError: (_err, _variables, context) => {
            // En cas d'erreur serveur, on fait machine arrière sur l'affichage pour rester cohérent.
            if (context?.previousStudents) {
                queryClient.setQueryData(context.queryKey, context.previousStudents);
            }
            toast.error("Échec de la sauvegarde. Vérifiez votre connexion.");
        },
        onSuccess: (data: any, variables) => {
            toast.success("Dossier élève mis à jour !");
            handleCloseModal();

            // Si c'était une création, on remplace le "tempID" par l'ID définitif renvoyé par Supabase.
            if (!variables.isEdit && data && typeof data === 'object' && data.id) {
                const queryKey = ['students', user?.id];
                queryClient.setQueryData<StudentDetailed[]>(queryKey, (old = []) =>
                    old.map(s => s.id.startsWith('temp-') ? { ...s, ...data } : s)
                );
                setSelectedStudentId(data.id);
            }
            // On force un rafraîchissement propre pour être sûr d'avoir les dernières données du serveur.
            queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
        }
    });

    /**
     * MUTATION POUR L'IMPORTANCE (Le niveau d'alerte pédagogique)
     */
    const updateImportanceMutation = useMutation({
        mutationFn: async ({ id, val, prenom }: { id: string; val: number | null, prenom?: string }) => {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL', table: 'Eleve', method: 'update',
                    payload: { importance_suivi: val }, match: { id },
                    contextDescription: `Changement importance pour ${prenom || 'élève'}`
                });
                return;
            }
            await studentService.updateStudentImportance(id, val);
        },
        onMutate: async ({ id, val }) => {
            const queryKey = ['students', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousStudents = queryClient.getQueryData<StudentDetailed[]>(queryKey);
            if (previousStudents) {
                queryClient.setQueryData<StudentDetailed[]>(queryKey,
                    previousStudents.map(s => s.id === id ? { ...s, importance_suivi: val } : s)
                );
            }
            return { previousStudents, queryKey };
        },
        onError: (err, _variables, context) => {
            if (context?.previousStudents && context.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousStudents);
            }
            toast.error("Impossible de modifier l'importance.");
        }
    });

    /**
     * MUTATION POUR LA SUPPRESSION DÉFINITIVE
     */
    const deleteMutation = useMutation({
        mutationFn: async (student: StudentDetailed) => {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL', table: 'Eleve', method: 'delete',
                    payload: {}, match: { id: student.id },
                    contextDescription: `Suppression de l'élève ${student.prenom}`
                });
                return;
            }
            await studentService.deleteStudent(student.id);
        },
        onMutate: async (student) => {
            const queryKey = ['students', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousStudents = queryClient.getQueryData<StudentDetailed[]>(queryKey);
            if (previousStudents) {
                queryClient.setQueryData<StudentDetailed[]>(queryKey,
                    previousStudents.filter(s => s.id !== student.id)
                );
            }
            return { previousStudents, queryKey };
        },
        onSuccess: () => {
            toast.success("Élève retiré de la base.");
            if (selectedStudentId === studentToDelete?.id) setSelectedStudentId(null);
            setStudentToDelete(null);
        }
    });

    // --- CALLBACKS : Fonctions simplifiées pour l'interface ---

    const handleUpdateImportance = useCallback((newVal: string) => {
        const val = newVal === '' ? null : parseInt(newVal, 10);
        if (selectedStudent) {
            updateImportanceMutation.mutate({ id: selectedStudent.id, val, prenom: selectedStudent.prenom });
        }
    }, [selectedStudent, updateImportanceMutation]);

    const handleStudentSaved = useCallback((studentData: any, groupIds: string[], photoBase64: string | null = null) => {
        saveStudentMutation.mutate({ studentData, groupIds, isEdit: isEditing, editId, photoBase64 });
    }, [saveStudentMutation, isEditing, editId]);

    const handleEdit = useCallback((student: StudentDetailed) => {
        setIsEditing(true);
        setEditId(student.id);
        setShowModal(true);
    }, []);

    const handleOpenCreate = useCallback(() => {
        setIsEditing(false);
        setEditId(null);
        setShowModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setIsEditing(false);
        setEditId(null);
    }, []);

    const handleDelete = useCallback(() => {
        if (studentToDelete) deleteMutation.mutate(studentToDelete);
    }, [studentToDelete, deleteMutation]);

    /**
     * FILTRAGE DYNAMIQUE (Mémoïsé)
     * C'est ici que la magie de la recherche opère. La liste se recalcule 
     * à chaque lettre tapée par l'enseignant ou à chaque changement de filtre.
     */
    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            // Recherche par Nom ou Prénom
            (s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.prenom.toLowerCase().includes(searchQuery.toLowerCase())) &&
            // Filtre par Classe
            (filterClass === 'all' || s.Classe?.nom === filterClass) &&
            // Filtre par Groupe
            (filterGroup === 'all' || s.EleveGroupe?.some(eg => eg.Groupe?.nom === filterGroup))
        );
    }, [students, searchQuery, filterClass, filterGroup]);

    /**
     * On renvoie toutes ces informations et fonctions aux composants de la page.
     */
    return {
        students,
        selectedStudent,
        setSelectedStudent: (s: StudentDetailed | null) => setSelectedStudentId(s?.id || null),
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
        fetchStudents: () => queryClient.invalidateQueries({ queryKey: ['students', user?.id] }),
        handleStudentSaved,
        handleUpdateImportance,
        handleEdit,
        handleOpenCreate,
        handleCloseModal,
        handleDelete
    };
};

export default useStudentsData;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant arrive sur l'onglet "Élèves".
 * 2. Le Hook `useStudentsData` s'active et demande au serveur (via le cache) la liste des enfants.
 * 3. L'enseignant tape "Lo" dans la barre de recherche.
 * 4. Le Hook recalcule `filteredStudents` en une fraction de seconde : il n'affiche plus que "Lola" et "Louis".
 * 5. L'enseignant clique sur "Louis" : le Hook met à jour `selectedStudent`, ce qui actualise sa photo et son suivi à droite.
 * 6. L'enseignant modifie la date de naissance de Louis et valide :
 *    - Le Hook met à jour l'écran immédiatement (Louis semble modifié tout de suite).
 *    - Il exauce le souhait du prof en contactant secrètement le serveur `studentService`.
 *    - Une fois que le serveur confirme, le Hook confirme avec une notification "Dossier élève mis à jour !".
 */
