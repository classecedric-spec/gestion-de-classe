/**
 * Nom du module/fichier : useActivities.ts
 * 
 * Données en entrée : Filtres (mots-clés, statut, module) et l'utilisateur connecté.
 * 
 * Données en sortie : Liste des activités filtrées, état de chargement et fonctions de gestion (rechercher, supprimer, rafraîchir).
 * 
 * Objectif principal : Agir comme le "gestionnaire d'affichage" de la liste des activités. Il s'occupe de récupérer les données depuis le serveur, de les garder en mémoire (cache) pour éviter de recharger inutilement, et d'appliquer les filtres de recherche en temps réel pour que l'enseignant trouve rapidement l'atelier souhaité.
 * 
 * Ce que ça affiche : Rien directement. Il fournit les données nécessaires aux écrans de liste des activités.
 */

import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityService, ActivityWithRelations } from '../services/activityService';
import { getCurrentUser } from '../../../lib/database';

interface AvailableModule {
    id: string;
    nom: string;
}

interface UseActivitiesReturn {
    activities: ActivityWithRelations[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: Dispatch<SetStateAction<string>>;
    statusFilter: string;
    setStatusFilter: Dispatch<SetStateAction<string>>;
    moduleFilter: string;
    setModuleFilter: Dispatch<SetStateAction<string>>;
    filteredActivities: ActivityWithRelations[];
    availableModules: AvailableModule[];
    fetchActivities: () => void;
    deleteActivity: (id: string) => void;
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>;
}

/**
 * Ce Hook centralise toute la logique de recherche et de filtrage pour les écrans de liste.
 */
export const useActivities = (): UseActivitiesReturn => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, en_preparation, en_cours, archive
    const [moduleFilter, setModuleFilter] = useState('all'); // all or module_id

    // 0. Récupération de l'utilisateur actuel pour sécuriser les données.
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Récupération des données : on utilise un système de 'cache' (React Query) 
    // qui garde les activités en mémoire pendant 5 minutes pour une navigation fluide.
    const { data: activities = [], isLoading: loading } = useQuery({
        queryKey: ['activities', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await activityService.fetchActivities();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // Logique de filtrage : calcule instantanément la liste des activités qui correspondent 
    // à la recherche du professeur (titre, module ou statut).
    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            const matchesSearch = a.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.Module?.nom && a.Module.nom.toLowerCase().includes(searchTerm.toLowerCase()));

            const moduleStatut = a.Module?.statut;
            const matchesStatus = statusFilter === 'all' ||
                (moduleStatut === statusFilter) ||
                (statusFilter === 'en_preparation' && !moduleStatut);

            const matchesModule = moduleFilter === 'all' || a.module_id === moduleFilter;

            return matchesSearch && matchesStatus && matchesModule;
        });
    }, [activities, searchTerm, statusFilter, moduleFilter]);

    // Extraction des modules : crée dynamiquement la liste des dossiers (modules) 
    // disponibles pour le menu déroulant de filtrage.
    const availableModules = useMemo(() => {
        const modulesMap = new Map<string, string>();
        activities.forEach(a => {
            if (!a.Module || !a.module_id) return;

            const moduleStatut = a.Module?.statut;
            const matchesStatus = statusFilter === 'all' ||
                (moduleStatut === statusFilter) ||
                (statusFilter === 'en_preparation' && !moduleStatut);

            if (matchesStatus && a.Module?.nom) {
                modulesMap.set(a.module_id, a.Module.nom);
            }
        });

        return Array.from(modulesMap.entries())
            .map(([id, nom]) => ({ id, nom }))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    }, [activities, statusFilter]);

    // Suppression optimiste : pour plus de réactivité, on retire l'activité de l'écran immédiatement, 
    // avant même que le serveur n'ait confirmé la suppression. En cas d'erreur, elle réapparaît automatiquement.
    const deleteMutation = useMutation({
        mutationFn: (id: string) => activityService.deleteActivity(id),
        onMutate: async (id) => {
            const queryKey = ['activities', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ActivityWithRelations[]>(queryKey);

            if (previous) {
                queryClient.setQueryData<ActivityWithRelations[]>(queryKey,
                    previous.filter(a => a.id !== id)
                );
            }
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            queryClient.invalidateQueries({ queryKey: ['activities', user?.id] });
        }
    });

    return {
        activities,
        loading,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        moduleFilter,
        setModuleFilter,
        filteredActivities,
        availableModules,
        fetchActivities: () => queryClient.invalidateQueries({ queryKey: ['activities', user?.id] }),
        deleteActivity: (id: string) => deleteMutation.mutate(id),
        setActivities: (action) => {
            queryClient.setQueryData<ActivityWithRelations[]>(['activities', user?.id], (old) => {
                const prev = old || [];
                return typeof action === 'function' ? (action as Function)(prev) : [action];
            });
        }
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant arrive sur la page des Activités.
 * 2. Le Hook `useActivities` vérifie si les données sont déjà en mémoire (cache).
 *    - Si non : il les télécharge depuis le serveur via `activityService`.
 * 3. L'enseignant tape un mot-clé ou sélectionne un module/statut.
 * 4. `filteredActivities` se met à jour en temps réel pour n'afficher que les résultats pertinents.
 * 5. Si l'enseignant supprime une activité :
 *    a. L'activité disparaît de l'écran immédiatement (effet visuel instantané).
 *    b. Une demande de suppression est envoyée au serveur en arrière-plan.
 *    c. Si le serveur confirme : la suppression est définitive.
 *    d. Si le serveur refuse (ex: erreur de connexion) : l'activité est restaurée sur l'écran.
 */
