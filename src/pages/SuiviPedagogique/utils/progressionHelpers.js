/**
 * progressionHelpers.js
 * Pure utility functions for progression calculations
 */

/**
 * Calculate optimal bubble size for student grid
 * @param {number} containerWidth - Width of container
 * @param {number} containerHeight - Height of container  
 * @param {number} studentCount - Number of students
 * @returns {{ cols: number, rows: number, bubbleSize: number }}
 */
export function calculateBubbleSize(containerWidth, containerHeight, studentCount) {
    const gap = 8; // Slightly increased gap for better breathing room
    // Use full container dimensions minus padding
    const availableWidth = containerWidth;
    const availableHeight = containerHeight;
    const count = studentCount;

    if (count <= 0) return { cols: 1, rows: 1, bubbleSize: 30 };

    let bestConfig = { cols: 1, rows: count, bubbleSize: 0 };

    // Brute force all reasonable column counts to find max bubble size
    // We iterate from 1 up to count (or a reasonable max to avoid perf hits on huge numbers, though <100 is fine)
    for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);

        // Calculate theoretical max size based on width constraint
        // Width = cols * size + (cols - 1) * gap
        // size = (Width - (cols - 1) * gap) / cols
        const maxBubbleFromWidth = Math.floor((availableWidth - (cols - 1) * gap) / cols);

        // Calculate theoretical max size based on height constraint
        const maxBubbleFromHeight = Math.floor((availableHeight - (rows - 1) * gap) / rows);

        // The limiting factor is the smaller of the two dimensions
        const bubbleSize = Math.min(maxBubbleFromWidth, maxBubbleFromHeight);

        if (bubbleSize <= 0) continue;

        // If this configuration gives us larger bubbles, keep it
        if (bubbleSize > bestConfig.bubbleSize) {
            bestConfig = { cols, rows, bubbleSize };
        }
    }

    // Cap at 300px max (previously 100) to allow very large photos if few students
    // But ensure min is reasonable (e.g. 30px)
    const finalBubbleSize = Math.max(30, Math.min(bestConfig.bubbleSize, 300));

    return { ...bestConfig, bubbleSize: finalBubbleSize };
}

/**
 * Calculate module progress percentage
 * @param {object} module - Module with Activite array
 * @param {string} studentLevelId - Student's niveau_id
 * @param {object} progressions - Map of activite_id -> etat
 * @returns {number} Percentage (0-100)
 */
export function calculateModuleProgress(module, studentLevelId, progressions) {
    if (!studentLevelId || !module.Activite) return 0;

    const validActivities = module.Activite.filter(act => {
        const levels = act.ActiviteNiveau?.map(an => an.niveau_id) || [];
        return levels.length > 0 && levels.includes(studentLevelId);
    });

    if (validActivities.length === 0) return 0;

    const completedCount = validActivities.filter(act => {
        const status = progressions[act.id];
        return status === 'termine' || status === 'a_verifier';
    }).length;

    return Math.round((completedCount / validActivities.length) * 100);
}

/**
 * Check if module should be filtered out
 * @param {object} module - Module with completion stats
 * @param {boolean} showPendingOnly - Filter flag
 * @returns {boolean} Should show this module
 */
export function shouldShowModule(module, showPendingOnly) {
    if (module.totalActivities === 0) return false;

    if (showPendingOnly) {
        return module.completedActivities < module.totalActivities;
    }

    return true;
}

/**
 * Normalize progression status
 * @param {string} status - Raw status
 * @returns {string} Normalized status
 */
export function normalizeStatus(status) {
    const validStatuses = ['besoin_d_aide', 'a_verifier', 'termine', 'a_domicile', 'ajustement'];
    if (!status || !validStatuses.includes(status)) {
        return 'a_commencer';
    }
    return status;
}
