import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars from .env in the current working directory (project root)
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedOverdueData() {
    console.log('Seeding overdue data for Cedric Test...');

    const { data: students, error: studentError } = await supabase
        .from('Eleve')
        .select('*')
        .eq('nom', 'Test')
        .eq('prenom', 'Cedric')
        .maybeSingle();

    let studentId = students?.id;
    let userId = students?.user_id;

    if (!studentId) {
        console.log('Student "Cedric Test" not found. Check if the database has this student.');
        return;
    }

    console.log(`Found student: ${studentId} (User: ${userId})`);

    const activitiesToCreate = [
        'Mathématiques - Fractions', 'Français - Grammaire', 'Histoire - Moyen Âge',
        'Géographie - Europe', 'Sciences - Le corps humain'
    ];

    const createdActivities: string[] = [];

    for (const title of activitiesToCreate) {
        const { data: existing } = await supabase
            .from('Activite')
            .select('id')
            .eq('titre', title)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            createdActivities.push(existing.id);
        } else {
            const { data: newAct, error } = await supabase
                .from('Activite')
                .insert({
                    titre: title,
                    user_id: userId,
                })
                .select()
                .single();

            if (newAct) createdActivities.push(newAct.id);
        }
    }

    console.log('Generating 20 unique overdue activities...');
    for (let i = 1; i <= 20; i++) {
        const title = `Devoir Retard #${i}`;

        const { data: act } = await supabase
            .from('Activite')
            .insert({
                titre: title,
                user_id: userId,
            })
            .select()
            .single();

        if (act && studentId) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 10) - 1);

            await supabase
                .from('Progression')
                .insert({
                    eleve_id: studentId,
                    activite_id: act.id,
                    etat: 'non_acquis',
                    date_limite: pastDate.toISOString(),
                });
        }
    }

    console.log('Seeding complete! 20 overdue items created.');
}

seedOverdueData();
