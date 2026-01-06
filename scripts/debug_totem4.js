import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const AINA_UUID = 'ea57c039-92bd-48b6-af7c-1de4ffea42a4';

async function findTotem4() {
    console.log('--- Finding Totem 4 activities for Aina ---\n');

    const { data, error } = await supabase
        .from('Progression')
        .select(`
            id,
            etat,
            Activite (
                id,
                titre,
                Module (
                    id,
                    nom,
                    statut,
                    date_fin
                )
            )
        `)
        .eq('eleve_id', AINA_UUID);

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Filter for Totem 4 activities
    const totem4 = data.filter(p => p.Activite?.titre?.includes('Totem 4'));

    console.log('Found', totem4.length, 'Totem 4 progressions for Aina:\n');

    // Group by module
    const moduleMap = {};
    totem4.forEach(p => {
        const mod = p.Activite?.Module;
        if (!mod) return;
        const key = mod.id;
        if (!moduleMap[key]) {
            moduleMap[key] = {
                moduleName: mod.nom,
                moduleId: mod.id,
                statut: mod.statut,
                dateFin: mod.date_fin,
                activities: []
            };
        }
        moduleMap[key].activities.push({
            titre: p.Activite.titre,
            etat: p.etat
        });
    });

    Object.values(moduleMap).forEach(m => {
        console.log(`📦 Module: "${m.moduleName}" (ID: ${m.moduleId.substring(0,8)}...)`);
        console.log(`   Statut: ${m.statut} | Date Fin: ${m.dateFin}`);
        console.log(`   Activities (${m.activities.length}):`);
        m.activities.forEach(a => {
            console.log(`     - [${a.etat}] ${a.titre}`);
        });
        console.log('');
    });
}

findTotem4();
