
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Load environmental variables manually or via dotenv if available
// For this script, we'll assume the environment is set up or passed in
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role is needed for storage management if not public

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET_NAME = 'photos';

async function migrateTable(tableName, idColumn = 'id') {
    console.log(`\n--- Migrating table: ${tableName} ---`);

    // 1. Fetch records with Base64 but no URL
    const { data: records, error: fetchError } = await supabase
        .from(tableName)
        .select(`${idColumn}, photo_base64`)
        .not('photo_base64', 'is', null)
        .is('photo_url', null);

    if (fetchError) {
        console.error(`Error fetching ${tableName}:`, fetchError);
        return;
    }

    console.log(`Found ${records.length} records to migrate in ${tableName}`);

    for (const record of records) {
        try {
            const base64Data = record.photo_base64;
            if (!base64Data.startsWith('data:image/')) {
                console.warn(`Skipping record ${record[idColumn]}: Invalid Base64 format`);
                continue;
            }

            // 2. Extract mime type and data
            const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!match) continue;

            const contentType = match[1];
            const base64Content = match[2];
            const extension = contentType.split('/')[1];
            const fileName = `${tableName}/${record[idColumn]}.${extension}`;

            // 3. Convert to Buffer
            const buffer = Buffer.from(base64Content, 'base64');

            // 4. Upload to Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, buffer, {
                    contentType,
                    upsert: true
                });

            if (uploadError) {
                console.error(`Error uploading ${fileName}:`, uploadError);
                continue;
            }

            // 5. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            // 6. Update Database
            const { error: updateError } = await supabase
                .from(tableName)
                .update({ photo_url: publicUrl })
                .eq(idColumn, record[idColumn]);

            if (updateError) {
                console.error(`Error updating database for ${record[idColumn]}:`, updateError);
            } else {
                console.log(`✅ Migrated ${tableName} ${record[idColumn]} -> ${publicUrl}`);
            }
        } catch (err) {
            console.error(`Unexpected error for ${tableName} ${record[idColumn]}:`, err);
        }
    }
}

async function runMigration() {
    await migrateTable('Eleve');
    await migrateTable('Groupe');
    await migrateTable('SousBranche');
    console.log('\nMigration complete! 🎉');
}

runMigration();
