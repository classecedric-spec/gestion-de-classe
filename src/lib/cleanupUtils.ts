import { supabase } from './supabaseClient';
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
        const [progResponse, studentResponse, actLevelResponse] = await Promise.all([
            supabase.from('Progression').select('id, eleve_id, activite_id'),
            supabase.from('Eleve').select('id, niveau_id'),
            supabase.from('ActiviteNiveau').select('activite_id, niveau_id')
        ]);

        if (progResponse.error) throw progResponse.error;
        if (studentResponse.error) throw studentResponse.error;
        if (actLevelResponse.error) throw actLevelResponse.error;

        const progressions = progResponse.data || [];
        const students = studentResponse.data || [];
        const activityLevels = actLevelResponse.data || [];

        // 2. Build Lookup Maps
        const studentLevelMap = new Map<string, string | null>(); // studentId -> niveauId
        students.forEach(s => studentLevelMap.set(s.id, s.niveau_id));

        const activityAllowedLevelsMap = new Map<string, Set<string>>(); // activityId -> Set<niveauId>
        activityLevels.forEach(al => {
            if (!activityAllowedLevelsMap.has(al.activite_id)) {
                activityAllowedLevelsMap.set(al.activite_id, new Set<string>());
            }
            if (al.niveau_id) {
                activityAllowedLevelsMap.get(al.activite_id)?.add(al.niveau_id);
            }
        });

        // 3. Identify Orphans
        const idsToDelete: string[] = [];

        for (const prog of progressions) {
            const studentLevel = studentLevelMap.get(prog.eleve_id);
            const allowedLevels = activityAllowedLevelsMap.get(prog.activite_id);

            // Case 1: Student has no level or we don't know it
            if (!studentLevel) {
                continue;
            }

            // Case 2: Activity has NO allowed levels defined (means open to all OR strict hidden)
            if (!allowedLevels || allowedLevels.size === 0) {
                continue;
            }

            // Case 3: Activity has levels, but Student's level is not one of them.
            if (!allowedLevels.has(studentLevel)) {
                idsToDelete.push(prog.id);
            }
        }

        if (idsToDelete.length > 0) {
            const { error } = await supabase
                .from('Progression')
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            // Optional: Notify user if significant cleanup happened
            if (idsToDelete.length > 5) {
                toast.info(`Nettoyage: ${idsToDelete.length} suivis obsolètes supprimés.`);
            }
        }
    } catch (error) {
        console.error('Cleanup operation failed:', error);
    }
};
