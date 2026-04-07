/**
 * Nom du module/fichier : useActivityRequirements.ts
 * 
 * Données en entrée : L'activité sélectionnée et la fonction pour mettre à jour la liste globale des activités.
 * 
 * Données en sortie : Liste des exigences (critères de réussite) pour l'activité, et fonctions pour les modifier (changer le nombre d'exercices, basculer entre obligatoire/facultatif).
 * 
 * Objectif principal : Gérer l'affichage et la modification rapide des critères de succès d'un atelier. Ce Hook permet à l'enseignant d'ajuster les objectifs (nombre d'exercices à réussir) sans avoir à ouvrir le grand formulaire d'édition complet.
 * 
 * Ce que ça affiche : Rien directement. Il alimente les tableaux de réglages dans les détails d'une activité.
 */

import { useCallback, Dispatch, SetStateAction } from 'react';
import { activityService, ActivityWithRelations } from '../services/activityService';

/**
 * Structure simplifiée d'une exigence pour faciliter l'affichage dans les tableaux.
 */
export interface Requirement {
    id: string; // ID unique du réglage
    targetId: string; // ID de l'entité visée
    label: string; // Nom du niveau scolaire (ex: "Grande Section")
    nbExercises: number; // Nombre d'exercices à réussir
    nbErrors: number; // Nombre d'erreurs maximum autorisées
    status: string; // Statut (obligatoire ou facultatif)
    isBase: boolean; // Indique si c'est le réglage général ou une exception par niveau
    order?: number; // Ordre d'affichage des niveaux
}

interface UseActivityRequirementsReturn {
    requirements: Requirement[];
    updateRequirement: (req: Requirement, field: string, value: any) => Promise<void>;
    toggleStatus: (req: Requirement) => Promise<void>;
}

/**
 * Ce Hook simplifie la gestion des 'règles du jeu' (exigences) pour chaque atelier.
 */
export const useActivityRequirements = (
    selectedActivity: ActivityWithRelations | null,
    setActivities: Dispatch<SetStateAction<ActivityWithRelations[]>>
): UseActivityRequirementsReturn => {

    /**
     * Formatage pour l'écran : transforme les données brutes de la base de données 
     * en une liste d'objets simples et faciles à afficher sous forme de tableau.
     */
    const getRequirementsList = useCallback((): Requirement[] => {
        if (!selectedActivity) return [];

        // On récupère les réglages spécifiques définis pour chaque niveau scolaire
        const levelReqs: Requirement[] = (selectedActivity.ActiviteNiveau || [])
            .map(an => ({
                id: an.id,
                targetId: an.id,
                label: (an as any).Niveau?.nom || 'Niveau Inconnu',
                nbExercises: an.nombre_exercices || 0,
                nbErrors: an.nombre_erreurs || 0,
                status: an.statut_exigence || 'obligatoire',
                isBase: false,
                order: (an as any).Niveau?.ordre || 999
            }))
            .sort((a, b) => (a.order || 999) - (b.order || 999));

        return levelReqs;
    }, [selectedActivity]);

    /**
     * Mise à jour réactive : change une valeur (ex: le nombre d'erreurs permises) 
     * et met à jour l'écran immédiatement (effet optimiste) avant de sauvegarder en base de données.
     */
    const updateRequirement = async (req: Requirement, field: string, value: any) => {
        if (!selectedActivity) return;

        // Étape 1 : Mise à jour immédiate de l'affichage pour l'enseignant (sans attendre le serveur)
        setActivities(prevActivities => {
            return prevActivities.map(a => {
                if (a.id === selectedActivity.id) {
                    if (req.isBase) {
                        return { ...a, [field]: value };
                    } else {
                        // On cherche le bon niveau scolaire dans la liste et on change sa valeur
                        return {
                            ...a,
                            ActiviteNiveau: (a.ActiviteNiveau || []).map(an =>
                                an.id === req.id ? { ...an, [field]: value } : an
                            )
                        };
                    }
                }
                return a;
            });
        });

        // Étape 2 : Envoi de la modification vers la base de données via le service métier
        try {
            await activityService.updateRequirement(req.isBase, req.targetId || req.id, field, value);
        } catch (err) {
            console.error("Error updating requirement:", err);
            // NOTE: En cas d'erreur réelle, on pourrait recharger les données pour annuler visuellement le changement
        }
    };

    /**
     * Raccourci pratique : permet de passer un exercice de 'Obligatoire' à 'Facultatif' en un seul clic.
     */
    const toggleStatus = async (req: Requirement) => {
        const newStatus = req.status === 'obligatoire' ? 'facultatif' : 'obligatoire';
        await updateRequirement(req, 'statut_exigence', newStatus);
    };

    return {
        requirements: getRequirementsList(),
        updateRequirement,
        toggleStatus
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant consulte les détails d'un atelier.
 * 2. Le Hook extrait les réglages spécifiques (ex: GS -> 5 exercices, MS -> 3 exercices).
 * 3. L'enseignant modifie une valeur dans le tableau (ex: augmente le nombre d'exercices pour un niveau).
 * 4. Le Hook se met en action :
 *    a. Il met à jour l'écran de l'utilisateur instantanément.
 *    b. Il envoie l'ordre de modification permanent au serveur `activityService`.
 * 5. Si l'enseignant bascule le commutateur 'Obligatoire' :
 *    - Le statut change immédiatement pour 'Facultatif' et la base est mise à jour.
 */
