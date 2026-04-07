/**
 * Nom du module/fichier : useClasses.ts
 * 
 * Données en entrée : Aucune directe (utilise l'identité de l'utilisateur connecté et l'état global du cache React Query).
 * 
 * Données en sortie : 
 *   - Liste des classes filtrée par la recherche.
 *   - Liste des élèves de la classe actuellement sélectionnée.
 *   - États de chargement et de synchronisation (loading).
 *   - Fonctions d'action (sélectionner une classe, trier, supprimer, piloter les fenêtres modales).
 * 
 * Objectif principal : Centraliser toute la "vie" et la logique de l'écran de gestion des classes. Ce Hook gère le chargement des classes, la mémorisation de celle qui est active, le rafraîchissement automatique de la liste des élèves lors d'un changement, ainsi que toutes les interactions (ouverture des fenêtres de saisie, suppressions avec effet "instant" côté utilisateur).
 * 
 * Ce que ça affiche : Rien directement. Il alimente les composants de l'interface (ClassList, ClassDetails).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, ClassWithAdults, StudentWithRelations } from '../services/classService';
import { getCurrentUser } from '../../../lib/database';
import { getCachedPhoto, setCachedPhoto, isCacheEnabled } from '../../../lib/storage';

/**
 * État interne complet de l'écran des classes.
 */
export interface ClassesState {
    classes: ClassWithAdults[];
    loading: boolean;
    loadingStudents: boolean;
    selectedClass: ClassWithAdults | null;
    studentsInClass: StudentWithRelations[];
    searchQuery: string;
    viewMode: 'grid' | 'table';
    sortConfig: { key: string | null; direction: 'asc' | 'desc' };
    modals: {
        createEditClass: boolean;
        studentDetails: boolean;
        addStudentToClass: boolean;
        deleteConfirm: boolean;
    };
    activeItem: {
        classToEdit: ClassWithAdults | null;
        studentToEditId: string | null;
        classToDelete: ClassWithAdults | null;
    };
}

/**
 * Ce Hook est le chef d'orchestre de l'écran des classes.
 */
