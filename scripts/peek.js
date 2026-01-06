import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        envConfig[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function peek() {
    console.log('--- Peeking into DB ---');
    const tables = ['Eleve', 'Module', 'Progression'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*, count(*) OVER()').limit(1);
        if (error) {
            console.error(`Error for ${t}:`, error.message);
        } else {
            console.log(`Data in ${t}:`, JSON.stringify(data, null, 2));
        }
    }
}
peek();
