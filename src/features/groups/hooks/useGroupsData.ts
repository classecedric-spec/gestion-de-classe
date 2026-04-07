/**
 * Nom du module/fichier : useGroupsData.ts
 * 
 * Données en entrée : 
 *   - L'identifiant de l'enseignant connecté (récupéré automatiquement via `user`).
 *   - Les saisies de texte dans la barre de recherche (`searchQuery`).
 * 
 * Données en sortie : 
 *   - `groups` / `filteredGroups` : Les listes complète et filtrée des groupes de l'enseignant.
 *   - `selectedGroup` : Le groupe actuellement mis en avant dans la vue détaillée.
 *   - `loading` : Indicateur visuel pour savoir si les données arrivent encore du serveur.
 *   - Fonctions d'action : Outils pour ajouter, supprimer ou réorganiser les groupes à la souris.
 * 
 * Objectif principal : Centraliser la "Mémoire Vive" et l'intelligence de synchronisation du module des groupes. Ce Hook est un chef d'orchestre : il télécharge les données, les garde en cache pour éviter les attentes inutiles, et gère les mises à jour "optimistes". Cela signifie qu'il modifie l'affichage instantanément (ex: suppression d'un groupe) avant même que le serveur n'ait confirmé l'action, offrant ainsi une application ultra-réactive.
 * 
 * Ce que ça affiche : Rien visuellement (fournisseur de données pour la page Groupes).
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import { Tables } from '../../../types/supabase';
import { groupService } from '../../../features/groups/services/groupService';
import { classService } from '../../../features/classes/services/classService';
import { getCurrentUser } from '../../../lib/database';

/**
 * Poste de commande central pour la gestion des données des groupes.
 */
