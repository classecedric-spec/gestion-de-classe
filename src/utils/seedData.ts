import { SupabaseClient } from '@supabase/supabase-js';

export async function seedOverdueData(supabase: SupabaseClient) {
    console.log('Seeding overdue data for Cedric Test...');

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('No user logged in');
        return { error: 'Not logged in' };
    }

    // 2. Find or Create Student 'Cedric Test'
    let { data: student, error: studentError } = await supabase
        .from('Eleve')
        .select('*')
        .eq('nom', 'Test')
        .eq('prenom', 'Cedric')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!student) {
        // Create the student if not found
        console.log('Creating Cedric Test student...');
        const { data: newStudent, error: createError } = await supabase
            .from('Eleve')
            .insert({
                prenom: 'Cedric',
                nom: 'Test',
                user_id: user.id,
                classe: 'CM2', // Default class
                niveau: 'CM2'
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating student:', createError);
            return { error: createError.message };
        }
        student = newStudent;
    }

    if (!student) return { error: 'Could not create student' };

    console.log(`Using student: ${student.id}`);

    // 3. Create Dummy Activities
    const activitiesToCreate = [
        'Mathématiques - Fractions', 'Français - Grammaire', 'Histoire - Moyen Âge',
        'Géographie - Europe', 'Sciences - Le corps humain'
    ];

    const createdActivityIds: string[] = [];

    for (const title of activitiesToCreate) {
        let { data: existing } = await supabase
            .from('Activite')
            .select('id')
            .eq('titre', title)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existing) {
            const { data: newAct } = await supabase
                .from('Activite')
                .insert({
                    titre: title,
                    user_id: user.id,
                })
                .select()
                .single();
            existing = newAct;
        }

        if (existing) createdActivityIds.push(existing.id);
    }

    // 4. Create Overdue Progressions
    console.log('Generating overdue items...');
    let createdCount = 0;

    for (let i = 1; i <= 15; i++) {
        const title = `Devoir Retard #${i}`;

        // Create unique activity for each overdue item to simulate list
        let { data: act } = await supabase
            .from('Activite')
            .insert({
                titre: title,
                user_id: user.id,
            })
            .select()
            .single();

        if (act) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 10) - 1);

            const { error: progError } = await supabase
                .from('Progression')
                .insert({
                    eleve_id: student.id,
                    activite_id: act.id,
                    etat: 'non_acquis',
                    date_limite: pastDate.toISOString(),
                });

            if (!progError) createdCount++;
        }
    }

    return { success: true, count: createdCount, studentId: student.id };
}
