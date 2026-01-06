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
export const cleanupOrphanProgressions = async () => {
    try {
        // 1. Fetch all needed data
        // We need:
        // - Progressions (id, eleve_id, activite_id)
        // - Students (id, niveau_id)
        // - ActivityLevels (activite_id, niveau_id)

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
        const studentLevelMap = new Map(); // studentId -> niveauId
        students.forEach(s => studentLevelMap.set(s.id, s.niveau_id));

        const activityAllowedLevelsMap = new Map(); // activityId -> Set<niveauId>
        activityLevels.forEach(al => {
            if (!activityAllowedLevelsMap.has(al.activite_id)) {
                activityAllowedLevelsMap.set(al.activite_id, new Set());
            }
            activityAllowedLevelsMap.get(al.activite_id).add(al.niveau_id);
        });


        // 3. Identify Orphans
        const idsToDelete = [];
        let noStudentLevelCount = 0;
        let noActivityLevelCount = 0;
        let mismatchCount = 0;

        for (const prog of progressions) {
            const studentLevel = studentLevelMap.get(prog.eleve_id);
            const allowedLevels = activityAllowedLevelsMap.get(prog.activite_id);

            // Case 1: Student has no level
            if (!studentLevel) {
                noStudentLevelCount++;
                continue;
            }

            // Case 2: Activity has NO allowed levels defined (means open to all OR strict hidden)
            // We should NOT delete if activity has no restrictions (open to all)
            if (!allowedLevels || allowedLevels.size === 0) {
                // Skip - activity is open to all levels
                noActivityLevelCount++;
                continue;
            }

            // Case 3: Activity has levels, but Student's level is not one of them.
            if (!allowedLevels.has(studentLevel)) {
                idsToDelete.push(prog.id);
                mismatchCount++;
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


    } catch (error) { }
};
