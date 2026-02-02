import { Database } from '../../../types/supabase';

// Define types that are missing from the generated Supabase types or are nested
type ModuleBase = Database['public']['Tables']['Module']['Row'];
type ActiviteBase = Database['public']['Tables']['Activite']['Row'];

// Manually defining simple interfaces for missing types or nested structures
export interface Branche {
    id: string;
    nom: string;
    ordre: number | null;
}

export interface SousBranche {
    id: string;
    nom: string;
    branche_id: string | null;
    ordre: number | null;
    Branche?: Branche; // Nested relation
}

export interface Progression {
    etat: string;
}

export interface Activite extends ActiviteBase {
    Progression?: Progression[];
    ActiviteNiveau?: any[]; // Typing this strictly would require more generated types
    ActiviteMateriel?: any[];
}

// Module with all the nested relations we fetch
export interface ModuleWithRelations extends ModuleBase {
    SousBranche?: SousBranche;
    Activite?: Activite[];
    // Computed properties added by calculateModuleProgress
    totalProgressions?: number;
    completedProgressions?: number;
    percent?: number;
    // Allow index access for flexibility during migration if needed, though strictly typed is better
    [key: string]: any;
}

/**
 * Calculate module progress statistics
 */
export const calculateModuleProgress = (module: ModuleWithRelations): { totalProgressions: number, completedProgressions: number, percent: number } => {
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
export const filterModules = (
    modules: ModuleWithRelations[],
    searchTerm: string,
    statusFilter: string,
    branchFilter: string,
    subBranchFilter: string
): ModuleWithRelations[] => {
    return modules.filter(m => {
        const matchesSearch = (m.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.titre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.SousBranche?.nom && m.SousBranche.nom.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' ||
            (m.statut === statusFilter) ||
            (statusFilter === 'en_preparation' && !m.statut);

        const matchesBranch = branchFilter === 'all' ||
            String(m.SousBranche?.branche_id) === String(branchFilter);

        const matchesSubBranch = subBranchFilter === 'all' ||
            String(m.sous_branche_id) === String(subBranchFilter) ||
            String(m.SousBranche?.id) === String(subBranchFilter);

        const isFullyCompleted = (m.totalProgressions || 0) > 0 && m.completedProgressions === m.totalProgressions;

        return matchesSearch && matchesStatus && matchesBranch && matchesSubBranch && !isFullyCompleted;
    });
};

/**
 * Sort modules by date, branch order, sub-branch order, and name
 */
export const sortModules = (modules: ModuleWithRelations[]): ModuleWithRelations[] => {
    return [...modules].sort((a, b) => {
        // 1. Date de fin (closest first, nulls last)
        // Note: 'date_fin' might not be in the generated types yet if schema changed recently, using any
        const dateA = a['date_fin'];
        const dateB = b['date_fin'];

        if (dateA && dateB) {
            if (dateA !== dateB) {
                return new Date(dateA).getTime() - new Date(dateB).getTime();
            }
        } else if (dateA) {
            return -1; // a has date, b doesn't → a first
        } else if (dateB) {
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
        // fallback to 'titre' if 'nom' missing or vice versa
        const nameA = a.titre || a['nom'] || '';
        const nameB = b.titre || b['nom'] || '';
        return nameA.localeCompare(nameB);
    });
};

/**
 * Extract unique branches from modules
 */
export const extractBranches = (modules: ModuleWithRelations[]): { id: string, nom: string }[] => {
    const branchesMap = new Map<string, string>();
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
export const extractSubBranches = (modules: ModuleWithRelations[], branchFilter: string): { id: string, nom: string }[] => {
    const subBranchesMap = new Map<string, string>();
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
