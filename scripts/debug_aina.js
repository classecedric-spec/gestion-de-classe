import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function debugAina() {
    console.log('--- Debug Aina Progressions ---\n');

    // 1. Find Aina
    const { data: students, error: studentError } = await supabase
        .from('Eleve')
        .select('id, prenom, nom')
        .ilike('prenom', '%aina%');

    if (studentError) {
        console.error('Error finding student:', studentError);
        return;
    }

    if (!students || students.length === 0) {
        console.log('Student "Aina" not found.');
        return;
    }

    const aina = students[0];
    console.log('Student Found:', aina.prenom, aina.nom, '| ID:', aina.id);
    console.log('');

    // 2. Query ALL Progressions for Aina
    const { data: progressions, error: progError } = await supabase
        .from('Progression')
        .select(`
            id,
            etat,
            eleve_id,
            Activite (
                id,
                titre,
                Module (
                    id,
                    nom,
                    statut
                )
            )
        `)
        .eq('eleve_id', aina.id);

    if (progError) {
        console.error('Error fetching progressions:', progError);
        return;
    }

    console.log('Total Progressions for Aina:', progressions.length);
    console.log('');
    console.log('--- PROGRESSIONS TABLE ---');
    console.table(progressions.map(p => ({
        ProgressionID: p.id.substring(0,8),
        EleveID: p.eleve_id.substring(0,8),
        Etat: p.etat,
        Activite: p.Activite?.titre?.substring(0, 30) || 'N/A',
        Module: p.Activite?.Module?.nom?.substring(0, 25) || 'N/A',
        ModuleStatut: p.Activite?.Module?.statut || 'N/A'
    })));

    // 3. Filter only 'en_cours' modules and non-termine
    const filtered = progressions.filter(p => 
        p.Activite?.Module?.statut === 'en_cours' && 
        p.etat !== 'termine'
    );
    console.log('\n--- FILTERED (en_cours + non-termine) ---');
    console.log('Count:', filtered.length);
    console.table(filtered.map(p => ({
        Activite: p.Activite?.titre?.substring(0, 40),
        Etat: p.etat,
        Module: p.Activite?.Module?.nom
    })));
}

debugAina();
