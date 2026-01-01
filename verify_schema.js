
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

async function verifySchema() {
    console.log("=== VERIFYING SCHEMA ===");

    // 1. Check if 'module_id' exists in 'Activite' by selecting it.
    // We expect 0 rows or error if column missing.
    console.log("1. Checking 'module_id' in 'Activite' table...");
    const { error: colError } = await supabase
        .from('Activite')
        .select('module_id')
        .limit(1);

    if (colError) {
        console.error("FAIL: 'module_id' column likely missing or table inaccessible.");
        console.error("Error details:", colError.message);
    } else {
        console.log("PASS: 'module_id' column exists.");
    }

    // 2. Check if 'ordre' exists in 'Activite'
    console.log("2. Checking 'ordre' in 'Activite' table...");
    const { error: ordError } = await supabase
        .from('Activite')
        .select('ordre')
        .limit(1);

    if (ordError) {
        console.error("FAIL: 'ordre' column likely missing.");
        console.error("Error details:", ordError.message);
    } else {
        console.log("PASS: 'ordre' column exists.");
    }

    // 3. Check Relationship Access from Module -> Activite
    console.log("3. Checking Relationship 'Activite' on 'Module'...");
    const { error: relError } = await supabase
        .from('Module')
        .select('id, Activite(id)')
        .limit(1);

    if (relError) {
        console.error("FAIL: Could not fetch 'Activite' relation from 'Module'.");
        console.error("Error details:", relError.message);
    } else {
        console.log("PASS: Relationship 'Activite' exists and is accessible.");
    }
}

verifySchema();
