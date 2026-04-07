/**
 * Nom du module/fichier : useActivityTypes.ts
 * 
 * Données en entrée : 
 *   - Appels au service adultService.
 * 
 * Données en sortie : 
 *   - activityTypes : Liste des types d'actions.
 *   - loading : État de chargement.
 *   - Fonctions CRUD : createActivityType, updateActivityType, deleteActivityType.
 * 
 * Objectif principal : Ce hook gère la liste des "étiquettes" d'actions (Observation, Aide, etc.) utilisables pour le suivi. Une particularité importante : si la liste est vide à l'ouverture, il génère automatiquement un jeu de données par défaut ("seed") pour que l'utilisateur n'ait pas à tout créer de zéro.
 */

import { useState, useEffect, useCallback } from 'react';
import { adultService, ActivityType } from '../services/adultService';
import { toast } from 'sonner';

export const useActivityTypes = () => {
    // ÉTATS LOCAUX
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // CHARGEMENT ET GÉNÉRATION AUTOMATIQUE
    const fetchActivityTypes = useCallback(async () => {
        setLoading(true);
        try {
            let data = await adultService.fetchActivityTypes();
            if (data.length === 0) {
                // Si aucune action n'existe, on injecte les actions par défaut (Observation, Aide, etc.)
                const seeded = await adultService.seedDefaultActivityTypes();
                data = seeded || [];
            }
            setActivityTypes(data);
        } catch (error) {
            console.error("Error fetching activity types:", error);
            toast.error("Erreur lors du chargement des types d'actions");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActivityTypes();
    }, [fetchActivityTypes]);

    // CRÉATION D'UN NOUVEAU TYPE
    const createActivityType = async (label: string): Promise<boolean> => {
        try {
            const newType = await adultService.createActivityType(label);
            setActivityTypes(prev => [...prev, newType]);
            toast.success("Action ajoutée");
            return true;
        } catch (error) {
            console.error("Error creating activity type:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    // MISE À JOUR (Approche Optimiste)
    const updateActivityType = async (id: string, label: string): Promise<boolean> => {
        const previousTypes = [...activityTypes];

        // 1. Mise à jour visuelle immédiate
        setActivityTypes(prev => prev.map(t => t.id === id ? { ...t, nom: label } : t));

        try {
            const updatedType = await adultService.updateActivityType(id, label);
            // 2. Synchronisation avec la donnée réelle du serveur
            setActivityTypes(prev => prev.map(t => t.id === id ? updatedType : t));
            toast.success("Action mise à jour");
            return true;
        } catch (error) {
            console.error("Error updating activity type:", error);
            // 3. Rollback en cas d'erreur
            setActivityTypes(previousTypes);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    // SUPPRESSION (Approche Optimiste)
    const deleteActivityType = async (id: string): Promise<boolean> => {
        const previousTypes = [...activityTypes];

        // 1. Suppression visuelle immédiate
        setActivityTypes(prev => prev.filter(t => t.id !== id));

        try {
            await adultService.deleteActivityType(id);
            toast.success("Action supprimée");
            return true;
        } catch (error) {
            console.error("Error deleting activity type:", error);
            // 2. Restauration en cas d'échec
            setActivityTypes(previousTypes);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    return {
        activityTypes,
        loading,
        fetchActivityTypes,
        createActivityType,
        updateActivityType,
        deleteActivityType
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : Le hook vérifie si des types d'actions existent.
 * 2. AUTO-SEED : Si vide, il demande au service de créer les types standards.
 * 3. ÉDITION : Gère les ajouts, modifications et suppressions.
 * 4. FLUIDITÉ : Utilise les mises à jour optimistes pour que l'utilisateur n'ait pas de temps d'attente visuel.
 */
