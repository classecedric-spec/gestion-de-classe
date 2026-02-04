
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery() {
    console.log("--- Query Step 1: Base Progression (All accessible data) ---");

    // The "formula" requested:
    // const { data, error } = await supabase.from('Progression').select('*').limit(30)

    const { data, error } = await supabase
        .from('Progression')
        .select('*')
        .limit(30);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Fetched ${data.length} rows.`);
    if (data.length > 0) {
        console.log("First 30 rows (summary):");
        data.forEach((row, i) => {
            console.log(`[${i}] ID: ${row.id}, Eleve: ${row.eleve_id}, Activite: ${row.activite_id}, Etat: ${row.etat}, DateLimite: ${row.date_limite}`);
        });
    }
}

runQuery();
