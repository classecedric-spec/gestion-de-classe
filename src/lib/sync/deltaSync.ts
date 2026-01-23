/**
 * Delta Sync Manager
 * Fetches only data that has changed since last sync
 * Reduces bandwidth by 80-95% for returning users
 */

import { supabase } from '../database';
import { Database } from '../types/supabase';

type TableName = keyof Database['public']['Tables'];

const DB_NAME = 'DeltaSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'syncData';

interface SyncRecord {
    key: string;
    timestamp: string;
    updatedAt: string;
}

interface SyncStat {
    table: string;
    lastSync: string;
    updatedAt: string;
}

/**
 * Initialize IndexedDB for delta sync
 */
const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

/**
 * Get last sync timestamp for a table
 */
const getLastSync = async (tableName: string): Promise<string> => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(`last-sync-${tableName}`);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const result = request.result as SyncRecord | undefined;
                resolve(result?.timestamp || '1970-01-01T00:00:00Z');
            };
            request.onerror = () => resolve('1970-01-01T00:00:00Z');
        });
    } catch (error) {
        return '1970-01-01T00:00:00Z';
    }
};

/**
 * Set last sync timestamp for a table
 */
const setLastSync = async (tableName: string, timestamp: string): Promise<void> => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        store.put({
            key: `last-sync-${tableName}`,
            timestamp,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error setting last sync:', error);
    }
};

/**
 * Fetch delta (only changed records) for a table
 */
export const fetchDelta = async <T extends TableName>(
    tableName: T,
    selectColumns: string = '*',
    filters: Record<string, any> = {}
): Promise<{ delta: any[]; isFirstSync: boolean; count: number }> => {
    const lastSync = await getLastSync(tableName);

    let query = supabase
        .from(tableName as any)
        .select(selectColumns as any)
        .gte('updated_at', lastSync)
        .order('updated_at', { ascending: true });

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
        query = (query as any).eq(key as any, value as any);
    });

    const { data, error } = await query;

    if (error) {
        console.error(`Delta fetch error for ${tableName}:`, error);
        return { delta: [], isFirstSync: lastSync === '1970-01-01T00:00:00Z', count: 0 };
    }

    // Update last sync timestamp if we got data
    if (data && data.length > 0) {
        const latestUpdate = (data[data.length - 1] as any).updated_at;
        if (latestUpdate) {
            await setLastSync(tableName, latestUpdate);
        }
    }

    return {
        delta: data || [],
        isFirstSync: lastSync === '1970-01-01T00:00:00Z',
        count: data?.length || 0
    };
};

/**
 * Merge delta with existing local data
 */
export const mergeDelta = <T>(existingData: T[], delta: T[], idField: keyof T = 'id' as keyof T): T[] => {
    if (!delta || delta.length === 0) return existingData;

    const dataMap = new Map<any, T>(existingData.map(item => [item[idField], item]));

    // Update or add delta items
    delta.forEach(item => {
        dataMap.set(item[idField], item);
    });

    return Array.from(dataMap.values());
};

/**
 * Force full refresh (reset sync timestamp)
 */
export const resetSync = async (tableName: string): Promise<void> => {
    await setLastSync(tableName, '1970-01-01T00:00:00Z');
};

/**
 * Clear all sync data
 */
export const clearAllSyncData = async (): Promise<void> => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
    } catch (error) {
        console.error('Error clearing sync data:', error);
    }
};

/**
 * Get sync stats
 */
export const getSyncStats = async (): Promise<SyncStat[]> => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const syncData = (request.result || []) as SyncRecord[];
                const stats = syncData.map(item => ({
                    table: item.key.replace('last-sync-', ''),
                    lastSync: item.timestamp,
                    updatedAt: item.updatedAt
                }));
                resolve(stats);
            };
            request.onerror = () => resolve([]);
        });
    } catch (error) {
        return [];
    }
};