export const useClasses = () => {
    const queryClient = useQueryClient();
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // États pour le filtrage et le tri (Filters & Sort)
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    // États pour la visibilité des fenêtres modales (Modals visibility)
    const [modals, setModals] = useState({
        createEditClass: false,
        studentDetails: false,
        addStudentToClass: false,
        deleteConfirm: false
    });

    // États pour les objets en cours d'édition (Selection state for modals)
    const [activeItem, setActiveItem] = useState<{
        classToEdit: ClassWithAdults | null;
        studentToEditId: string | null;
        classToDelete: ClassWithAdults | null;
    }>({
        classToEdit: null,
        studentToEditId: null,
        classToDelete: null
    });

    /**
     * Identification : récupère l'utilisateur connecté pour filtrer les données.
     */
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity, // On ne change pas d'utilisateur en cours de route
    });

    /**
     * Récupération des classes : va chercher toutes les classes de l'enseignant 
     * et les garde en mémoire (cache) pour éviter les rechargements inutiles.
     */
    const { data: classes = [], isLoading: loading } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await classService.getClasses();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache valide 5 minutes
    });

    /**
     * Sélection intelligente : détermine quelle classe afficher. 
     * Par défaut, on prend la première de la liste si aucune n'est cliquée.
     */
    const selectedClass = useMemo(() => {
        if (!selectedClassId && classes.length > 0) return classes[0];
        return classes.find(c => c.id === selectedClassId) || (classes.length > 0 ? classes[0] : null);
    }, [classes, selectedClassId]);

    /**
     * Synchronisation automatique des élèves : dès qu'on change de classe sélectionnée, 
     * le Hook va chercher la liste des élèves correspondante automatique.
     */
    const { data: studentsInClass = [], isLoading: loadingStudents } = useQuery({
        queryKey: ['students-in-class', user?.id, selectedClass?.id],
        queryFn: async () => {
            if (!selectedClass || !user) return [];
            const data = await classService.getStudentsByClass(selectedClass.id);

            // Optimisation : on charge les photos depuis le cache local du navigateur si possible
            if (isCacheEnabled() && data) {
                return await Promise.all(
                    data.map(async (student) => {
                        if (student.photo_hash) {
                            const cachedPhoto = await getCachedPhoto(student.id, student.photo_hash);
                            if (cachedPhoto) return { ...student, photo_base64: cachedPhoto } as StudentWithRelations;
                            else if (student.photo_base64) {
                                await setCachedPhoto(student.id, student.photo_base64, student.photo_hash);
                            }
                        }
                        return student as StudentWithRelations;
                    })
                );
            }
            return (data as any) || [];
        },
        enabled: !!selectedClass && !!user,
        staleTime: 1000 * 60 * 5,
    });

    // Gardien de la sélection : maintient l'ID synchronisé
    useEffect(() => {
        if (selectedClass && selectedClass.id !== selectedClassId) {
            setSelectedClassId(selectedClass.id);
        }
    }, [selectedClass, selectedClassId]);

    // --- ACTIONS DE L'INTERFACE ---

    /**
     * Change la classe affichée à l'écran.
     */
    const handleSelectClass = (classe: ClassWithAdults) => {
        setSelectedClassId(classe.id);
    };

    /**
     * Organise la liste des élèves (tri par nom, prénom, etc.).
     */
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    /**
     * Ouvre ou ferme une fenêtre modale en précisant quel objet elle doit manipuler.
     */
    const toggleModal = (modalName: keyof typeof modals, isOpen: boolean, item: any = null) => {
        setModals(prev => ({ ...prev, [modalName]: isOpen }));

        if (item !== null) {
            if (modalName === 'createEditClass') {
                setActiveItem(prev => ({ ...prev, classToEdit: item }));
            } else if (modalName === 'studentDetails') {
                setActiveItem(prev => ({ ...prev, studentToEditId: item?.id }));
            } else if (modalName === 'deleteConfirm') {
                setActiveItem(prev => ({ ...prev, classToDelete: item }));
            }
        }
    };

    /**
     * Suppression réactive (Optimiste) : retire la classe visuellement de l'écran 
     * AVANT que le serveur réponde pour une sensation de rapidité absolue.
     */
    const deleteClassMutation = useMutation({
        mutationFn: (id: string) => classService.deleteClass(id),
        onMutate: async (id) => {
            const queryKey = ['classes', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousClasses = queryClient.getQueryData<ClassWithAdults[]>(queryKey) || [];

            // Retire immédiatement de la vue
            queryClient.setQueryData<ClassWithAdults[]>(queryKey,
                previousClasses.filter(c => c.id !== id)
            );

            // Si on a supprimé la classe qu'on regardait, on en sélectionne une autre
            if (selectedClassId === id) {
                const remaining = previousClasses.filter(c => c.id !== id);
                setSelectedClassId(remaining.length > 0 ? remaining[0].id : null);
            }

            return { previousClasses, queryKey };
        },
        onError: (_err, _variables, context) => {
            // En cas d'erreur réseau, on remet la classe
            if (context?.previousClasses) queryClient.setQueryData(context.queryKey, context.previousClasses);
            queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
        }
    });

    /**
     * Enregistre une nouvelle classe.
     */
    const addClassMutation = useMutation({
        mutationFn: (newClass: any) => classService.createClass(newClass),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
        }
    });

    /**
     * Retire un élève de la classe sélectionnée (remet sa classe à nul).
     */
    const removeStudentMutation = useMutation({
        mutationFn: (studentId: string) => classService.removeStudentFromClass(studentId),
        onMutate: async (studentId) => {
            const queryKey = ['students-in-class', user?.id, selectedClass?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<StudentWithRelations[]>(queryKey) || [];

            queryClient.setQueryData<StudentWithRelations[]>(queryKey,
                previous.filter(s => s.id !== studentId)
            );
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] });
        }
    });

    /**
     * Modifie un champ précis d'un élève.
     */
    const updateStudentMutation = useMutation({
        mutationFn: ({ studentId, field, value }: { studentId: string, field: string, value: any }) =>
            classService.updateStudentField(studentId, field as any, value),
        onMutate: async ({ studentId, field, value }) => {
            const queryKey = ['students-in-class', user?.id, selectedClass?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<StudentWithRelations[]>(queryKey) || [];

            queryClient.setQueryData<StudentWithRelations[]>(queryKey,
                previous.map(s => s.id === studentId ? { ...s, [field]: value } : s)
            );
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        }
    });

    const handleAddClass = useCallback((classData: any) => {
        addClassMutation.mutate(classData);
    }, [addClassMutation]);

    const handleUpdateClass = useCallback((_updatedClass: ClassWithAdults) => {
        queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
    }, [queryClient, user?.id]);

    const handleDeleteClass = async () => {
        const target = activeItem.classToDelete;
        if (!target) return;
        deleteClassMutation.mutate(target.id);
        toggleModal('deleteConfirm', false);
    };

    const handleAddStudent = useCallback((_newStudent: StudentWithRelations) => {
        queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] });
        queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
    }, [queryClient, selectedClass?.id, user?.id]);

    const handleRemoveStudent = async (studentId: string) => {
        removeStudentMutation.mutate(studentId);
    };

    const handleUpdateStudent = async (studentId: string, field: string, value: any) => {
        updateStudentMutation.mutate({ studentId, field, value });
    };

    // --- LOGIQUE DE CALCUL ET FILTRAGE ---

    /**
     * Filtrage instantané des classes selon la barre de recherche.
     */
    const filteredClasses = useMemo(() => {
        return classes.filter(c =>
            (c.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.acronyme || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [classes, searchQuery]);

    /**
     * Tri de la liste des élèves selon le choix de l'utilisateur.
     */
    const sortedStudents = useMemo(() => {
        if (!sortConfig.key) return studentsInClass;
        return [...studentsInClass].sort((a: any, b: any) => {
            if (a[sortConfig.key as string] < b[sortConfig.key as string]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key as string] > b[sortConfig.key as string]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [studentsInClass, sortConfig]);

    return {
        // Informations brutes
        classes,
        loading,
        loadingStudents,
        selectedClass,
        studentsInClass: sortedStudents,
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        sortConfig,

        // Informations calculées (Filtres)
        filteredClasses,

        // Actions disponibles pour l'interface
        handleSelectClass,
        handleSort,
        handleAddClass,
        handleUpdateClass,
        handleDeleteClass,
        handleAddStudent,
        handleRemoveStudent,
        handleUpdateStudent,
        refreshClasses: () => queryClient.invalidateQueries({ queryKey: ['classes', user?.id] }),
        refreshStudents: () => queryClient.invalidateQueries({ queryKey: ['students-in-class', user?.id, selectedClass?.id] }),

        // État des fenêtres et objets actifs
        modals,
        activeItem,
        toggleModal
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant arrive sur la page "Classes".
 * 2. Le Hook charge automatiquement la liste complète des dossiers de classes.
 * 3. Par défaut, il sélectionne la première classe et affiche ses élèves.
 * 4. L'enseignant effectue une recherche :
 *    - Tape "GS" -> La liste des classes sur le côté se réduit instantanément.
 * 5. L'enseignant change de classe :
 *    - Le Hook détecte le changement, efface l'ancienne liste d'élèves et charge les nouveaux.
 * 6. L'enseignant supprime une classe :
 *    - La classe disparaît de l'écran en 1 milliseconde (effet optimiste).
 *    - Le serveur valide la suppression en arrière-plan.
 */
