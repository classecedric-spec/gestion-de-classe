
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envConfig[match[1]] = match[2];
    }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log("Checking Counts...");

    const { count: activiteCount, error: errA } = await supabase.from('Activite').select('*', { count: 'exact', head: true });
    console.log(`Activite Count: ${activiteCount}, Error: ${errA?.message}`);

    const { count: moduleCount, error: errM } = await supabase.from('Module').select('*', { count: 'exact', head: true });
    console.log(`Module Count: ${moduleCount}, Error: ${errM?.message}`);

    // Check Relations
    if (moduleCount > 0) {
        const { data, error } = await supabase.from('Module').select('id, nom, Activite(id)').limit(1);
        if (error) {
            console.log("Relation fetch failed:", error);
        } else {
            console.log("Relation fetch success:", JSON.stringify(data, null, 2));
        }
    }
}

checkCounts();
