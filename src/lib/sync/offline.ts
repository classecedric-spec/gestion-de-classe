/**
 * Offline Data Manager
 * Currently uses localStorage. Could be upgraded to IndexedDB for larger datasets.
 */

const STORAGE_PREFIX = 'gc_offline_';

/**
 * Save data to local storage cache
 */
export const saveToCache = <T>(key: string, data: T): void => {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
        localStorage.setItem(STORAGE_PREFIX + key + '_ts', Date.now().toString());
    } catch (error) {
        console.error(`Offline cache save error (${key}):`, error);
    }
};

/**
 * Retrieve data from local storage cache
 */
export const getFromCache = <T>(key: string): T | null => {
    try {
        const data = localStorage.getItem(STORAGE_PREFIX + key);
        if (!data) return null;
        return JSON.parse(data) as T;
    } catch (error) {
        console.error(`Offline cache read error (${key}):`, error);
        return null;
    }
};

/**
 * Get the timestamp of the last cache update
 */
export const getCacheTimestamp = (key: string): string | null => {
    return localStorage.getItem(STORAGE_PREFIX + key + '_ts');
};

/**
 * Higher-order function to wrap data fetching with offline fallback
 * @param {string} key - Unique cache key
 * @param {Function} fetchFn - Async function that returns data
 * @param {Function} setData - State setter function
 * @param {Function} onError - Optional error handler
 */
export const fetchWithCache = async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    setData: (data: T) => void,
    onError?: (error: unknown, isFromCache: boolean) => void
): Promise<void> => {
    try {
        // Try network first
        const data = await fetchFn();
        setData(data);
        saveToCache(key, data);
    } catch (error) {
        // Fallback to cache
        const cachedData = getFromCache<T>(key);
        if (cachedData) {
            setData(cachedData);
            if (onError) onError(error, true); // true indicates "served from cache"
        } else {
            // No cache available
            if (onError) onError(error, false);
        }
    }
};
