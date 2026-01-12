import { createClient } from '@supabase/supabase-js';

// Note: Run with: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/analyze_photo_sizes.js
// Or source .env.local first

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erreur: Variables d\'environnement manquantes');
    console.error('   Assurez-vous que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Calculate base64 size in bytes
function getBase64Size(base64String) {
    if (!base64String) return 0;
    const base64 = base64String.split(',')[1] || base64String;
    const padding = (base64.match(/=/g) || []).length;
    return (base64.length * 3) / 4 - padding;
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function analyzePhotoSizes() {
    try {
        console.log('\n📊 Analyse des tailles de photos...\n');

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('❌ Erreur: Utilisateur non trouvé');
            return;
        }

        // Fetch all students with photos
        const { data: students, error } = await supabase
            .from('Eleve')
            .select('id, nom, prenom, photo_base64')
            .eq('titulaire_id', user.id)
            .order('nom', { ascending: true });

        if (error) throw error;

        if (!students || students.length === 0) {
            console.log('ℹ️  Aucun élève trouvé');
            return;
        }

        // Calculate sizes
        const photoData = students.map(s => {
            const size = getBase64Size(s.photo_base64);
            return {
                nom: s.nom || 'N/A',
                prenom: s.prenom || 'N/A',
                hasPhoto: !!s.photo_base64,
                sizeBytes: size,
                sizeFormatted: formatBytes(size),
                needsOptimization: size > 10 * 1024
            };
        });

        // Display table
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│  NOM                PRÉNOM           PHOTO    TAILLE        │');
        console.log('├─────────────────────────────────────────────────────────────┤');

        let totalSize = 0;
        let totalWithPhotos = 0;
        let totalNeedingOptimization = 0;

        photoData.forEach(student => {
            const nom = student.nom.padEnd(18).substring(0, 18);
            const prenom = student.prenom.padEnd(15).substring(0, 15);
            const hasPhoto = student.hasPhoto ? '✓' : '✗';
            const size = student.sizeFormatted.padStart(12);
            const flag = student.needsOptimization ? '⚠️ ' : '  ';

            console.log(`│ ${flag}${nom} ${prenom} ${hasPhoto}     ${size} │`);

            if (student.hasPhoto) {
                totalSize += student.sizeBytes;
                totalWithPhotos++;
                if (student.needsOptimization) {
                    totalNeedingOptimization++;
                }
            }
        });

        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log(`📈 STATISTIQUES:`);
        console.log(`   Total élèves: ${students.length}`);
        console.log(`   Avec photo: ${totalWithPhotos}`);
        console.log(`   Taille totale: ${formatBytes(totalSize)}`);
        console.log(`   Moyenne par photo: ${formatBytes(totalWithPhotos > 0 ? totalSize / totalWithPhotos : 0)}`);
        console.log(`   À optimiser (> 10 KB): ${totalNeedingOptimization}`);
        console.log('');

        if (totalNeedingOptimization > 0) {
            const potentialSavings = totalSize - (totalWithPhotos * 10 * 1024);
            console.log(`💡 Économie potentielle: ${formatBytes(potentialSavings)}`);
        } else {
            console.log(`✅ Toutes les photos sont déjà optimisées !`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

analyzePhotoSizes();
