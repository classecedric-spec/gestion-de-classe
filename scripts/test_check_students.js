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

async function check() {
    console.log('--- Checking DB via Script ---');
    const { data: students, error } = await supabase.from('Eleve').select('id, prenom, nom').limit(5);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Students count:', students.length);
        console.log('Students:', students);
    }
}
check();
