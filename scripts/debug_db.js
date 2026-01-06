import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envConfig[match[1].trim()] = match[2].trim().replace(/^[\"']|[\"']$/g, '');
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function debug() {
    console.log('--- DB Debug ---');
    const { data: students } = await supabase.from('Eleve').select('id, prenom, nom').limit(5);
    console.log('Students:', students);
    
    const { data: groups } = await supabase.from('Groupe').select('id, nom').limit(5);
    console.log('Groups:', groups);

    const { data: modules } = await supabase.from('Module').select('id, nom').limit(5);
    console.log('Modules:', modules);
}
debug();
