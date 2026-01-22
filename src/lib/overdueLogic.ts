import { supabase } from './supabaseClient';

/**
 * Check for overdue activities and mark as 'a_domicile'
 * @param {string} userId - ID of the authenticated user
 */
export const checkOverdueActivities = async (userId: string | undefined): Promise<void> => {
    if (!userId) return;

    try {
        // Get local date in YYYY-MM-DD
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // 0. Safety Check: Backfill missing due dates
        await fixMissingDueDates(userId);

        // Simplified Logic: 
        // 1. Find all progressions that are 'a_commencer' AND have a date_limite <= today
        // 2. Update them to 'a_domicile'

        const { error: updateError } = await supabase
            .from('Progression')
            .update({ etat: 'a_domicile' })
            .eq('etat', 'a_commencer') // Only target 'To Start'
            .lte('date_limite', todayStr); // Where Due Date is passed or today

        if (updateError) {
            console.error('Error updating overdue activities:', updateError);
        }
    } catch (err) {
        console.error('Unexpected error in checkOverdueActivities:', err);
    }
};

/**
 * Backfill missing 'date_limite' for existing progressions.
 * It looks for progressions with NULL date_limite and updates them
 * with the 'date_fin' of their corresponding module.
 */
const fixMissingDueDates = async (userId: string): Promise<void> => {
    try {
        // 1. Fetch all Modules that have a date_fin
        const { data: modules, error: modError } = await supabase
            .from('Module')
            .select('id, date_fin, Activite(id)')
            .eq('user_id', userId)
            .not('date_fin', 'is', null);

        if (modError || !modules) return;

        // 2. Iterate and Update
        for (const module of modules) {
            const activityIds = (module.Activite as any)?.map((a: any) => a.id) || [];
            if (activityIds.length === 0) continue;

            if (module.date_fin) {
                const { error: updateError } = await supabase
                    .from('Progression')
                    .update({ date_limite: module.date_fin })
                    .in('activite_id', activityIds)
                    .is('date_limite', null);

                if (updateError) {
                    console.error('Error backfilling due dates:', updateError);
                }
            }
        }
    } catch (err) {
        console.error('Unexpected error in fixMissingDueDates:', err);
    }
};
