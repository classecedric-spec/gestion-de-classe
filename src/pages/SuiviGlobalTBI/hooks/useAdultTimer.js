import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { fetchWithCache } from '../../../lib/offline';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

/**
 * useAdultTracking - Hook pour le suivi des adultes
 */
export const useAdultTracking = () => {
    const { isOnline, addToQueue } = useOfflineSync();

    const [allAdults, setAllAdults] = useState([]);
    const [activeAdults, setActiveAdults] = useState([]);
    const [adultActivities, setAdultActivities] = useState([]);
    const [availableActivityTypes, setAvailableActivityTypes] = useState([]);
    const [showTaskSelectorFor, setShowTaskSelectorFor] = useState(null);

    const fetchAllAdults = useCallback(async () => {
        await fetchWithCache(
            'all_adults',
            async () => {
                const { data, error } = await supabase.from('Adulte').select('*').order('nom');
                if (error) throw error;
                return data || [];
            },
            setAllAdults
        );
    }, []);

    const fetchActivityTypes = useCallback(async () => {
        await fetchWithCache(
            'activity_types_adult',
            async () => {
                const { data, error } = await supabase.from('TypeActiviteAdulte').select('*').order('label');
                if (error) throw error;
                return data || [];
            },
            setAvailableActivityTypes
        );
    }, []);

    const fetchAdultTracking = useCallback(async () => {
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
            setAdultActivities
        );
    }, []);

    const handleAddAdultToView = useCallback((adultId) => {
        if (!adultId) return;
        const adult = allAdults.find(a => a.id === adultId);
        if (adult && !activeAdults.find(a => a.id === adultId)) {
            setActiveAdults(prev => [...prev, adult]);
        }
    }, [allAdults, activeAdults]);

    const handleRemoveAdultFromView = useCallback((adultId) => {
        setActiveAdults(prev => prev.filter(a => a.id !== adultId));
    }, []);

    const handleAddTaskEntry = useCallback(async (adulteId, typeActiviteId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'insert',
                    payload: { adulte_id: adulteId, activite_id: typeActiviteId, user_id: userId },
                    contextDescription: `Ajout tâche adulte`
                });
                setShowTaskSelectorFor(null);
                return;
            }

            const { error } = await supabase
                .from('SuiviAdulte')
                .insert([{ adulte_id: adulteId, activite_id: typeActiviteId, user_id: userId }]);

            if (error) throw error;
            setShowTaskSelectorFor(null);
            fetchAdultTracking();
            toast.success("Tâche ajoutée");
        } catch (error) {
            toast.error("Erreur: " + error.message);
        }
    }, [isOnline, addToQueue, fetchAdultTracking]);

    const handleDeleteTaskEntry = useCallback(async (id) => {
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
                toast.success("Suppression mise en file d'attente");
                return;
            }

            const { error } = await supabase.from('SuiviAdulte').delete().eq('id', id);
            if (error) throw error;
            fetchAdultTracking();
            toast.success("Retiré");
        } catch (error) {
            toast.error("Erreur");
        }
    }, [isOnline, addToQueue, fetchAdultTracking]);

    useEffect(() => {
        fetchAllAdults();
        fetchActivityTypes();
        fetchAdultTracking();
    }, []);

    return {
        allAdults,
        activeAdults,
        adultActivities,
        availableActivityTypes,
        showTaskSelectorFor,
        setShowTaskSelectorFor,
        handleAddAdultToView,
        handleRemoveAdultFromView,
        handleAddTaskEntry,
        handleDeleteTaskEntry
    };
};

/**
 * useTimer - Hook pour la gestion du timer
 */
export const useTimer = () => {
    const [timerMinutes, setTimerMinutes] = useState(5);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showTimerConfig, setShowTimerConfig] = useState(false);

    const playTimerSound = useCallback(() => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 2);
    }, []);

    useEffect(() => {
        let interval;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timerActive && timeLeft === 0) {
            setTimerActive(false);
            playTimerSound();
            toast.success("Timer terminé !");
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft, playTimerSound]);

    const startTimer = useCallback(() => {
        const totalSeconds = (timerMinutes * 60) + timerSeconds;
        if (totalSeconds > 0) {
            setTimeLeft(totalSeconds);
            setTimerActive(true);
            setShowTimerConfig(false);
        }
    }, [timerMinutes, timerSeconds]);

    const stopTimer = useCallback(() => {
        setTimerActive(false);
    }, []);

    const resetTimer = useCallback(() => {
        setTimerActive(false);
        setTimeLeft(0);
    }, []);

    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timerMinutes, setTimerMinutes,
        timerSeconds, setTimerSeconds,
        timerActive, timeLeft,
        showTimerConfig, setShowTimerConfig,
        startTimer, stopTimer, resetTimer, formatTime
    };
};
