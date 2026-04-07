/**
 * Nom du module/fichier : useUrgentWork.ts
 * 
 * Données en entrée : 
 *   - `studentProgress` : La liste de tous les exercices de l'élève.
 * 
 * Données en sortie : 
 *   - `modules` : Liste des chapitres qui contiennent des exercices en retard.
 *   - `count` : Nombre total d'exercices qui auraient dû être finis.
 *   - `hasWork` : Un voyant (Vrai/Faux) qui indique s'il y a des urgences.
 * 
 * Objectif principal : Identifier les "Feux Rouges" de l'élève. Ce hook scanne la progression de l'enfant et cherche tout ce qui a dépassé la date limite fixée par l'enseignant. C'est ce qui alimente l'onglet "Urgent" sur la fiche de l'élève, permettant à l'adulte de voir immédiatement sur quoi l'enfant doit se concentrer en priorité pour rattraper son retard.
 * 
 * Ce que ça contient : 
 *   - La comparaison entre la date limite du module (date_fin) et l'heure actuelle.
 *   - Le filtrage : on ne garde que les modules "en cours" (on ne compte pas les archives).
 *   - L'exclusion des exercices déjà terminés ou en attente de validation (🟣).
 *   - Le tri intelligent des urgences (du plus ancien au plus récent) via un utilitaire de tri.
 */

import { useMemo } from 'react';
import { compareUrgentItems } from '../../../features/progression/utils/urgentSorting';

/**
 * Hook de détection des travaux urgents (dates dépassées).
 */
export const useUrgentWork = (studentProgress: any[]) => {
    return useMemo(() => {
        const now = new Date();
        const overdueModules: Record<string, any> = {};
        let totalOverdueCount = 0;

        // 1. ANALYSE : On parcourt chaque exercice de l'élève.
        studentProgress.forEach(p => {
            const module = p.Activite?.Module;

            /** 
             * CRITÈRES D'URGENCE : 
             * - L'exercice n'est pas fini (pas de ✅ ni de 🟣).
             * - Une date limite a été fixée.
             * - Cette date est passée (inférieure à "maintenant").
             * - Le module est marqué comme "En cours" par l'enseignant.
             */
            const isActivityInProgress = p.etat !== 'termine' && p.etat !== 'a_verifier';
            const hasDeadline = !!module?.date_fin;
            const isDeadlineReached = hasDeadline && new Date(module.date_fin!) < now;
            const isModuleActive = module?.statut === 'en_cours';

            // SI TOUS LES VOYANTS SONT AU ROUGE :
            if (isActivityInProgress && isDeadlineReached && isModuleActive) {
                const moduleId = p.Activite.Module.id;
                // On crée le chapitre s'il n'existe pas encore dans notre liste d'urgences.
                if (!overdueModules[moduleId]) {
                    overdueModules[moduleId] = {
                        ...module,
                        activities: []
                    };
                }
                // On ajoute l'exercice à ce chapitre.
                overdueModules[moduleId].activities.push(p);
                totalOverdueCount++;
            }
        });

        // 2. TRI : On classe les urgences par importance/date via un outil externe.
        const sortedModules = Object.values(overdueModules).sort(compareUrgentItems);

        return {
            modules: sortedModules,
            count: totalOverdueCount,
            hasWork: totalOverdueCount > 0
        };
    }, [studentProgress]);
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant a fixé la fin du chapitre "Division" au 15 Mars.
 * 2. DATE : Nous sommes le 17 Mars. 
 * 3. ANALYSE : Le hook `useUrgentWork` voit que pour Lucas, l'exercice "Division par 2" est toujours à l'état "À commencer".
 * 4. SIGNAL : Le hook calcule `hasWork = true` et `count = 1`.
 * 5. AFFICHAGE : Sur le dashboard, un petit badge rouge "1" apparaît sur l'onglet "Urgent" de Lucas.
 * 6. PÉDAGOGIE : L'enseignant voit l'alerte et propose à Lucas de terminer cette division avant de commencer une nouvelle leçon.
 */
