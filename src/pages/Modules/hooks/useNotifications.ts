import { useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationState {
    message: string;
    type: NotificationType;
}

/**
 * useNotifications
 * Simple notification management with auto-dismiss
 * 
 * @returns {object} Notification state and actions
 */
export function useNotifications() {
    const [notification, setNotification] = useState<NotificationState | null>(null);

    const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
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
