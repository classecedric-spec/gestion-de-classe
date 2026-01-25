export const compareUrgentItems = (a: any, b: any) => {
    // 1. Date Fin (Closest deadlines first)
    // Handle both 'date_fin' directly on object (Module) or via nested '.Activite.Module.date_fin' (Progression)
    const getDate = (item: any) => {
        // If item is a Module (from useUrgentWork)
        if (item.date_fin !== undefined) return item.date_fin;
        // If item is a Progression (from useDashboardData)
        return item.Activite?.Module?.date_fin;
    };

    const dateAStr = getDate(a);
    const dateBStr = getDate(b);

    const dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
    const dateB = dateBStr ? new Date(dateBStr).getTime() : 0;

    // Treat 'no date' as far future? Or past? usually explicit dates come first/last depending on need.
    // In useUrgentWork: "if (!a.date_fin) return 1" (put at end).
    if (dateAStr !== dateBStr) {
        if (!dateAStr) return 1;
        if (!dateBStr) return -1;
        return dateA - dateB;
    }

    // Prepare objects for branch extraction
    const getModuleParts = (item: any) => {
        if (item.SousBranche) return item; // It's a Module
        return item.Activite?.Module; // It's a Progression
    };

    const modA = getModuleParts(a);
    const modB = getModuleParts(b);

    const branchA = modA?.SousBranche?.Branche;
    const branchB = modB?.SousBranche?.Branche;
    const subBranchA = modA?.SousBranche;
    const subBranchB = modB?.SousBranche;

    // 2. Branch (Ordre > Nom)
    if (branchA?.ordre !== branchB?.ordre) {
        return (branchA?.ordre ?? 999) - (branchB?.ordre ?? 999);
    }
    if ((branchA?.nom || '') !== (branchB?.nom || '')) {
        return (branchA?.nom || '').localeCompare(branchB?.nom || '');
    }

    // 3. SubBranch (Ordre > Nom)
    if (subBranchA?.ordre !== subBranchB?.ordre) {
        return (subBranchA?.ordre ?? 999) - (subBranchB?.ordre ?? 999);
    }
    if ((subBranchA?.nom || '') !== (subBranchB?.nom || '')) {
        return (subBranchA?.nom || '').localeCompare(subBranchB?.nom || '');
    }

    // 4. Module Name
    const titleA = modA?.nom || modA?.titre || '';
    const titleB = modB?.nom || modB?.titre || '';
    return titleA.localeCompare(titleB);
};
