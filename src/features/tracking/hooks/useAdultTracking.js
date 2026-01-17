import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

/**
 * useAdultTracking
 * Manages adult activity tracking for today
 * 
 * @returns {object} Adult tracking state and actions
 */
export function useAdultTracking() {
    const { isOnline, addToQueue } = useOfflineSync();

    const [adultActivities, setAdultActivities] = useState([]);
    const [allAdults, setAllAdults] = useState([]);
    const [availableActivityTypes, setAvailableActivityTypes] = useState([]);
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [loadingAdults, setLoadingAdults] = useState(false);
    const [currentAdultSelection, setCurrentAdultSelection] = useState(null);
    const [currentActivityTypeSelection, setCurrentActivityTypeSelection] = useState(null);

    // Fetch adult tracking for today
    const fetchAdultTracking = async () => {
        await fetchWithCache(
            'adult_tracking_today',
            async () => {
                const today = new Date().toISOString().split('T')[0];
                const { data, error } = await supabase
                    .from('SuiviAdulte')
                    .select(`
                        *,
                        Adulte (id, nom, prenom),
                        TypeActiviteAdulte (id, label)
                    `)
                    .gte('created_at', today)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            },
            setAdultActivities,
            (err) => { }
        );
    };

    // Fetch all adults
    const fetchAllAdults = async () => {
        await fetchWithCache(
            'all_adults',
            async () => {
                const { data, error } = await supabase.from('Adulte').select('*').order('nom');
                if (error) throw error;
                return data || [];
            },
            setAllAdults,
            (err) => { }
        );
    };

    // Fetch activity types
    const fetchActivityTypes = async () => {
        await fetchWithCache(
            'activity_types_adult',
            async () => {
                const { data, error } = await supabase.from('TypeActiviteAdulte').select('*').order('label');
                if (error) throw error;
                return data || [];
            },
            setAvailableActivityTypes,
            (err) => { }
        );
    };

    // Add adult activity
    const handleAddAdultActivity = async (adulteId, activiteId) => {
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

            const { error } = await supabase
                .from('SuiviAdulte')
                .insert([{
                    adulte_id: adulteId,
                    activite_id: activiteId,
                    user_id: userId
                }]);

            if (error) throw error;
            setShowAdultModal(false);
            fetchAdultTracking();
            toast.success("Action enregistrée");
        } catch (error) {
            toast.error("Erreur: " + error.message);
        } finally {
            setLoadingAdults(false);
        }
    };

    // Delete adult suivi
    const handleDeleteAdultSuivi = async (id) => {
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

            const { error } = await supabase
                .from('SuiviAdulte')
                .delete()
                .eq('id', id);
            if (error) throw error;
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
