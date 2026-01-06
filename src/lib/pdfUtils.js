import { supabase } from './supabaseClient';

/**
 * Fetches and processes PDF data for a single student.
 * This function is shared between individual PDF generation (Students.jsx)
 * and group PDF generation (Home.jsx) to ensure identical data.
 * 
 * @param {string} studentId - The student's UUID
 * @param {string|null} studentNiveauId - The student's level UUID (for filtering)
 * @returns {Promise<Object|null>} - PDF data object or null if no activities
 */
export const fetchStudentPdfData = async (studentId, studentNiveauId) => {
    // Query Progression with all related data
    const { data: progressionData, error: progError } = await supabase
        .from('Progression')
        .select(`
            id,
            etat,
            date_limite,
            Activite (
                id,
                titre,
                ordre,
                ActiviteNiveau ( niveau_id ),
                Module (
                    id,
                    nom,
                    date_fin,
                    statut,
                    branche_id,
                    SousBranche (
                        id,
                        ordre,
                        Branche ( id, nom, ordre )
                    )
                )
            )
        `)
        .eq('eleve_id', studentId);

    if (progError) throw progError;

    // Filter progressions
    const filteredProgressions = (progressionData || []).filter(p => {
        // Must have Activite and Module
        if (!p.Activite?.Module) return false;
        // Module must be 'en_cours'
        if (p.Activite.Module.statut !== 'en_cours') return false;
        // Exclude 'termine' state
        if (p.etat === 'termine') return false;
        // Filter by student level (ActiviteNiveau)
        if (studentNiveauId && p.Activite.ActiviteNiveau?.length > 0) {
            const hasMatchingLevel = p.Activite.ActiviteNiveau.some(
                an => an.niveau_id === studentNiveauId
            );
            if (!hasMatchingLevel) return false;
        }
        return true;
    });

    if (filteredProgressions.length === 0) return null;

    // Group by Module
    const moduleMap = {};
    filteredProgressions.forEach(p => {
        const mod = p.Activite.Module;
        if (!moduleMap[mod.id]) {
            moduleMap[mod.id] = {
                id: mod.id,
                title: mod.nom,
                dueDate: mod.date_fin,
                branchOrder: mod.SousBranche?.Branche?.ordre || 999,
                branchName: mod.SousBranche?.Branche?.nom || '',
                sbOrder: mod.SousBranche?.ordre || 999,
                activities: []
            };
        }
        moduleMap[mod.id].activities.push({
            name: p.Activite.titre,
            order: p.Activite.ordre || 0,
            etat: p.etat,
            dateLimite: p.date_limite
        });
    });

    // Convert to array and sort modules
    const sortedModules = Object.values(moduleMap).sort((a, b) => {
        // 1. Date Fin (earliest first)
        if (a.dueDate && b.dueDate) {
            if (a.dueDate !== b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (a.dueDate) return -1;
        else if (b.dueDate) return 1;

        // 2. Branch Order
        if (a.branchOrder !== b.branchOrder) return a.branchOrder - b.branchOrder;

        // 3. SubBranch Order
        if (a.sbOrder !== b.sbOrder) return a.sbOrder - b.sbOrder;

        // 4. Module Name
        return a.title.localeCompare(b.title);
    });

    // Sort activities within each module
    sortedModules.forEach(m => {
        m.activities.sort((a, b) => a.order - b.order);
    });

    if (sortedModules.length === 0) return null;

    return { modules: sortedModules };
};
