import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { getNextStatus } from '../lib/statusHelpers';
import { toast } from 'sonner';

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
     * 
     * @param {string} studentId - Student ID
     * @param {string} activityId - Activity ID
     * @param {string} currentStatus - Current status string (used to calculate next if explicitNextStatus not provided)
     * @param {function|object} options - Either the setProgressions function (legacy) or an options object
     * @param {function} [onSuccess] - Callback for successful update (legacy)
     */
    const updateProgression = async (studentId, activityId, currentStatus, options, onSuccess) => {
        if (!studentId || !activityId) return;

        // Normalize params to support both signatures:
        // 1. (..., setProgressions, onSuccess)
        // 2. (..., { onOptimisticUpdate, onRevert, onSuccess, explicitNextStatus })

        let setProgressions = null;
        let onOptimisticUpdate = null;
        let onRevert = null;
        let successCallback = onSuccess;
        let explicitNextStatus = null;

        if (typeof options === 'function') {
            setProgressions = options;
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
            // Default behavior: update key = activityId
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
                match: null, // upsert uses PK
                contextDescription: `Maj statut`
            });
            setUpdating(false);
            return nextStatus;
        }

        // 4. Online update
        try {
            const { error } = await supabase
                .from('Progression')
                .upsert(payload, { onConflict: 'eleve_id,activite_id' });

            if (error) throw error;

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
