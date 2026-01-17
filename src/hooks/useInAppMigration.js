
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImageToStorage } from '../lib/storageUtils';

/**
 * Hook to perform on-the-fly migration of Base64 images to Supabase Storage.
 * It scans the provided data for records that have a Base64 image but no URL,
 * uploads them, and updates the database.
 * 
 * @param {Array} data - The list of records to check (Eleve, Groupe, etc.)
 * @param {string} tableName - The Supabase table name
 * @param {string} entityType - For path generation (e.g. 'eleve', 'groupe')
 */
export function useInAppMigration(data, tableName, entityType) {
    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;

        const migratePending = async () => {
            // Filter records that need migration (no photo_url)
            // Even if photo_base64 is missing from 'item', we'll check the DB as a fallback
            const pending = data.filter(item => !item.photo_url);

            if (pending.length === 0) return;

            console.log(`[Migration] Scanning ${pending.length} potential records in ${tableName}`);

            for (const item of pending) {
                try {
                    let base64 = item.photo_base64;

                    // Fallback: fetch Base64 from DB if not provided in the list (saves bandwidth on lists!)
                    if (!base64) {
                        const { data: dbData, error: dbError } = await supabase
                            .from(tableName)
                            .select('photo_base64')
                            .eq('id', item.id)
                            .single();

                        if (dbError) continue;
                        base64 = dbData?.photo_base64;
                    }

                    if (base64) {
                        const filePath = `${entityType}/${item.id}.jpg`;
                        const publicUrl = await uploadImageToStorage(base64, filePath);

                        if (publicUrl) {
                            const { error } = await supabase
                                .from(tableName)
                                .update({ photo_url: publicUrl })
                                .eq('id', item.id);

                            if (!error) {
                                console.log(`[Migration] Successfully migrated ${entityType} ${item.id}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[Migration] Error for ${entityType} ${item.id}:`, error);
                }
            }
        };

        migratePending();
    }, [data, tableName, entityType]);
}
