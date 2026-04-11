import {
    Check,
    ShieldCheck,
    Play,
    AlertCircle
} from 'lucide-react';

/**
 * Get status display information
 */
export const getStatusInfo = (status: string) => {
    switch (status) {
        case 'termine':
            return { color: 'bg-success', text: 'Terminé', icon: Check };
        case 'a_verifier':
            return { color: 'bg-purple-accent', text: 'À vérifier', icon: ShieldCheck };
        case 'en_cours':
            return { color: 'bg-primary', text: 'En cours', icon: Play };
        case 'besoin_d_aide':
            return { color: 'bg-grey-medium', text: 'Aide', icon: AlertCircle };
        default:
            return { color: 'bg-white/10', text: 'À faire', icon: null };
    }
};

/**
 * Process modules - filter activities by level and calculate stats
 */
export const processModules = (modulesData: any[], levelId: string, progMap: Record<string, string>) => {
    const processedModules = modulesData.map((m: any) => {
        const validActivities = (m.Activite || []).filter((act: any) => {
            // 1. Level Check (Strict)
            const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
            const isLevelMatch = levelId ? (levels.length > 0 && levels.includes(levelId)) : levels.length > 0;
            if (!isLevelMatch) return false;

            // 2. Progression Existence Check (Strict - User Requirement)
            // If the activity is not in the progression map (no record created), hide it.
            // This enforces "Generation First" workflow.
            if (!progMap[act.id]) return false;

            return true;
        }).sort((a: any, b: any) => (a.ordre || 0) - (b.ordre || 0));

        const totalActivities = validActivities.length;
        const completedActivities = validActivities.filter((act: any) =>
            progMap[act.id] === 'termine' || progMap[act.id] === 'a_verifier'
        ).length;

        return {
            ...m,
            filteredActivities: validActivities,
            totalActivities,
            completedActivities,
            percent: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
        };
    }).filter((m: any) => m.totalActivities > 0);

    // Sort by branch then sub-branch
    processedModules.sort((a: any, b: any) => {
        const aB = a.SousBranche?.Branche?.nom || '';
        const bB = b.SousBranche?.Branche?.nom || '';
        if (aB !== bB) return aB.localeCompare(bB);
        const aSB = a.SousBranche?.nom || '';
        const bSB = b.SousBranche?.nom || '';
        return aSB.localeCompare(bSB);
    });

    return processedModules;
};
/**
 * calculateLuckyStatus
 * Core logic for the "Lucky Check" (auto-verification).
 * Determines if an activity marked as finished should be automatically validated (Green) 
 * or flagged for teacher review (Purple) based on trust indices.
 */
export const calculateLuckyStatus = (params: {
    studentId: string;
    branchId: string | null;
    studentName: string;
    activityTitle: string;
    studentGlobalIndex: number | null;
    manualIndices: Record<string, any>;
    defaultLuckyIndex: number;
}): { status: 'termine' | 'a_verifier'; trustApplied: number; source: string; roll: number } => {
    const { 
        studentId, branchId, studentName, activityTitle, 
        studentGlobalIndex, manualIndices, defaultLuckyIndex 
    } = params;

    // 1. Resolve Trust Index Priority
    const specificIdx = branchId ? manualIndices[studentId]?.[branchId] : null;
    const idx = specificIdx ?? studentGlobalIndex ?? defaultLuckyIndex ?? 50;
    
    // 2. Roll the dice
    const randomRoll = Math.random() * 100;
    const willVerify = randomRoll < idx;
    const finalStatus = willVerify ? 'a_verifier' : 'termine';

    // 3. Log details for transparency (matching the user's current pattern)
    const source = specificIdx !== null && specificIdx !== undefined 
        ? 'MATIÈRE' 
        : (studentGlobalIndex !== null && studentGlobalIndex !== undefined ? 'ÉLÈVE' : 'DÉFAUT');

    console.log(`[LuckyCheck] ${studentName} | Activité: ${activityTitle}`);
    console.log(`- Indice appliqué: ${idx}% (Source: ${source}) | Tirage: ${randomRoll.toFixed(2)}%`);
    console.log(`- Décision: ${willVerify ? 'À VÉRIFIER 🟣' : 'TERMINÉ 🟢'}`);

    return { 
        status: finalStatus, 
        trustApplied: idx, 
        source, 
        roll: randomRoll 
    };
};
