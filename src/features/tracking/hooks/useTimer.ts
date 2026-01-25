import { useState, useEffect, useCallback } from 'react';

export interface TimerState {
    active: boolean;
    timeLeft: number;
    duration: number;
    message?: string;
}

/**
 * useTimer - Custom hook to manage countdown timer logic.
 */
export function useTimer() {
    const [timer, setTimer] = useState<TimerState>({
        active: false,
        duration: 0,
        timeLeft: 0,
        message: ''
    });
    const [timerFinished, setTimerFinished] = useState(false);
    const [showTimerModal, setShowTimerModal] = useState(false);

    useEffect(() => {
        if (!timer.active) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev.timeLeft <= 1) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setTimerFinished(true);
                        if ('vibrate' in navigator) {
                            navigator.vibrate([200, 100, 200]);
                        }
                    }, 0);
                    return { ...prev, timeLeft: 0, active: false };
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timer.active]);

    const startTimer = useCallback((duration: number, message: string) => {
        setTimer({
            active: true,
            duration,
            timeLeft: duration,
            message
        });
        setShowTimerModal(false);
    }, []);

    const closeTimerFinished = useCallback(() => {
        setTimerFinished(false);
        setTimer(prev => ({ ...prev, message: '' }));
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timer,
        timerFinished,
        showTimerModal,
        setShowTimerModal,
        startTimer,
        closeTimerFinished,
        formatTime,
        setTimer,
        setTimerFinished
    };
}
