import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data, error } = await supabase.rpc('get_kiosk_progressions_test');
    if (error) console.error("Error:", error);
    else console.log("RPC get_kiosk_progressions_test:", JSON.stringify(data?.[0]?.prosrc, null, 2));
}

test().catch(console.error);
