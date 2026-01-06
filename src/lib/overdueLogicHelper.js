
/**
 * Backfill missing 'date_limite' for existing progressions.
 * It looks for progressions with NULL date_limite and updates them
 * with the 'date_fin' of their corresponding module.
 */
const fixMissingDueDates = async (userId) => {
    try {
        // 1. Fetch all Modules that have a date_fin
        const { data: modules, error: modError } = await supabase
            .from('Module')
            .select('id, date_fin, Activite(id)')
            .eq('user_id', userId)
            .not('date_fin', 'is', null);

        if (modError || !modules) return;

        // 2. Iterate and Update
        // Note: Doing this in a loop isn't the most efficient for thousands of records,
        // but for a class management app (dozens of modules) it's acceptable and safer.
        for (const module of modules) {
            const activityIds = module.Activite?.map(a => a.id) || [];
            if (activityIds.length === 0) continue;

            const { error: updateError } = await supabase
                .from('Progression')
                .update({ date_limite: module.date_fin })
                .in('activite_id', activityIds)
                .is('date_limite', null); // Only touch those who missed the boat

            if (updateError) console.error('Error backfilling dates for module:', module.id, updateError);
        }
    } catch (err) {
        console.error('Error in fixMissingDueDates:', err);
    }
};
