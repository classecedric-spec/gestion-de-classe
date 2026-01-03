import { supabase } from './supabaseClient';

/**
 * Check for overdue activities and mark as 'a_domicile'
 * @param {string} userId - ID of the authenticated user
 */
export const checkOverdueActivities = async (userId) => {
    if (!userId) return;

    try {
        // Get local date in YYYY-MM-DD
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        console.log(`[Overdue Check] Starting check for ${todayStr} (User: ${userId})...`);

        // 1. Get all modules for this user
        const { data: allModules, error: modAllErr } = await supabase
            .from('Module')
            .select('id, nom, date_fin, user_id, statut')
            .eq('user_id', userId);

        if (modAllErr) {
            console.error('[Overdue Check] Error fetching modules:', modAllErr);
            return;
        }

        console.log(`[Overdue Check] Total modules found: ${allModules?.length || 0}`);

        const overdueModules = (allModules || []).filter(m =>
            m.statut === 'en_cours' && m.date_fin && m.date_fin <= todayStr
        );

        if (overdueModules.length === 0) {
            console.log('[Overdue Check] No overdue modules found (date_fin <= today).');
            return;
        }

        console.log(`[Overdue Check] Found ${overdueModules.length} overdue modules:`, overdueModules.map(m => `${m.nom} (${m.date_fin})`));

        const moduleIds = overdueModules.map(m => m.id);

        // 2. Get all activities from these modules
        const { data: activities, error: actError } = await supabase
            .from('Activite')
            .select('id, titre')
            .in('module_id', moduleIds);

        if (actError) {
            console.error('[Overdue Check] Error fetching activities:', actError);
            return;
        }

        if (!activities || activities.length === 0) {
            console.log('[Overdue Check] No activities found in these modules.');
            return;
        }

        console.log(`[Overdue Check] Found ${activities.length} activities to check.`);
        const activityIds = activities.map(a => a.id);

        // 3. Get all students belonging to the user
        const { data: students, error: stuError } = await supabase
            .from('Eleve')
            .select('id, prenom, nom')
            .eq('titulaire_id', userId);

        if (stuError) {
            console.error('[Overdue Check] Error fetching students:', stuError);
            return;
        }

        if (!students || students.length === 0) {
            console.log('[Overdue Check] No students found for this user (titulaire_id).');
            return;
        }

        console.log(`[Overdue Check] Found ${students.length} students to check.`);
        const studentIds = students.map(s => s.id);

        // 4. Get all existing progressions for these students/activities
        const { data: existingProgressions, error: progError } = await supabase
            .from('Progression')
            .select('id, eleve_id, activite_id, etat')
            .in('eleve_id', studentIds)
            .in('activite_id', activityIds);

        if (progError) {
            console.error('[Overdue Check] Error fetching progressions:', progError);
            return;
        }

        console.log(`[Overdue Check] Found ${existingProgressions?.length || 0} existing progression records.`);

        // 5. Update existing progressions to 'a_domicile' if they are NOT 'termine' and NOT already 'a_domicile'
        const progressionsToUpdate = (existingProgressions || []).filter(p =>
            p.etat !== 'termine' && p.etat !== 'a_domicile'
        );

        if (progressionsToUpdate.length > 0) {
            const idsToUpdate = progressionsToUpdate.map(p => p.id);
            const { error: updateError } = await supabase
                .from('Progression')
                .update({ etat: 'a_domicile' })
                .in('id', idsToUpdate);

            if (updateError) {
                if (updateError.code === '23514') {
                    console.error('[Overdue Check] DB CONSTRAINT ERROR: La valeur "a_domicile" n\'est pas autorisée dans la base de données. Veuillez mettre à jour la contrainte Progression_etat_check.');
                } else {
                    console.error('[Overdue Check] Error updating progressions:', updateError);
                }
            } else {
                console.log(`[Overdue Check] Updated ${idsToUpdate.length} existing records to 'a_domicile'`);
            }
        } else {
            console.log('[Overdue Check] No existing records to update.');
        }

        // 6. Create missing progressions as 'a_domicile'
        const existingPairs = new Set(
            (existingProgressions || []).map(p => `${p.eleve_id}-${p.activite_id}`)
        );

        const missingProgs = [];
        for (const student of students) {
            for (const activity of activities) {
                const key = `${student.id}-${activity.id}`;
                if (!existingPairs.has(key)) {
                    missingProgs.push({
                        eleve_id: student.id,
                        activite_id: activity.id,
                        etat: 'a_domicile',
                        user_id: userId,
                        is_suivi: false
                    });
                }
            }
        }

        if (missingProgs.length > 0) {
            console.log(`[Overdue Check] Creating ${missingProgs.length} new 'a_domicile' records...`);
            const { error: insertError } = await supabase.from('Progression').insert(missingProgs);
            if (insertError) {
                if (insertError.code === '23514') {
                    console.error('[Overdue Check] DB CONSTRAINT ERROR: La valeur "a_domicile" n\'est pas autorisée dans la base de données. Veuillez mettre à jour la contrainte Progression_etat_check.');
                } else {
                    console.error('[Overdue Check] Error inserting progressions:', insertError);
                }
            } else {
                console.log(`[Overdue Check] Created ${missingProgs.length} new 'a_domicile' records.`);
            }
        }
    } catch (err) {
        console.error('[Overdue Check] Unexpected error:', err);
    }
};
