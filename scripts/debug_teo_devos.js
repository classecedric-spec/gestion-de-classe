import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envConfig[match[1].trim()] = match[2].trim().replace(/^[\"']|[\"']$/g, '');
    }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTeo() {
    console.log('--- Debug Teo Devos - L Imparfait ---');
    
    // 1. Find the student
    const { data: students, error: studentError } = await supabase
        .from('Eleve')
        .select('id, prenom, nom')
        .ilike('prenom', 'Teo')
        .ilike('nom', 'Devos');

    if (studentError) {
        console.error('Error finding student:', studentError);
        return;
    }

    if (students.length === 0) {
        console.log('No student found for Teo Devos');
        // Let's list potential candidates
        const { data: allStudents } = await supabase.from('Eleve').select('prenom, nom').limit(20);
        console.log('Sample students in DB:', allStudents);
        return;
    }

    const teo = students[0];
    console.log('Found student:', teo);

    // 2. Find the module
    const { data: modules, error: moduleError } = await supabase
        .from('Module')
        .select('id, nom')
        .ilike('nom', '%imparfait%');

    if (moduleError) {
        console.error('Error finding module:', moduleError);
        return;
    }

    if (modules.length === 0) {
        console.log('No module found with "imparfait"');
        const { data: allModules } = await supabase.from('Module').select('nom').limit(10);
        console.log('Sample modules in DB:', allModules);
        return;
    }

    const moduleIds = modules.map(m => m.id);
    console.log('Found modules:', modules.map(m => m.nom));

    // 3. Find progressions
    const { data: progressions, error: progError } = await supabase
        .from('Progression')
        .select(`
            id,
            etat,
            date_limite,
            Activite!inner(titre, module_id),
            eleve_id
        `)
        .eq('eleve_id', teo.id)
        .in('Activite.module_id', moduleIds);

    if (progError) {
        console.error('Error finding progressions:', progError);
        return;
    }

    if (progressions.length === 0) {
        console.log('No progression lines found for Teo in these modules.');
        return;
    }

    console.log(JSON.stringify(progressions, null, 2));
}

debugTeo();
