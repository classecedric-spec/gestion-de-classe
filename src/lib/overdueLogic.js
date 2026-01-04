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

        // 1. Get all modules for this user
        const { data: allModules, error: modAllErr } = await supabase
            .from('Module')
            .select('id, nom, date_fin, user_id, statut')
            .eq('user_id', userId);

        if (modAllErr) {
            console.error('[Overdue Check] Error fetching modules:', modAllErr);
            return;
        }



        const overdueModules = (allModules || []).filter(m =>
            m.statut === 'en_cours' && m.date_fin && m.date_fin <= todayStr
        );

        if (overdueModules.length === 0) {
            return;
        }



        const moduleIds = overdueModules.map(m => m.id);

        const { data: activities, error: actError } = await supabase
            .from('Activite')
            .select('id, titre, ActiviteNiveau(niveau_id)')
            .in('module_id', moduleIds);

        if (actError) {
            console.error('[Overdue Check] Error fetching activities:', actError);
            return;
        }

        if (!activities || activities.length === 0) {
            return;
        }


        const activityIds = activities.map(a => a.id);

        // 3. Get all students belonging to the user
        const { data: students, error: stuError } = await supabase
            .from('Eleve')
            .select('id, prenom, nom, niveau_id')
            .eq('titulaire_id', userId);

        if (stuError) {
            console.error('[Overdue Check] Error fetching students:', stuError);
            return;
        }

        if (!students || students.length === 0) {
            return;
        }


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
                // Success updating
            }
        }

        // 6. Create missing progressions as 'a_domicile'
        const existingPairs = new Set(
            (existingProgressions || []).map(p => `${p.eleve_id}-${p.activite_id}`)
        );

        const missingProgs = [];
        for (const student of students) {
            for (const activity of activities) {
                // Strict Level Check
                const allowedLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];
                // If activity has no levels -> It's hidden/strict -> No homework
                // If student has no level -> Can't verify -> No homework
                // If student's level is not in allowed -> No homework
                if (!student.niveau_id || allowedLevels.length === 0 || !allowedLevels.includes(student.niveau_id)) {
                    continue;
                }

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
            const { error: insertError } = await supabase.from('Progression').upsert(missingProgs, { onConflict: 'eleve_id, activite_id', ignoreDuplicates: true });
            if (insertError) {
                if (insertError.code === '23514') {
                    console.error('[Overdue Check] DB CONSTRAINT ERROR: La valeur "a_domicile" n\'est pas autorisée dans la base de données. Veuillez mettre à jour la contrainte Progression_etat_check.');
                } else {
                    console.error('[Overdue Check] Error inserting progressions:', insertError);
                }
            }
        }
    } catch (err) {
        console.error('[Overdue Check] Unexpected error:', err);
    }
};
