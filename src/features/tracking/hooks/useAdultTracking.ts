import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

export interface Adult {
    id: string;
    nom: string;
    prenom: string;
}

export interface ActivityType {
    id: string;
    label: string;
    user_id?: string;
    created_at?: string;
}

export interface AdultActivity {
    id: string;
    adulte_id: string;
    activite_id: string;
    user_id: string | null;
    created_at: string;
    Adulte?: Adult | null;
    TypeActiviteAdulte?: ActivityType | null;
}

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
            (data) => setAdultActivities(data as AdultActivity[]),
            (_err) => { }
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
            (data) => setAllAdults(data as Adult[]),
            (_err) => { }
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
