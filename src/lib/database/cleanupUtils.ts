import { supabase } from '../database';
import { toast } from 'sonner';

/**
 * Checks for and deletes "orphan" progressions.
 * An orphan progression is a record in the 'Progression' table where:
 * The student (Eleve) has a 'niveau_id' that is NOT present in the 
 * 'ActiviteNiveau' list for the associated 'Activite'.
 *
 * This usually happens when an activity's target levels are changed
 * after some students have already started it.
 */
export const cleanupOrphanProgressions = async (): Promise<void> => {
    try {
        // 1. Fetch all needed data
        // Parallel fetch for speed
        const [progResponse, studentResponse, actResponse, moduleResponse, actLevelResponse] = await Promise.all([
            supabase.from('Progression').select('id, eleve_id, activite_id'),
            supabase.from('Eleve').select('id, niveau_id'),
            supabase.from('Activite').select('id, module_id'),
            supabase.from('Module').select('id'),
            supabase.from('ActiviteNiveau').select('activite_id, niveau_id')
        ]);

        if (progResponse.error) throw progResponse.error;
        if (studentResponse.error) throw studentResponse.error;
        if (actResponse.error) throw actResponse.error;
        if (moduleResponse.error) throw moduleResponse.error;
        if (actLevelResponse.error) throw actLevelResponse.error;

        const progressions = progResponse.data || [];
        const students = studentResponse.data || [];
        const activities = actResponse.data || [];
        const modules = moduleResponse.data || [];
        const activityLevels = actLevelResponse.data || [];

        // 2. Build Lookup Maps
        const studentMap = new Map<string, string | null>(); // studentId -> niveauId
        students.forEach(s => studentMap.set(s.id, s.niveau_id));

        const activityMap = new Map<string, string | null>(); // activityId -> module_id
        activities.forEach(a => activityMap.set(a.id, a.module_id));

        const moduleSet = new Set<string>(); // moduleId
        modules.forEach(m => moduleSet.add(m.id));

        const activityAllowedLevelsMap = new Map<string, Set<string>>(); // activityId -> Set<niveauId>
        activityLevels.forEach(al => {
            if (!activityAllowedLevelsMap.has(al.activite_id)) {
                activityAllowedLevelsMap.set(al.activite_id, new Set<string>());
            }
            if (al.niveau_id) {
                activityAllowedLevelsMap.get(al.activite_id)?.add(al.niveau_id);
            }
        });

        // 3. Identify Orphans to Delete
        const idsToDelete: string[] = [];

        for (const prog of progressions) {
            // Retrieve related data
            const studentExists = studentMap.has(prog.eleve_id);
            const studentLevel = studentMap.get(prog.eleve_id);

            const activityExists = activityMap.has(prog.activite_id);
            const activityModuleId = activityMap.get(prog.activite_id);

            const allowedLevels = activityAllowedLevelsMap.get(prog.activite_id);

            // --- Integrity Checks (Referential Integrity) ---

            // 1. Check if Student exists
            if (!studentExists) {
                idsToDelete.push(prog.id);
                continue;
            }

            // 2. Check if Activity exists
            if (!activityExists) {
                idsToDelete.push(prog.id);
                continue;
            }

            // 3. Check if Module exists (if linked)
            if (activityModuleId && !moduleSet.has(activityModuleId)) {
                idsToDelete.push(prog.id);
                continue;
            }

            // --- Logic Checks (Business Rules) ---

            // Case 1: Student has no level assigned (valid case, keep data)
            if (!studentLevel) {
                continue;
            }

            // Case 2: Activity has NO allowed levels defined (Open to all)
            if (!allowedLevels || allowedLevels.size === 0) {
                continue;
            }

            // Case 3: Activity has levels, but Student's level is not one of them.
            if (!allowedLevels.has(studentLevel)) {
                idsToDelete.push(prog.id);
            }
        }

        if (idsToDelete.length > 0) {
            // Batch deletions to avoid URL length limits (400 Bad Request)
            const BATCH_SIZE = 50;
            for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
                const batch = idsToDelete.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from('Progression')
                    .delete()
                    .in('id', batch);

                if (error) {
                    console.error(`Error deleting batch ${i / BATCH_SIZE + 1}:`, error);
                    // Continue with other batches even if one fails
                }
            }

            // Optional: Notify user if significant cleanup happened
            if (idsToDelete.length > 0) {
                console.log(`Nettoyage: ${idsToDelete.length} suivis obsolètes ou orphelins supprimés.`);
                if (idsToDelete.length > 5) {
                    toast.info(`Nettoyage: ${idsToDelete.length} suivis obsolètes supprimés.`);
                }
            }
        }
    } catch (error) {
        console.error('Cleanup operation failed:', error);
    }
};
