import { useState } from 'react';

/**
 * useTimerIntegration
 * Manages timer display and modal state
 * 
 * @param {object} timer - Timer state from parent { active, timeLeft, duration, message }
 * @returns {object} Timer integration state and actions
 */
export function useTimerIntegration(timer) {
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    /**
     * Format seconds to MM:SS
     * @param {number} seconds 
     * @returns {string}
     */
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        states: {
            showTimerModal,
            isFullScreen,
            timer
        },
        actions: {
            setShowTimerModal,
            setIsFullScreen,
            formatTime
        }
    };
}
