/**
 * Returns the application base URL.
 * When running on localhost, it returns the local network IP address to allow
 * external devices (like tablets) to connect via QR codes.
 */
export const getAppBaseUrl = (): string => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Auto-detected network IP based on user request for tablet testing
    // This allows the QR code to be scanned by a device on the same network
    if (isLocalhost) {
        return 'http://192.168.0.244:5173';
    }

    return window.location.origin;
};
