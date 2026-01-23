import { normalizeStatus as normalize } from '../../../lib/helpers';

/**
 * calculateBubbleSize
 * Calculates optimal sizing for student bubbles in the grid
 * 
 * @param {number} availableWidth - Available width in px
 * @param {number} availableHeight - Available height in px
 * @param {number} count - Number of students
 * @returns {object} { cols, bubbleSize }
 */
export interface ProgressionLayout {
    cols: number;
    bubbleSize: number;
}

export const calculateBubbleSize = (
    availableWidth: number,
    availableHeight: number,
    count: number
): ProgressionLayout => {
    if (count <= 0) return { cols: 1, bubbleSize: 40 };

    // Goal: Find X columns such that rows = ceil(count/X)
    // And bubbleSize = min(availableWidth/X, availableHeight/rows)
    // We want to maximize bubbleSize.

    let bestSize = 0;
    let bestCols = 1;

    // Try various column counts from 1 to count
    for (let c = 1; c <= count; c++) {
        const rows = Math.ceil(count / c);
        const gap = 8;

        // Account for gaps
        const sizeW = (availableWidth - (c - 1) * gap) / c;
        const sizeH = (availableHeight - (rows - 1) * gap) / rows;

        const size = Math.min(sizeW, sizeH);

        if (size > bestSize) {
            bestSize = size;
            bestCols = c;
        }
    }

    // Clamp size logic
    const finalSize = Math.max(30, Math.min(bestSize, 120));

    return {
        cols: bestCols,
        bubbleSize: finalSize
    };
};

/**
 * Re-export normalizeStatus from statusHelpers
 */
export const normalizeStatus = normalize;

/**
 * Check if a progression is overdue
 * A progression is overdue if:
 * - It's not finished (etat !== 'termine')
 * - The module has a deadline (date_fin exists)
 * - The deadline has passed
 * - The module is active (etat_module === 'en_cours')
 * 
 * @param {object} progression - Progression object with Activite.Module
 * @param {Date} now - Current date
 * @returns {boolean} true if overdue
 */
export const isOverdue = (progression: any, now: Date): boolean => {
    const module = progression?.Activite?.Module;
    if (!module || !module.date_fin) return false;
    
    const isNotFinished = progression.etat !== 'termine';
    const deadlinePassed = new Date(module.date_fin) < now;
    const moduleActive = module.etat_module === 'en_cours';
    
    return isNotFinished && deadlinePassed && moduleActive;
};
