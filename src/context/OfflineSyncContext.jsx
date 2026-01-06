import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const OfflineSyncContext = createContext();

export const useOfflineSync = () => useContext(OfflineSyncContext);

const QUEUE_KEY = 'gc_offline_queue';

export const OfflineSyncProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Initial Load
    useEffect(() => {
        const storedQueue = localStorage.getItem(QUEUE_KEY);
        if (storedQueue) {
            try {
                setQueue(JSON.parse(storedQueue));
            } catch (e) {
                console.error("Failed to parse offline queue", e);
            }
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync on Online + Queue presence
    useEffect(() => {
        if (isOnline && queue.length > 0 && !isSyncing) {
            processQueue();
        }
    }, [isOnline, queue, isSyncing]);

    const addToQueue = (action) => {
        // action: { id: uuid, type: 'SUPABASE_CALL', table, method, payload, match, contextDescription }
        const newQueue = [...queue, { ...action, timestamp: Date.now(), id: crypto.randomUUID() }];
        setQueue(newQueue);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
        toast.info("Hors-ligne : Action sauvegardée dans la file d'attente");
    };

    const processQueue = async () => {
        setIsSyncing(true);
        const currentQueue = [...queue];
        const failedItems = [];
        let successCount = 0;

        toast.info("Connexion rétablie : Synchronisation...");

        for (const item of currentQueue) {
            try {
                if (item.type === 'SUPABASE_CALL') {
                    let query = supabase.from(item.table);

                    if (item.method === 'upsert') {
                        query = query.upsert(item.payload);
                    } else if (item.method === 'insert') {
                        query = query.insert(item.payload);
                    } else if (item.method === 'update') {
                        query = query.update(item.payload);
                    } else if (item.method === 'delete') {
                        query = query.delete();
                    }

                    if (item.match) {
                        for (const [key, value] of Object.entries(item.match)) {
                            query = query.eq(key, value);
                        }
                    }

                    const { error } = await query;
                    if (error) throw error;
                    successCount++;
                }
            } catch (error) {
                console.error("Sync error for item:", item, error);
                // Keep failed items to retry later? Or discard?
                // For now, let's keep them if it's a network error, discard if logic error?
                // Hard to distinguish perfectly. We'll keep them if we suspect network flicker.
                // But we are supposedly strictly online here.
                // Let's assume logic error or hard fail => Toast error and remove to avoid block.
                toast.error(`Échec sync: ${item.contextDescription || 'Action inconnue'}`);
                // failedItems.push(item); // Uncomment to retry
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} actions synchronisées !`);
        }

        // Update queue
        setQueue(failedItems);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
        setIsSyncing(false);
    };

    return (
        <OfflineSyncContext.Provider value={{ isOnline, addToQueue, queue }}>
            {children}
            {!isOnline && (
                <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-black text-[10px] font-bold text-center py-0.5 z-[9999]">
                    MODE HORS-LIGNE • {queue.length} action(s) en attente
                </div>
            )}
        </OfflineSyncContext.Provider>
    );
};
