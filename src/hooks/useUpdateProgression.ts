import { useState } from 'react';
import { trackingService } from '../features/tracking/services/trackingService';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { getNextStatus } from '../lib/helpers';
import { toast } from 'sonner';

export interface UpdateProgressionOptions {
    setProgressions?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onOptimisticUpdate?: (nextStatus: string) => void;
    onRevert?: (originalStatus: string) => void;
    onSuccess?: () => void;
    explicitNextStatus?: string;
}

/**
 * useUpdateProgression
 * Hook to handle progression status updates with offline support and optimistic UI
 */
export const useUpdateProgression = () => {
    const { isOnline, addToQueue } = useOfflineSync();
    const [updating, setUpdating] = useState(false);

    /**
     * updateProgression
     * Handles progression status updates with optimistic UI and offline support
     */
    const updateProgression = async (
        studentId: string,
        activityId: string,
        currentStatus: string,
        options: UpdateProgressionOptions | ((prev: any) => void),
        onSuccessLegacy?: () => void
    ): Promise<string | null> => {
        if (!studentId || !activityId) return null;

        let setProgressions: React.Dispatch<React.SetStateAction<Record<string, string>>> | undefined;
        let onOptimisticUpdate: ((nextStatus: string) => void) | undefined;
        let onRevert: ((originalStatus: string) => void) | undefined;
        let successCallback = onSuccessLegacy;
        let explicitNextStatus: string | undefined;

        if (typeof options === 'function') {
            setProgressions = options as any;
        } else if (typeof options === 'object' && options !== null) {
            setProgressions = options.setProgressions;
            onOptimisticUpdate = options.onOptimisticUpdate;
            onRevert = options.onRevert;
            explicitNextStatus = options.explicitNextStatus;
            if (options.onSuccess) successCallback = options.onSuccess;
        }

        setUpdating(true);

        // 1. Calculate next status
        const nextStatus = explicitNextStatus || getNextStatus(currentStatus);

        // 2. Optimistic Update
        if (onOptimisticUpdate) {
            onOptimisticUpdate(nextStatus);
        } else if (setProgressions) {
            setProgressions(prev => ({
                ...prev,
                [activityId]: nextStatus
            }));
        }

        const timestamp = new Date().toISOString();
        const payload = {
            eleve_id: studentId,
            activite_id: activityId,
            etat: nextStatus,
            updated_at: timestamp
        };

        // 3. Offline handling
        if (!isOnline) {
            addToQueue({
                type: 'SUPABASE_CALL',
                table: 'Progression',
                method: 'upsert',
                payload: payload,
                match: null,
                contextDescription: `Maj statut`
            });
            setUpdating(false);
            return nextStatus;
        }

        // 4. Online update
        try {
            await trackingService.upsertProgression(payload);

            if (successCallback) successCallback();
            return nextStatus;

        } catch (error) {
            console.error('Error updating progression:', error);
            toast.error("Erreur lors de la mise à jour");

            // Revert optimistic update
            if (onRevert) {
                onRevert(currentStatus); // Revert to original status
            } else if (setProgressions) {
                setProgressions(prev => ({
                    ...prev,
                    [activityId]: currentStatus
                }));
            }
            return null;
        } finally {
            setUpdating(false);
        }
    };

    return {
        updateProgression,
        updating
    };
};
