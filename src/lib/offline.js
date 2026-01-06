/**
 * Offline Data Manager
 * Currently uses localStorage. Could be upgraded to IndexedDB for larger datasets.
 */

const STORAGE_PREFIX = 'gc_offline_';

export const saveToCache = (key, data) => {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
        localStorage.setItem(STORAGE_PREFIX + key + '_ts', Date.now().toString());
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
};

export const getFromCache = (key) => {
    try {
        const data = localStorage.getItem(STORAGE_PREFIX + key);
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
};

export const getCacheTimestamp = (key) => {
    return localStorage.getItem(STORAGE_PREFIX + key + '_ts');
};

/**
 * Higher-order function to wrap data fetching with offline fallback
 * @param {string} key - Unique cache key
 * @param {Function} fetchFn - Async function that returns data
 * @param {Function} setData - State setter function
 * @param {Function} onError - Optional error handler
 */
export const fetchWithCache = async (key, fetchFn, setData, onError) => {
    try {
        // Try network first
        const data = await fetchFn();
        setData(data);
        saveToCache(key, data);
    } catch (error) {
        console.warn(`Network error for ${key}, falling back to cache.`, error);

        // Fallback to cache
        const cachedData = getFromCache(key);
        if (cachedData) {
            setData(cachedData);
            if (onError) onError(error, true); // true indicates "served from cache"
        } else {
            // No cache available
            if (onError) onError(error, false);
        }
    }
};
