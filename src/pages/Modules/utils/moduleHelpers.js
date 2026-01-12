/**
 * moduleHelpers.js
 * Pure utility functions for module calculations and filtering
 */

/**
 * Calculate module progress statistics
 */
export const calculateModuleProgress = (module) => {
    let totalProgressions = 0;
    let completedProgressions = 0;

    if (module.Activite && module.Activite.length > 0) {
        module.Activite.forEach(act => {
            if (act.Progression && act.Progression.length > 0) {
                totalProgressions += act.Progression.length;
                completedProgressions += act.Progression.filter(p => p.etat === 'termine').length;
            }
        });
    }

    return {
        totalProgressions,
        completedProgressions,
        percent: totalProgressions > 0 ? Math.round((completedProgressions / totalProgressions) * 100) : 0
    };
};

/**
 * Filter modules based on search and filter criteria
 */
export const filterModules = (modules, searchTerm, statusFilter, branchFilter, subBranchFilter) => {
    return modules.filter(m => {
        const matchesSearch = m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.SousBranche?.nom && m.SousBranche.nom.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' ||
            (m.statut === statusFilter) ||
            (statusFilter === 'en_preparation' && !m.statut);

        const matchesBranch = branchFilter === 'all' ||
            String(m.SousBranche?.branche_id) === String(branchFilter);

        const matchesSubBranch = subBranchFilter === 'all' ||
            String(m.sous_branche_id) === String(subBranchFilter) ||
            String(m.SousBranche?.id) === String(subBranchFilter);

        const isFullyCompleted = m.totalProgressions > 0 && m.completedProgressions === m.totalProgressions;

        return matchesSearch && matchesStatus && matchesBranch && matchesSubBranch && !isFullyCompleted;
    });
};

/**
 * Sort modules by date, branch order, sub-branch order, and name
 */
export const sortModules = (modules) => {
    return [...modules].sort((a, b) => {
        // 1. Date de fin (closest first, nulls last)
        if (a.date_fin && b.date_fin) {
            if (a.date_fin !== b.date_fin) {
                return new Date(a.date_fin) - new Date(b.date_fin);
            }
        } else if (a.date_fin) {
            return -1; // a has date, b doesn't → a first
        } else if (b.date_fin) {
            return 1; // b has date, a doesn't → b first
        }

        // 2. Branch order
        const aBranchOrder = a.SousBranche?.Branche?.ordre || 0;
        const bBranchOrder = b.SousBranche?.Branche?.ordre || 0;
        if (aBranchOrder !== bBranchOrder) {
            return aBranchOrder - bBranchOrder;
        }

        // 3. Sub-branch order
        const aSBOrder = a.SousBranche?.ordre || 0;
        const bSBOrder = b.SousBranche?.ordre || 0;
        if (aSBOrder !== bSBOrder) {
            return aSBOrder - bSBOrder;
        }

        // 4. Alphabetical by name
        return a.nom.localeCompare(b.nom);
    });
};

/**
 * Extract unique branches from modules
 */
export const extractBranches = (modules) => {
    const branchesMap = new Map();
    modules.forEach(m => {
        const b = m.SousBranche?.Branche;
        if (b) {
            branchesMap.set(String(b.id), b.nom);
        }
    });
    return Array.from(branchesMap.entries())
        .map(([id, nom]) => ({ id, nom }))
        .sort((a, b) => a.nom.localeCompare(b.nom));
};

/**
 * Extract unique sub-branches from modules (filtered by branch if specified)
 */
export const extractSubBranches = (modules, branchFilter) => {
    const subBranchesMap = new Map();
    modules.forEach(m => {
        const sb = m.SousBranche;
        if (sb && (branchFilter === 'all' || String(sb.branche_id) === String(branchFilter))) {
            subBranchesMap.set(String(sb.id), sb.nom);
        }
    });
    return Array.from(subBranchesMap.entries())
        .map(([id, nom]) => ({ id, nom }))
        .sort((a, b) => a.nom.localeCompare(b.nom));
};
