import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('STARTING_SCRIPTS');

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        envConfig[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function findTeo() {
    console.log('Searching for student Teo...');
    const { data: students, error: sErr } = await supabase.from('Eleve').select('*');
    if (sErr) console.error('Error fetching students:', sErr);
    console.log('Total students found:', students ? students.length : 0);
    
    if (students) {
        students.forEach(s => {
            if (s.prenom.toLowerCase().includes('teo') || s.nom.toLowerCase().includes('devos')) {
                console.log('MATCH:', s);
            }
        });
    }

    console.log('Searching for module imparfait...');
    const { data: modules, error: mErr } = await supabase.from('Module').select('*');
    if (mErr) console.error('Error fetching modules:', mErr);
    console.log('Total modules found:', modules ? modules.length : 0);
    
    if (modules) {
        modules.forEach(m => {
            if (m.nom.toLowerCase().includes('imparfait')) {
                console.log('MATCH_MODULE:', m);
            }
        });
    }
}

findTeo().then(() => console.log('FINISHED')).catch(err => {
    console.error('FATAL_ERROR:', err);
    process.exit(1);
});
