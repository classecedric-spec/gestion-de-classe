/**
 * Encrypted Photo Cache Manager
 * Stores photos locally in IndexedDB with AES encryption
 * Reduces bandwidth by caching photos and only refetching when changed
 */

import CryptoJS from 'crypto-js';

const DB_NAME = 'PhotoCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

/**
 * Initialize IndexedDB
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

/**
 * Get encryption key from localStorage
 * Key is persistent across sessions for better caching
 * Generated once per browser and stored securely
 */
const getEncryptionKey = () => {
    let key = localStorage.getItem('photo-cache-key');

    if (!key) {
        // Generate a new persistent key
        key = CryptoJS.lib.WordArray.random(256 / 8).toString();
        localStorage.setItem('photo-cache-key', key);
    }

    return key;
};

/**
 * Encrypt photo data
 */
const encryptPhoto = (base64Photo) => {
    try {
        const key = getEncryptionKey();
        return CryptoJS.AES.encrypt(base64Photo, key).toString();
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
};

/**
 * Decrypt photo data
 */
const decryptPhoto = (encryptedPhoto) => {
    try {
        const key = getEncryptionKey();
        const bytes = CryptoJS.AES.decrypt(encryptedPhoto, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
};

/**
 * Get cached photo if hash matches
 * @param {string} id - Student or user ID
 * @param {string} hash - MD5 hash of current photo
 * @returns {Promise<string|null>} - Decrypted base64 photo or null
 */
export const getCachedPhoto = async (id, hash) => {
    if (!id || !hash) return null;

    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const result = request.result;

                // Check if cached photo exists and hash matches
                if (result && result.hash === hash) {
                    const decrypted = decryptPhoto(result.encryptedPhoto);
                    resolve(decrypted);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
};

/**
 * Cache a photo with encryption
 * @param {string} id - Student or user ID
 * @param {string} base64Photo - Base64 encoded photo
 * @param {string} hash - MD5 hash of photo
 */
export const setCachedPhoto = async (id, base64Photo, hash) => {
    if (!id || !base64Photo || !hash) return;

    try {
        const encrypted = encryptPhoto(base64Photo);
        if (!encrypted) return;

        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const cacheEntry = {
            id,
            encryptedPhoto: encrypted,
            hash,
            timestamp: Date.now()
        };

        store.put(cacheEntry);
    } catch (error) {
        console.error('Cache write error:', error);
    }
};

/**
 * Clear all cached photos
 */
export const clearPhotoCache = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        return true;
    } catch (error) {
        console.error('Cache clear error:', error);
        return false;
    }
};

/**
 * Get cache statistics
 * @returns {Promise<{count: number, estimatedSize: number}>}
 */
export const getCacheStats = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();

        return new Promise((resolve) => {
            countRequest.onsuccess = () => {
                // Estimate size (each encrypted photo ~10-15 KB)
                const count = countRequest.result;
                const estimatedSize = count * 12 * 1024; // 12 KB average

                resolve({ count, estimatedSize });
            };
            countRequest.onerror = () => resolve({ count: 0, estimatedSize: 0 });
        });
    } catch (error) {
        console.error('Cache stats error:', error);
        return { count: 0, estimatedSize: 0 };
    }
};

/**
 * Delete a specific cached photo
 * @param {string} id - Student or user ID
 */
export const deleteCachedPhoto = async (id) => {
    if (!id) return;

    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
    } catch (error) {
        console.error('Cache delete error:', error);
    }
};

/**
 * Clear cache on logout (optional)
 * Note: Cache can persist across sessions for better performance
 * Only call this if you want to force-clear for privacy reasons
 */
export const clearCacheOnLogout = () => {
    // Optional: Only clear if user explicitly wants to
    const autoClear = localStorage.getItem('photo-cache-auto-clear');
    if (autoClear === 'true') {
        clearPhotoCache();
    }
};

/**
 * Check if caching is enabled
 */
export const isCacheEnabled = () => {
    const enabled = localStorage.getItem('photo-cache-enabled');
    return enabled !== 'false'; // Enabled by default
};

/**
 * Enable/disable caching
 */
export const setCacheEnabled = (enabled) => {
    localStorage.setItem('photo-cache-enabled', enabled ? 'true' : 'false');
    if (!enabled) {
        clearPhotoCache();
    }
};
