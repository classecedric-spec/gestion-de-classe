
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAttendanceCount() {
    const start = '2026-01-01';
    const end = '2026-01-31';

    console.log(`Checking attendance count between ${start} and ${end}`);

    const { count, error } = await supabase
        .from('Attendance')
        .select('*', { count: 'exact', head: true })
        .gte('date', start)
        .lte('date', end);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Total records found: ${count}`);
        if (count && count >= 1000) {
            console.log("WARNING: Result exceeds or equals default Supabase limit of 1000!");
        } else {
            console.log("Count is safely below default limit.");
        }
    }
}

checkAttendanceCount();
