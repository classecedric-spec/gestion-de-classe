import { supabase } from '../database';

export interface PdfActivity {
    name: string;
    order: number;
    etat: string;
    dateLimite?: string | null;
}

export interface PdfModule {
    id: string;
    title: string;
    dueDate?: string | null;
    branchOrder: number;
    branchName: string;
    sbOrder: number;
    activities: PdfActivity[];
}

export interface PdfDataRaw {
    modules: PdfModule[];
}

export interface PdfData extends PdfDataRaw {
    studentName: string;
    printDate: string;
}

/**
 * Fetches and processes PDF data for a single student.
 */
export const fetchStudentPdfData = async (studentId: string, studentNiveauId?: string | null): Promise<PdfDataRaw | null> => {
    // RÉCUPÉRATION DES DONNÉES
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

    // FILTRAGE STRICT
    const filteredProgressions = (progressionData || []).filter((p: any) => {
        // L'activité et son module doivent exister
        if (!p.Activite?.Module) return false;

        // STATUT TEMPOREL - Uniquement les modules "en_cours"
        if (p.Activite.Module.statut !== 'en_cours') return false;

        // États d'activité à afficher (To-Do List)
        const validStates = ['a_commencer', 'en_cours', 'a_domicile'];
        if (!validStates.includes(p.etat)) return false;

        // Filtrage par niveau (optionnel)
        if (studentNiveauId && p.Activite.ActiviteNiveau?.length > 0) {
            const hasMatchingLevel = p.Activite.ActiviteNiveau.some(
                (an: any) => an.niveau_id === studentNiveauId
            );
            if (!hasMatchingLevel) return false;
        }

        return true;
    });

    if (filteredProgressions.length === 0) return null;

    // REGROUPEMENT PAR MODULE
    const moduleMap: Record<string, PdfModule> = {};
    filteredProgressions.forEach((p: any) => {
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

    // TRI EN CASCADE
    const sortedModules = Object.values(moduleMap).sort((a, b) => {
        // PRIORITÉ 1 : Date de Fin du Module (plus ancien en premier)
        if (a.dueDate && b.dueDate) {
            const dateComparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (dateComparison !== 0) return dateComparison;
        } else if (a.dueDate) return -1;
        else if (b.dueDate) return 1;

        // PRIORITÉ 2 : Par Branche
        if (a.branchOrder !== b.branchOrder) {
            return a.branchOrder - b.branchOrder;
        }

        // PRIORITÉ 3 : Par Sous-Branche
        if (a.sbOrder !== b.sbOrder) {
            return a.sbOrder - b.sbOrder;
        }

        // PRIORITÉ 4 : Par Ordre Alphabétique
        return a.title.localeCompare(b.title);
    });

    // Tri des activités au sein de chaque module
    sortedModules.forEach(m => {
        m.activities.sort((a, b) => a.order - b.order);
    });

    if (sortedModules.length === 0) return null;

    return { modules: sortedModules };
};
