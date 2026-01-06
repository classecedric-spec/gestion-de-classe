import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        envConfig[key] = value;
    }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function findTeo() {
    console.log('Searching for Teo Devos...');
    
    // 1. Search Student
    const { data: students, error: sErr } = await supabase
        .from('Eleve')
        .select('id, prenom, nom')
        .or('prenom.ilike.%Teo%,prenom.ilike.%Téo%,prenom.ilike.%Théo%')
        .ilike('nom', '%Devos%');

    if (sErr) console.error('Student Error:', sErr);
    console.log('Found Students:', students);

    if (!students || students.length === 0) {
        const { data: all } = await supabase.from('Eleve').select('prenom, nom').limit(10);
        console.log('Total students sample:', all);
        return;
    }

    const teoId = students[0].id;

    // 2. Search Module
    const { data: modules, error: mErr } = await supabase
        .from('Module')
        .select('id, nom, date_fin')
        .ilike('nom', '%imparfait%');

    if (mErr) console.error('Module Error:', mErr);
    console.log('Found Modules:', modules);

    if (!modules || modules.length === 0) return;

    // Filter by date if possible
    const targetModule = modules.find(m => m.date_fin === '2025-12-12') || modules[0];
    console.log('Targeting Module:', targetModule.nom, '(', targetModule.date_fin, ')');

    // 3. Get Activities for this Module
    const { data: activities, error: aErr } = await supabase
        .from('Activite')
        .select('id, titre, ordre')
        .eq('module_id', targetModule.id)
        .order('ordre');

    if (aErr) console.error('Activity Error:', aErr);

    // 4. Get Progressions
    const { data: progressions, error: pErr } = await supabase
        .from('Progression')
        .select('*')
        .eq('eleve_id', teoId)
        .in('activite_id', activities.map(a => a.id));

    if (pErr) console.error('Progression Error:', pErr);

    const tableData = activities.map(act => {
        const prog = (progressions || []).find(p => p.activite_id === act.id);
        return {
            Activité: act.titre,
            État: prog ? prog.etat : 'Jamais commencé',
            'Date Limite': prog ? prog.date_limite : 'N/A'
        };
    });

    console.log('RESULT_START');
    console.log(JSON.stringify(tableData, null, 2));
    console.log('RESULT_END');
}

findTeo();
