import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

import { adultService, Adult, ActivityType, AdultActivity } from '../../adults/services/adultService';

// Remove local interfaces as they are imported
// ...

/**
 * useAdultTracking
 * Manages adult activity tracking for today
 * 
 * @returns {object} Adult tracking state and actions
 */
export function useAdultTracking() {
    const { isOnline, addToQueue } = useOfflineSync();

    const [adultActivities, setAdultActivities] = useState<AdultActivity[]>([]);
    const [allAdults, setAllAdults] = useState<Adult[]>([]);
    const [availableActivityTypes, setAvailableActivityTypes] = useState<ActivityType[]>([]);
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [loadingAdults, setLoadingAdults] = useState(false);
    const [currentAdultSelection, setCurrentAdultSelection] = useState<string | null>(null);
    const [currentActivityTypeSelection, setCurrentActivityTypeSelection] = useState<string | null>(null);

    // Fetch adult tracking for today
    const fetchAdultTracking = async () => {
        await fetchWithCache(
            'adult_tracking_today',
            async () => {
                const today = new Date().toISOString().split('T')[0];
                return await adultService.fetchAdultActivities(today);
            },
            (data) => setAdultActivities(data as AdultActivity[]),
            (_err) => { }
        );
    };

    // Fetch all adults
    const fetchAllAdults = async () => {
        await fetchWithCache(
            'all_adults',
            async () => {
                return await adultService.fetchAllAdults();
            },
            (data) => setAllAdults(data as Adult[]),
            (_err) => { }
        );
    };

    // Fetch activity types
    const fetchActivityTypes = async () => {
        await fetchWithCache(
            'activity_types_adult',
            async () => {
                return await adultService.fetchActivityTypes();
            },
            (data) => setAvailableActivityTypes(data as ActivityType[]),
            (_err) => { }
        );
    };

    // Add adult activity
    const handleAddAdultActivity = async (adulteId: string, activiteId: string) => {
        setLoadingAdults(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'insert',
                    payload: {
                        adulte_id: adulteId,
                        activite_id: activiteId,
                        user_id: userId
                    },
                    contextDescription: `Ajout tâche adulte`
                });
                setShowAdultModal(false);
                toast.success("Tâche ajoutée (hors-ligne)");
                return;
            }

            await adultService.addActivity(adulteId, activiteId, userId || '');

            setShowAdultModal(false);
            fetchAdultTracking();
            toast.success("Action enregistrée");
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        } finally {
            setLoadingAdults(false);
        }
    };

    // Delete adult suivi
    const handleDeleteAdultSuivi = async (id: string) => {
        try {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'delete',
                    payload: null,
                    match: { id },
                    contextDescription: "Suppression tâche"
                });
                setAdultActivities(prev => prev.filter(p => p.id !== id));
                toast.success("Suppression en file d'attente");
                return;
            }

            await adultService.deleteSuivi(id);
            fetchAdultTracking();
            toast.success("Retiré");
        } catch (error) {
            toast.error("Erreur");
        }
    };

    // Load data on mount
    useEffect(() => {
        fetchAdultTracking();
        fetchAllAdults();
        fetchActivityTypes();
    }, []);

    return {
        states: {
            adultActivities,
            allAdults,
            availableActivityTypes,
            showAdultModal,
            loadingAdults,
            currentAdultSelection,
            currentActivityTypeSelection
        },
        actions: {
            setShowAdultModal,
            setCurrentAdultSelection,
            setCurrentActivityTypeSelection,
            handleAddAdultActivity,
            handleDeleteAdultSuivi
        }
    };
}
