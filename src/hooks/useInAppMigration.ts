import { useEffect } from 'react';
import { supabase } from '../lib/database';
import { uploadImageToStorage } from '../lib/storage';

export interface MigratableRecord {
    id: string;
    photo_url?: string | null;
    photo_base64?: string | null;
}

/**
 * Hook to perform on-the-fly migration of Base64 images to Supabase Storage.
 * It scans the provided data for records that have a Base64 image but no URL,
 * uploads them, and updates the database.
 * 
 * @param {MigratableRecord[]} data - The list of records to check (Eleve, Groupe, etc.)
 * @param {string} tableName - The Supabase table name
 * @param {string} entityType - For path generation (e.g. 'eleve', 'groupe')
 */
export function useInAppMigration(data: MigratableRecord[] | undefined, tableName: string, entityType: string) {
    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;

        const migratePending = async () => {
            // Filter records that need migration (no photo_url)
            const pending = data.filter(item => !item.photo_url);

            if (pending.length === 0) return;


            for (const item of pending) {
                try {
                    let base64 = item.photo_base64;

                    // Fallback: fetch Base64 from DB if not provided in the list (saves bandwidth on lists!)
                    if (!base64) {
                        const { data: dbData, error: dbError } = await supabase
                            .from(tableName as any)
                            .select('id')
                            .eq('id', item.id)
                            .single();

                        if (dbError) continue;
                        base64 = (dbData as any)?.photo_base64;
                    }

                    if (base64) {
                        const filePath = `${entityType}/${item.id}.jpg`;
                        const publicUrl = await uploadImageToStorage(base64, filePath);

                        if (publicUrl) {
                            await supabase
                                .from(tableName as any)
                                .update({ photo_url: publicUrl } as any)
                                .eq('id', item.id);
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

export default useInAppMigration;
