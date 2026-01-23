/**
 * Storage utilities - Centralized exports
 * Handles image storage, compression, caching, and Supabase storage operations
 */

export { storageService } from './storageService';
export { compressImage, formatBytes, needsCompression } from './imageCompression';
export {
    getCachedPhoto,
    setCachedPhoto,
    clearPhotoCache,
    getCacheStats,
    deleteCachedPhoto,
    clearCacheOnLogout,
    isCacheEnabled,
    setCacheEnabled
} from './photoCache';
export * from './storageUtils';
export * from './imageUtils';
