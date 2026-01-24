import { useMemo } from 'react';

export const useUrgentWork = (studentProgress: any[]) => {
    return useMemo(() => {
        const now = new Date();
        const overdueModules: Record<string, any> = {};
        let totalOverdueCount = 0;

        studentProgress.forEach(p => {
            const module = p.Activite?.Module;

            // Check if overdue: not finished AND deadline passed AND module is 'en_cours'
            // Broadening filter: Exclude 'termine' and 'a_verifier'
            const isActivityInProgress = p.etat !== 'termine' && p.etat !== 'a_verifier';
            const hasDeadline = !!module?.date_fin;

            // Note: date_fin is typically YYYY-MM-DD 00:00:00. 
            // If date_fin is Today, new Date(today) < now (after 00:00) is TRUE.
            // So "Today or Before" is covered by < now.
            const isDeadlineReached = hasDeadline && new Date(module.date_fin!) < now;

            // USER REQUEST: Only modules "en cours" (exclude 'archive', 'preparation')
            const isModuleActive = module?.statut === 'en_cours';

            if (isActivityInProgress && isDeadlineReached && isModuleActive) {
                const moduleId = p.Activite.Module.id;
                if (!overdueModules[moduleId]) {
                    overdueModules[moduleId] = {
                        ...module,
                        activities: []
                    };
                }
                overdueModules[moduleId].activities.push(p);
                totalOverdueCount++;
            }
        });

        const sortedModules = Object.values(overdueModules).sort((a: any, b: any) => {
            // 1. Date Fin (Closest deadlines first)
            if (a.date_fin !== b.date_fin) {
                if (!a.date_fin) return 1;
                if (!b.date_fin) return -1;
                return a.date_fin.localeCompare(b.date_fin);
            }

            const branchA = a.SousBranche?.Branche;
            const branchB = b.SousBranche?.Branche;
            const subBranchA = a.SousBranche;
            const subBranchB = b.SousBranche;

            // 2. Branch (Ordre then Nom)
            if (branchA?.ordre !== branchB?.ordre) {
                return (branchA?.ordre ?? 999) - (branchB?.ordre ?? 999);
            }
            if (branchA?.nom !== branchB?.nom) {
                return (branchA?.nom || '').localeCompare(branchB?.nom || '');
            }

            // 3. SubDomain (Ordre then Nom)
            if (subBranchA?.ordre !== subBranchB?.ordre) {
                return (subBranchA?.ordre ?? 999) - (subBranchB?.ordre ?? 999);
            }
            if (subBranchA?.nom !== subBranchB?.nom) {
                return (subBranchA?.nom || '').localeCompare(subBranchB?.nom || '');
            }

            // 4. Module Name
            return a.nom.localeCompare(b.nom);
        });

        return {
            modules: sortedModules,
            count: totalOverdueCount,
            hasWork: totalOverdueCount > 0
        };
    }, [studentProgress]);
};
