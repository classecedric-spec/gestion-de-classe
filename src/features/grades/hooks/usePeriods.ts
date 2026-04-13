/**
 * Nom du module/fichier : usePeriods.ts
 * 
 * Données en entrée : Les préférences sauvegardées par l'utilisateur (s'il en a).
 * 
 * Données en sortie : La liste triée des périodes ainsi que les actions pour les manipuler (ajouter, supprimer, modifier, réorganiser).
 * 
 * Objectif principal : Ce fichier récupère et gère le découpage de l'année scolaire (par exemple les trimestres). Il permet à l'application de savoir dans quelle période on se trouve et laisse à l'utilisateur la liberté de les personnaliser.
 * 
 * Ce que ça affiche : Ce code en lui-même n'affiche pas de visuel propre, mais il fournit le texte qui apparaîtra notamment dans les menus déroulants permettant de sélectionner une période à l'écran.
 */

import { useUserPreferences } from '../../../hooks/useUserPreferences';
import { useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { gradeService } from '../services';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Définit le moule d'une période (les informations qu'elle doit contenir pour exister).
export interface Period {
    id: string;
    label: string;
    ordre: number;
}

// Prépare un jeu de données par défaut de 3 trimestres pour un nouvel utilisateur ou si tout est effacé.
const DEFAULT_PERIODS: Period[] = [
    { id: 'trimestre_1', label: 'Trimestre 1', ordre: 0 },
    { id: 'trimestre_2', label: 'Trimestre 2', ordre: 1 },
    { id: 'trimestre_3', label: 'Trimestre 3', ordre: 2 },
];

// Définit l'étiquette secrète qui sert à retrouver notre liste sauvegardée dans le navigateur de l'utilisateur.
const PREFERENCE_KEY = 'grades_periods_v1';

// Outil central qui sera branché à l'interface pour lire et manipuler les périodes.
export function usePeriods() {
    // Demande au système de récupérer les préférences sauvegardées, ou d'utiliser le modèle par défaut si c'est vide.
    const [periods, setPeriods, loading] = useUserPreferences<Period[]>(PREFERENCE_KEY, DEFAULT_PERIODS);
    const { session } = useAuth();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    const invalidateGrades = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['evaluations'] });
        queryClient.invalidateQueries({ queryKey: ['all_evaluations_detailed'] });
        queryClient.invalidateQueries({ queryKey: ['context_results'] });
        queryClient.invalidateQueries({ queryKey: ['deleted_evaluations'] });
    }, [queryClient]);

    // Prépare la mécanique pour créer une nouvelle période lorsqu'un utilisateur clique sur le bouton "Ajouter".
    const addPeriod = useCallback(async (label: string) => {
        // Fabrique une nouvelle période unique en se basant sur la date du moment, et la place chronologiquement à la suite des autres.
        const newPeriod: Period = {
            id: `period_${Date.now()}`,
            label,
            ordre: periods.length
        };
        // Enregistre et sauvegarde la nouvelle liste enrichie de cette addition.
        await setPeriods([...periods, newPeriod]);
    }, [periods, setPeriods]);

    // Prépare la mécanique pour changer le texte d'une période existante (ex: renommer "Trimestre 1" en "Semestre 1").
    const updatePeriod = useCallback(async (id: string, label: string) => {
        if (!userId) return;
        
        const oldPeriod = periods.find(p => p.id === id);
        const oldLabel = oldPeriod?.label;

        // 1. Cascade update evaluations in database first
        if (oldLabel && oldLabel !== label) {
            try {
                await gradeService.updateEvaluationsPeriod(userId, oldLabel, label);
            } catch (err) {
                console.error("Failed to cascade period rename:", err);
                toast.error("Erreur lors de la mise à jour des évaluations");
                return;
            }
        }

        // 2. Update preference
        const updated = periods.map(p => p.id === id ? { ...p, label } : p);
        await setPeriods(updated);
        
        // 3. Refresh display
        invalidateGrades();
    }, [periods, setPeriods, userId, invalidateGrades]);

    // Prépare la mécanique pour détruire une période et la retirer définitivement de la liste.
    const deletePeriod = useCallback(async (id: string) => {
        if (!userId) return;

        const periodToDelete = periods.find(p => p.id === id);
        const oldLabel = periodToDelete?.label;

        // 1. Move evaluations to "Sans période"
        if (oldLabel) {
            try {
                await gradeService.updateEvaluationsPeriod(userId, oldLabel, "Sans période");
            } catch (err) {
                console.error("Failed to cascade period delete:", err);
                toast.error("Erreur lors du déplacement des évaluations");
                // We continue to delete the period from preferences anyway
            }
        }

        // 2. Remove from preferences
        const filtered = periods.filter(p => p.id !== id).map((p, i) => ({ ...p, ordre: i }));
        await setPeriods(filtered);

        // 3. Refresh display
        invalidateGrades();
    }, [periods, setPeriods, userId, invalidateGrades]);

    // Prépare la mécanique pour pouvoir déplacer manuellement les périodes et changer leur ordre (ex: monter ou descendre un élément de la liste).
    const reorderPeriods = useCallback(async (reordered: Period[]) => {
        // Enregistre chaque période en lui attribuant officiellement son nouveau numéro de position dans la nouvelle liste.
        await setPeriods(reordered.map((p, i) => ({ ...p, ordre: i })));
    }, [setPeriods]);

    // Organise rigoureusement les périodes de la première à la dernière pour garantir qu'elles s'afficheront dans le bon ordre logique.
    const sortedPeriods = [...periods].sort((a, b) => a.ordre - b.ordre);

    // Transforme nos périodes en options prêtes à être glissées dans les listes de choix déroulantes affichées à l'écran.
    const periodOptions = sortedPeriods.map(p => ({
        value: p.label,
        label: p.label
    }));

    // Fournit les résultats finaux avec toutes les actions pratiques (la fameuse boîte à outils) au reste de l'application qui l'a demandé.
    return {
        periods: sortedPeriods,
        periodOptions,
        loading,
        addPeriod,
        updatePeriod,
        deletePeriod,
        reorderPeriods
    };
}

/**
 * 1. Le module s'allume lorsque l'utilisateur se rend sur une page qui a besoin des périodes scolaires.
 * 2. Il interroge la mémoire internet (base de données/préférences) à la recherche d'une sauvegarde existante des périodes de cet utilisateur.
 * 3a. Si la sauvegarde est vierge, il prépare et conserve un réglage d'usine classique ("Trimestre 1, Trimestre 2, Trimestre 3").
 * 3b. S'il trouve une sauvegarde, il récupère l'organisation personnalisée telle que définie par l'utilisateur par le passé.
 * 4. Il passe un coup de tri : il regroupe les périodes par ordre de position logique (du 1er au dernier).
 * 5. Il clone cette liste triée et la moule dans un format très simple, compréhensible par les menus déroulants de la page visuelle.
 * 6. Il redonne la liste propre, prête à l'emploi, et l'ensemble des commandes d'action (mécanismes pour ajouter, modifier, supprimer ou réorganiser) à la page qui l'a appelé.
 * 7. Fin, l'utilisateur a face à lui ses données et peut maintenant interagir visuellement sur ses périodes en utilisant cette mécanique fournie.
 */
