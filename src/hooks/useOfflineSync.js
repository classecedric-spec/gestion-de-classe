import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

export const useOfflineSync = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState(() => {
        try {
            const saved = localStorage.getItem('suivi_sync_queue');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Network status listeners
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            processQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Persist queue
    useEffect(() => {
        localStorage.setItem('suivi_sync_queue', JSON.stringify(queue));
    }, [queue]);

    const addToQueue = useCallback((action) => {
        // action: { type: 'update' | 'delete', table: 'Progression', payload: {}, id: string, timestamp: number }
        const newAction = { ...action, timestamp: Date.now() };
        setQueue(prev => [...prev, newAction]);
    }, []);

    const processQueue = async () => {
        if (!navigator.onLine) return;

        // Get fresh queue from state or localstorage? Better to rely on ref or functional update if possible, 
        // but here we just read current queue. 
        // Actually, inside the effect closure 'processQueue' might get stale if not carefully managed.
        // Let's rely on the latest queue from localStorage to be safe, or just use the state.

        const currentQueue = JSON.parse(localStorage.getItem('suivi_sync_queue') || '[]');
        if (currentQueue.length === 0) return;

        toast.loading("Synchronisation en cours...", { id: 'sync-toast' });

        const failedItems = [];
        let successCount = 0;

        for (const item of currentQueue) {
            try {
                if (item.type === 'update') {
                    const { error } = await supabase
                        .from(item.table)
                        .update(item.payload)
                        .eq('id', item.id);
                    if (error) throw error;
                } else if (item.type === 'delete') {
                    const { error } = await supabase
                        .from(item.table)
                        .delete()
                        .eq('id', item.id);
                    if (error) throw error;
                }
                successCount++;
            } catch (err) {
                console.error("Sync failed for item:", item, err);
                // Keep in queue only if it's a network error? 
                // For now, if it fails, we keep it? Or maybe valid logic error shouldn't block others.
                // Simple approach: if failure, keep it to retry later?
                // For now let's push to failedItems
                failedItems.push(item);
            }
        }

        setQueue(failedItems);

        if (successCount > 0) {
            toast.success(`${successCount} actions synchronisées`, { id: 'sync-toast' });
        } else if (failedItems.length > 0) {
            toast.error("Erreur de synchronisation", { id: 'sync-toast' });
        } else {
            toast.dismiss('sync-toast');
        }
    };

    return {
        isOnline,
        queue,
        addToQueue,
        processQueue
    };
};
