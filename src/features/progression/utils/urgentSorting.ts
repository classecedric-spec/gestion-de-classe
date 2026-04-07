/**
 * Nom du module/fichier : urgentSorting.ts
 * 
 * Données en entrée : 
 *   - Deux éléments à comparer (a et b). Ces éléments peuvent être des Modules ou des Progressions d'élèves.
 * 
 * Données en sortie : 
 *   - Un nombre (-1, 0, 1) indiquant lequel doit être affiché en premier.
 * 
 * Objectif principal : Classer les tâches urgentes pour l'enseignant. Le but est de mettre en haut de la liste ce qui finit bientôt (échéance proche). Si deux tâches finissent le même jour, on les classe par Branche (ex: français d'abord) puis par Sous-Branche et enfin par titre.
 * 
 * Ce que ça gère : 
 *   - Le tri par date de fin (Deadlines).
 *   - L'ordre des matières (Branches).
 *   - L'homogénéité de l'affichage entre le tableau de bord et le suivi détaillé.
 */

export const compareUrgentItems = (a: any, b: any) => {
    // 1. DATE DE FIN (Priorité absolue : les échéances les plus proches d'abord)
    const getDate = (item: any) => {
        // Le module a une date directement, la progression la récupère via l'activité
        if (item.date_fin !== undefined) return item.date_fin;
        return item.Activite?.Module?.date_fin;
    };

    const dateAStr = getDate(a);
    const dateBStr = getDate(b);

    const dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
    const dateB = dateBStr ? new Date(dateBStr).getTime() : 0;

    // Si les dates sont différentes, on les compare
    if (dateAStr !== dateBStr) {
        if (!dateAStr) return 1; // Pas de date ? On met à la fin
        if (!dateBStr) return -1;
        return dateA - dateB;
    }

    // 2. BRANCHE (Si les dates sont identiques, on trie par matière : Français, Math...)
    const getModuleParts = (item: any) => {
        if (item.SousBranche) return item; 
        return item.Activite?.Module; 
    };

    const modA = getModuleParts(a);
    const modB = getModuleParts(b);

    const branchA = modA?.SousBranche?.Branche;
    const branchB = modB?.SousBranche?.Branche;
    const subBranchA = modA?.SousBranche;
    const subBranchB = modB?.SousBranche;

    if (branchA?.ordre !== branchB?.ordre) {
        return (branchA?.ordre ?? 999) - (branchB?.ordre ?? 999);
    }
    if ((branchA?.nom || '') !== (branchB?.nom || '')) {
        return (branchA?.nom || '').localeCompare(branchB?.nom || '');
    }

    // 3. SOUS-BRANCHE (Si même branche, tri par sous-matière : Lecture, Calcul...)
    if (subBranchA?.ordre !== subBranchB?.ordre) {
        return (subBranchA?.ordre ?? 999) - (subBranchB?.ordre ?? 999);
    }
    if ((subBranchA?.nom || '') !== (subBranchB?.nom || '')) {
        return (subBranchA?.nom || '').localeCompare(subBranchB?.nom || '');
    }

    // 4. NOM DU MODULE (Dernier recours : ordre alphabétique)
    const titleA = modA?.nom || modA?.titre || '';
    const titleB = modB?.nom || modB?.titre || '';
    return titleA.localeCompare(titleB);
};

/**
 * LOGIGRAMME DE TRI :
 * 
 * 1. ENTRÉE -> Je reçois "Module Lecture" (Finit demain) et "Module Calcul" (Finit aujourd'hui).
 * 2. ÉTAPE 1 (Dates) -> Calcul finit avant Lecture. Calcul gagne et passe devant.
 * 3. ÉTAPE 2 (Égalité) -> Si les deux finissent aujourd'hui :
 *    - On regarde l'ordre des Branches.
 *    - Si "Français" a l'ordre 1 et "Maths" l'ordre 2, le Français passe devant.
 * 4. SORTIE -> L'enseignant voit sa liste triée par urgence réelle puis par logique de matière.
 */
