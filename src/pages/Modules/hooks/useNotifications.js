import { useState, useCallback } from 'react';

/**
 * useNotifications
 * Simple notification management with auto-dismiss
 * 
 * @returns {object} Notification state and actions
 */
export function useNotifications() {
    const [notification, setNotification] = useState(null);

    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const dismissNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return {
        notification,
        showNotification,
        dismissNotification
    };
}
