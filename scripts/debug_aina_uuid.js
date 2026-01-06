import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const AINA_UUID = 'ea57c039-92bd-48b6-af7c-1de4ffea42a4';

async function debugAina() {
    console.log('--- Debug Aina (UUID:', AINA_UUID, ') ---\n');

    // 1. Verify student exists
    const { data: student } = await supabase
        .from('Eleve')
        .select('id, prenom, nom')
        .eq('id', AINA_UUID)
        .single();

    console.log('Student:', student ? `${student.prenom} ${student.nom}` : 'NOT FOUND');
    console.log('');

    // 2. Query ALL Progressions for this UUID
    const { data: progressions, error } = await supabase
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
        .eq('eleve_id', AINA_UUID);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total Progressions for Aina:', progressions?.length || 0);
    console.log('');

    if (progressions && progressions.length > 0) {
        console.log('--- ALL PROGRESSIONS ---');
        progressions.forEach((p, i) => {
            console.log(`${i+1}. [${p.etat}] ${p.Activite?.titre || 'N/A'} | Module: ${p.Activite?.Module?.nom || 'N/A'} (${p.Activite?.Module?.statut || 'N/A'})`);
        });

        // Filtered view
        const filtered = progressions.filter(p => 
            p.Activite?.Module?.statut === 'en_cours' && 
            p.etat !== 'termine'
        );
        console.log('\n--- FILTERED (en_cours + non-termine) ---');
        console.log('Count:', filtered.length);
        filtered.forEach((p, i) => {
            console.log(`${i+1}. [${p.etat}] ${p.Activite?.titre}`);
        });
    } else {
        console.log('No progressions found for this student.');
    }
}

debugAina();