export const useGroupsData = () => {
    // Le "cerveau" de la mise en cache (React Query)
    const queryClient = useQueryClient();

    // États locaux pour la navigation et la recherche
    const [selectedGroup, setSelectedGroup] = useState<Tables<'Groupe'> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    /** 
     * CHARGEMENT INITIAL : 
     * On récupère d'abord l'identité du professeur, puis ses groupes et ses classes.
     * Les données sont gardées 5 minutes en mémoire (staleTime) pour la vitesse.
     */
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    const { data: groups = [], isLoading: loading } = useQuery({
        queryKey: ['groups', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const data = await groupService.getGroups();
            return data || [];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const data = await classService.getClasses();
            return data || [];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    /**
     * AUTO-SÉLECTION : 
     * Au démarrage, on sélectionne automatiquement le premier groupe si rien n'est choisi.
     * On synchronise aussi la sélection si les données du groupe changent (ex: modification du nom).
     */
    useEffect(() => {
        if (!selectedGroup && groups.length > 0) {
            setSelectedGroup(groups[0]);
        } else if (selectedGroup) {
            const updated = groups.find(g => g.id === selectedGroup.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedGroup)) {
                setSelectedGroup(updated);
            }
        }
    }, [groups, selectedGroup]);

    /** 
     * ACTIONS : CRÉATION DE GROUPE
     * Utilise une stratégie "optimiste" : on affiche le nouveau groupe immédiatement 
     * avec un ID temporaire avant même que le serveur ne réponde.
     */
    const createGroupMutation = useMutation({
        mutationFn: (groupData: { nom: string; acronyme?: string; photo_url?: string; [key: string]: any }) => groupService.createGroup(groupData as any),
        onMutate: async (newGroupData) => {
            const queryKey = ['groups', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousGroups = queryClient.getQueryData<Tables<'Groupe'>[]>(queryKey) || [];

            // CRÉATION FANTÔME : On simule l'arrivée du groupe pour l'utilisateur.
            const tempGroup = {
                id: 'temp-' + Date.now(),
                ...newGroupData,
                created_at: new Date().toISOString()
            } as Tables<'Groupe'>;

            queryClient.setQueryData<Tables<'Groupe'>[]>(queryKey, [tempGroup, ...previousGroups]);
            setSelectedGroup(tempGroup);

            return { previousGroups, queryKey };
        },
        onError: (_err, _variables, context) => {
            // En cas d'erreur réseau, on fait un "retour arrière" (rollback).
            if (context?.previousGroups) {
                queryClient.setQueryData(context.queryKey, context.previousGroups);
            }
        },
        onSuccess: (data: any) => {
            // CONFIRMATION : On remplace le fantôme par le vrai groupe avec son ID définitif.
            if (data && data.id) {
                setSelectedGroup(data);
                queryClient.setQueryData<Tables<'Groupe'>[]>(['groups', user?.id], (old = []) =>
                    old.map(g => g.id.startsWith('temp-') ? { ...g, ...data } : g)
                );
            }
            queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
        }
    });

    /** 
     * ACTIONS : SUPPRESSION
     * Le groupe disparait de l'écran sans attendre, et la sélection bascule sur un voisin.
     */
    const deleteGroupMutation = useMutation({
        mutationFn: (groupId: string) => groupService.deleteGroup(groupId),
        onMutate: async (groupId) => {
            const queryKey = ['groups', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousGroups = queryClient.getQueryData<Tables<'Groupe'>[]>(queryKey) || [];

            queryClient.setQueryData<Tables<'Groupe'>[]>(queryKey,
                previousGroups.filter(g => g.id !== groupId)
            );

            // GESTION SÉLECTION : Si on supprime le groupe qu'on regardait, on en choisit un autre.
            if (selectedGroup?.id === groupId) {
                const remaining = previousGroups.filter(g => g.id !== groupId);
                setSelectedGroup(remaining.length > 0 ? remaining[0] : null);
            }

            return { previousGroups, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGroups) {
                queryClient.setQueryData(context.queryKey, context.previousGroups);
            }
            queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
        }
    });

    /** 
     * ACTIONS : RÉORGANISATION (DRAG & DROP)
     * Sauvegarde la nouvelle place de chaque groupe pour la retrouver à la prochaine connexion.
     */
    const updateOrderMutation = useMutation({
        mutationFn: async (newGroups: Tables<'Groupe'>[]) => {
            await Promise.all(newGroups.map((g, index) =>
                groupService.updateGroupOrder(g.id, index)
            ));
        },
        onMutate: async (newGroups) => {
            const queryKey = ['groups', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previousGroups = queryClient.getQueryData(queryKey);
            queryClient.setQueryData(queryKey, newGroups);
            return { previousGroups, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousGroups) queryClient.setQueryData(context.queryKey, context.previousGroups);
            queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
        }
    });

    /**
     * LOGIQUE DE GLISSER-DÉPOSER : 
     * Calcule le mouvement d'un groupe selon l'endroit où le prof l'a lâché.
     */
    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = groups.findIndex(g => g.id === active.id);
        const newIndex = groups.findIndex(g => g.id === over.id);

        const newGroups = arrayMove(groups, oldIndex, newIndex);
        updateOrderMutation.mutate(newGroups);
    }, [groups, updateOrderMutation]);

    const handleAddGroup = useCallback((groupData: { nom: string; acronyme?: string; photo_url?: string }) => {
        createGroupMutation.mutate(groupData as any);
    }, [createGroupMutation]);

    /**
     * FILTRAGE TEMPS RÉEL : 
     * Recalcule la liste affichée à chaque fois que le prof tape une lettre dans la recherche.
     */
    const filteredGroups = groups.filter(g =>
        g.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
        groups,
        selectedGroup,
        setSelectedGroup,
        classes,
        loading,
        searchQuery,
        setSearchQuery,
        filteredGroups,
        fetchGroups: () => queryClient.invalidateQueries({ queryKey: ['groups', user?.id] }),
        handleAddGroup,
        handleDeleteGroup: (id: string) => deleteGroupMutation.mutate(id),
        handleDragEnd,
        createGroupMutation 
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre l'écran "Gestion des Groupes".
 * 2. Le Hook `useGroupsData` s'éveille, identifie l'utilisateur via le Cloud.
 * 3. Une fois identifié, il télécharge ses 5 groupes (ex: Lecture, Calcul, Aide...).
 * 4. Il choisit d'afficher "Lecture" à droite par défaut.
 * 5. L'enseignant tape "Aid" dans la barre de recherche :
 *    - Le Hook filtre instantanément et ne laisse que le groupe "Aide".
 * 6. L'enseignant crée un nouveau groupe "Sport" :
 *    - Le Hook l'affiche en 1ère position tout de suite (illusion de vitesse).
 *    - Il contacte le serveur en tâche de fond pour l'enregistrement définitif.
 * 7. L'enseignant change l'ordre : il fait remonter "Sport" en tête de liste.
 *    - Le Hook recalcule les rangs (0, 1, 2...) et les enregistre pour la session suivante.
 */
