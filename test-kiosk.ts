import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    // 1. Get the student ID for 'Cédric test'
    const { data: students } = await supabase.from('Eleve').select('id, prenom, nom').ilike('prenom', '%cédric%');
    console.log("Students:", students);
    
    if (!students || students.length === 0) return;
    const studentId = students[0].id;

    // 2. Fetch progressions map
    const { data: progData } = await supabase.from('Progression').select('activite_id, etat').eq('eleve_id', studentId);
    
    const progMap: Record<string, string> = {};
    progData?.forEach(p => {
        if (p.activite_id) {
            progMap[p.activite_id] = p.etat;
        }
    });

    console.log("ProgMap size:", Object.keys(progMap).length);

    // 3. Fetch planned ids
    const { data: planData } = await supabase.from('PlanificationHebdo').select('activite_id').eq('eleve_id', studentId);
    console.log("Planned size:", planData?.length);

    // 4. Test logic
    // Just to see what evaluates
}

test().catch(console.error);
