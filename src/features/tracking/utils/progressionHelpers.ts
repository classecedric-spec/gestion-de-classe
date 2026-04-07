/**
 * Nom du module/fichier : progressionHelpers.ts
 * 
 * Objectif principal : Fournir des calculs mathématiques et logiques réutilisables pour le suivi. Il contient notamment l'algorithme qui calcule la taille des photos d'élèves dans la grille et la détection des retards (dates limites dépassées).
 */

import { normalizeStatus as normalize } from '../../../lib/helpers';

/** 
 * Interface décrivant le résultat du calcul de disposition.
 */
export interface ProgressionLayout {
    cols: number;           // Nombre de colonnes idéal
    bubbleSize: number;     // Taille des portraits en pixels
}

/**
 * calculateBubbleSize
 * C'est la "Calculatrice de Grille". Elle cherche la meilleure façon de ranger les élèves 
 * pour qu'ils soient le plus grand possible sans jamais déborder de l'écran.
 * 
 * @param {number} availableWidth - Largeur disponible sur l'écran
 * @param {number} availableHeight - Hauteur disponible sur l'écran
 * @param {number} count - Nombre d'élèves à afficher
 * @returns {ProgressionLayout} { cols, bubbleSize }
 */
export const calculateBubbleSize = (
    availableWidth: number,
    availableHeight: number,
    count: number
): ProgressionLayout => {
    // Cas de sécurité : si pas d'élève, taille par défaut.
    if (count <= 0) return { cols: 1, bubbleSize: 40 };

    let bestSize = 0;
    let bestCols = 1;

    // ALGORITHME : On teste toutes les combinaisons possibles (de 1 colonne à "N" colonnes).
    for (let c = 1; c <= count; c++) {
        const rows = Math.ceil(count / c);
        const gap = 8; // Espace entre les bulles

        // Calcul de la taille théorique en largeur et en hauteur.
        const sizeW = (availableWidth - (c - 1) * gap) / c;
        const sizeH = (availableHeight - (rows - 1) * gap) / rows;

        // On prend le plus petit des deux pour que ça rentre dans les deux sens.
        const size = Math.min(sizeW, sizeH);

        // Si cette combinaison donne des photos plus grandes que la précédente, on la garde.
        if (size > bestSize) {
            bestSize = size;
            bestCols = c;
        }
    }

    // LIMITES : Pas plus petit que 30px (trop petit pour le doigt) et pas plus grand que 120px (trop géant).
    const finalSize = Math.max(30, Math.min(bestSize, 120));

    return {
        cols: bestCols,
        bubbleSize: finalSize
    };
};

/**
 * Normalisation technique des statuts (homogénéisation des textes).
 */
export const normalizeStatus = normalize;

/**
 * isOverdue
 * Vérifie si le travail d'un élève est "En retard". 
 * Un exercice est considéré en retard si :
 * - Il n'est pas encore validé.
 * - Le module (chapitre) a une date de fin prévue.
 * - Cette date est déjà passée par rapport à aujourd'hui.
 * - Le module est toujours marqué comme "En cours" (pas archivé).
 * 
 * @param {object} progression - L'état de l'élève sur l'exercice
 * @param {Date} now - La date actuelle (pour comparaison)
 * @returns {boolean} Vrai si l'élève est en retard ("Feu rouge").
 */
export const isOverdue = (progression: any, now: Date): boolean => {
    const module = progression?.Activite?.Module;
    if (!module || !module.date_fin) return false;
    
    const isNotFinished = progression.etat !== 'termine';
    const deadlinePassed = new Date(module.date_fin) < now;
    const moduleActive = module.etat_module === 'en_cours';
    
    return isNotFinished && deadlinePassed && moduleActive;
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ENTRÉE : La grille reçoit 12 élèves et un espace de 500x500 pixels.
 * 2. CALCUL : `calculateBubbleSize` teste 3 colonnes de 4, 4 colonnes de 3, etc.
 * 3. CHOIX : Il détermine que 4 colonnes permet d'avoir des portraits de 115px.
 * 4. VÉRIFICATION : En parallèle, `isOverdue` scanne les exercices.
 * 5. ALERTE : Il voit que Lucas n'a pas fini "Grammaire" et que la limite était hier.
 * 6. SORTIE : Le système renvoie l'information de taille (115px) et l'alerte "Retard" pour Lucas.
 */
