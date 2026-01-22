import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

export interface OfflineAction {
    id: string;
    type: 'SUPABASE_CALL';
    table: string;
    method: 'upsert' | 'insert' | 'update' | 'delete';
    payload: any;
    match?: Record<string, any> | null;
    contextDescription?: string;
    timestamp: number;
}

export interface OfflineSyncContextType {
    isOnline: boolean;
    addToQueue: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => void;
    queue: OfflineAction[];
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const useOfflineSync = (): OfflineSyncContextType => {
    const context = useContext(OfflineSyncContext);
    if (!context) {
        throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
    }
    return context;
};

const QUEUE_KEY = 'gc_offline_queue';

export const OfflineSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<OfflineAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Initial Load
    useEffect(() => {
        const storedQueue = localStorage.getItem(QUEUE_KEY);
        if (storedQueue) {
            try {
                setQueue(JSON.parse(storedQueue));
            } catch (e) {
                console.error('Failed to parse offline queue', e);
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

    const addToQueue = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
        const newAction: OfflineAction = {
            ...action,
            timestamp: Date.now(),
            id: crypto.randomUUID()
        };
        const newQueue = [...queue, newAction];
        setQueue(newQueue);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
        toast.info("Hors-ligne : Action sauvegardée dans la file d'attente");
    };

    const processQueue = async () => {
        setIsSyncing(true);
        const currentQueue = [...queue];
        const failedItems: OfflineAction[] = [];
        let successCount = 0;

        toast.info("Connexion rétablie : Synchronisation...");

        for (const item of currentQueue) {
            try {
                if (item.type === 'SUPABASE_CALL') {
                    let query: any = supabase.from(item.table as any);

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
                            query = query.eq(key as any, value);
                        }
                    }

                    const { error } = await query;
                    if (error) throw error;
                    successCount++;
                }
            } catch (error) {
                console.error(`Sync error for ${item.contextDescription}:`, error);
                toast.error(`Échec sync: ${item.contextDescription || 'Action inconnue'}`);
                // failedItems.push(item); // Uncomment to retry if needed
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
