import { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { fetchWithCache } from '../../../lib/sync';
// @ts-ignore
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';
import { Tables } from '../../../types/supabase';
import { adultService } from '../../../features/adults/services/adultService';
import { activityTypeService } from '../../../features/activities/services/activityTypeService';
import { getCurrentUser } from '../../../lib/database';

/**
 * useAdultTracking - Hook pour le suivi des adultes
 */
export const useAdultTracking = () => {
    const { isOnline, addToQueue } = useOfflineSync();

    const [allAdults, setAllAdults] = useState<Tables<'Adulte'>[]>([]);
    const [activeAdults, setActiveAdults] = useState<Tables<'Adulte'>[]>([]);
    const [adultActivities, setAdultActivities] = useState<any[]>([]); // Defines complex join type
    const [availableActivityTypes, setAvailableActivityTypes] = useState<Tables<'TypeActiviteAdulte'>[]>([]);
    const [showTaskSelectorFor, setShowTaskSelectorFor] = useState<string | null>(null);

    const fetchAllAdults = useCallback(async () => {
        const user = await getCurrentUser();
        if (!user) return;

        await fetchWithCache(
            'all_adults',
            async () => {
                return await adultService.fetchAdults(user.id);
            },
            setAllAdults
        );
    }, []);

    const fetchActivityTypes = useCallback(async () => {
        const user = await getCurrentUser();
        if (!user) return;

        await fetchWithCache(
            'activity_types_adult',
            async () => {
                return await activityTypeService.fetchAdultTypes(user.id);
            },
            setAvailableActivityTypes
        );
    }, []);

    const fetchAdultTracking = useCallback(async () => {
        const user = await getCurrentUser();
        if (!user) return;

        await fetchWithCache(
            'adult_tracking_today',
            async () => {
                return await adultService.fetchTrackingToday(user.id);
            },
            setAdultActivities
        );
    }, []);

    const handleAddAdultToView = useCallback((adultId: string) => {
        if (!adultId) return;
        const adult = allAdults.find(a => a.id === adultId);
        if (adult && !activeAdults.find(a => a.id === adultId)) {
            setActiveAdults(prev => [...prev, adult]);
        }
    }, [allAdults, activeAdults]);

    const handleRemoveAdultFromView = useCallback((adultId: string) => {
        setActiveAdults(prev => prev.filter(a => a.id !== adultId));
    }, []);

    const handleAddTaskEntry = useCallback(async (adulteId: string, typeActiviteId: string) => {
        try {
            const user = await getCurrentUser();
            const userId = user?.id;
            if (!userId) return;

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

            await adultService.addActivity(adulteId, typeActiviteId, userId);

            setShowTaskSelectorFor(null);
            fetchAdultTracking();
            toast.success("Tâche ajoutée");
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        }
    }, [isOnline, addToQueue, fetchAdultTracking]);

    const handleDeleteTaskEntry = useCallback(async (id: string) => {
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

            await adultService.deleteSuivi(id);
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
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
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
        let interval: NodeJS.Timeout;
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

    const formatTime = useCallback((seconds: number) => {
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
