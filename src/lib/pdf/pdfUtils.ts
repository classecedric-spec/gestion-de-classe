import { supabase } from '../database';

export interface PdfActivity {
    activiteId: string;
    name: string;
    order: number;
    etat: string;
    dateLimite?: string | null;
    material?: string;
    level?: string;
    planning?: {
        jour: string;  // 'Lundi' | 'Mardi' | ... 
        lieu: 'classe' | 'domicile';
        statut?: string;
    } | null;
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
 * 
 * LOGIC: RECORD-BASED (User Requirement)
 * We fetch ONLY existing 'Progression' records.
 * This ensures the child only sees what has been explicitly assigned/created.
 * (Now that Generation logic is fixed to create lines, this will show "To Do" items correctly).
 */
export const fetchStudentPdfData = async (studentId: string): Promise<PdfDataRaw | null> => {
    // 1. Fetch Progressions with Deep Relations
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
                Module (
                    id,
                    nom,
                    date_fin,
                    statut,
                    SousBranche:sous_branche_id (
                        id,
                        ordre,
                        Branche:branche_id (
                            id,
                            nom,
                            ordre
                        )
                    )
                )
            )
        `)
        .eq('eleve_id', studentId);

    if (progError) throw progError;

    if (!progressionData || progressionData.length === 0) return null;

    // 2. Filter & Map Data
    const validStates = ['a_commencer', 'en_cours', 'a_domicile'];
    const moduleMap: Record<string, PdfModule> = {};

    progressionData.forEach((p: any) => {
        // Filter by state
        if (!validStates.includes(p.etat)) return;

        // Filter by Module status (must be 'en_cours')
        const mod = p.Activite?.Module;
        if (!mod || mod.statut !== 'en_cours') return;

        // Initialize Module in Map if needed
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

        // Add Activity
        moduleMap[mod.id].activities.push({
            activiteId: p.Activite.id,
            name: p.Activite.titre,
            order: p.Activite.ordre || 0,
            etat: p.etat,
            dateLimite: p.date_limite || mod.date_fin,
            planning: null, // Sera rempli après
        });
    });

    // 2b. Charger la planification de la semaine en cours
    const today = new Date();
    const day = today.getDay();
    const mondayDiff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(mondayDiff);
    const weekStart = monday.toISOString().split('T')[0];

    const { data: planData } = await supabase
        .from('PlanificationHebdo')
        .select('activite_id, jour, lieu, statut')
        .eq('eleve_id', studentId)
        .eq('semaine_debut', weekStart);

    // Créer un map activite_id -> planning
    const planMap: Record<string, { jour: string; lieu: 'classe' | 'domicile'; statut?: string }> = {};
    if (planData) {
        planData.forEach((p: any) => {
            planMap[p.activite_id] = { jour: p.jour, lieu: p.lieu, statut: p.statut };
        });
    }

    // Appliquer la planification via activiteId direct
    Object.values(moduleMap).forEach(mod => {
        mod.activities.forEach(act => {
            if (planMap[act.activiteId]) {
                act.planning = planMap[act.activiteId];
            }
        });
    });

    // 3. Convert to Array and Sort
    const pdfModules = Object.values(moduleMap);

    // Sort modules (Same logic)
    pdfModules.sort((a, b) => {
        if (a.dueDate && b.dueDate) {
            const dateComparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (dateComparison !== 0) return dateComparison;
        } else if (a.dueDate) return -1;
        else if (b.dueDate) return 1;

        if (a.branchOrder !== b.branchOrder) return a.branchOrder - b.branchOrder;
        if (a.sbOrder !== b.sbOrder) return a.sbOrder - b.sbOrder;
        return a.title.localeCompare(b.title);
    });

    // Sort activities within modules
    pdfModules.forEach(m => {
        m.activities.sort((a, b) => a.order - b.order);
    });

    if (pdfModules.length === 0) return null;

    return { modules: pdfModules };
};
