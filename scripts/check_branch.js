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
    console.time('fetch');
    const { data: branches, error: bErr } = await supabase.from('Branche').select('*').limit(5);
    console.log('Branches:', branches);
    if(bErr) console.error('Branch Error:', bErr);

    const { data: modules, error: mErr } = await supabase.from('Module').select('id, nom, branche_id').limit(5);
    console.log('Modules Sample:', modules);
    if(mErr) console.error('Module Error:', mErr);
    console.timeEnd('fetch');
}

check();
