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

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function debugTeo() {
    console.log('--- Debug Teo Devos - L Imparfait ---');
    
    // 1. Find Teo
    const { data: students, error: studentError } = await supabase
        .from('Eleve')
        .select('*')
        .ilike('prenom', 'Teo')
        .ilike('nom', 'Devos');

    if (studentError) {
        console.error('Error finding student:', studentError);
        return;
    }

    if (!students || students.length === 0) {
        console.log('Student not found. Trying loosely...');
        const { data: anyTeo } = await supabase.from('Eleve').select('*').ilike('prenom', '%teo%');
        console.log('Any Teo?', anyTeo);
        return;
    }

    const teo = students[0];
    console.log('Student:', teo.prenom, teo.nom, teo.id);

    // 2. Find Module "L'imparfait"
    const { data: modules, error: modError } = await supabase
        .from('Module')
        .select('*')
        .ilike('nom', '%imparfait%');

    if (modError) {
        console.error('Error finding module:', modError);
        return;
    }

    if (!modules || modules.length === 0) {
        console.log('Module not found.');
        return;
    }

    const module = modules[0]; // Assuming first logical match
    console.log('Module:', module.nom, module.id, 'Date Fin:', module.date_fin);

    // 3. Find Activities for this module
    const { data: activities } = await supabase
        .from('Activite')
        .select('*')
        .eq('module_id', module.id);

    console.log('Activities found:', activities.length);

    // 4. Find Progressions for Teo and these activities
    const { data: progressions } = await supabase
        .from('Progression')
        .select('*, Activite(titre)')
        .eq('eleve_id', teo.id)
        .in('activite_id', activities.map(a => a.id));

    console.log('\n--- PROGRESSIONS ---');
    console.table(progressions.map(p => ({
        Activite: p.Activite?.titre,
        Etat: p.etat,
        DateLimite: p.date_limite || 'None'
    })));
}

debugTeo();
