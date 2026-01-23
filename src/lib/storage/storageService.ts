/**
 * Centralized Storage Service for Supabase Storage operations
 * 
 * This service provides a unified interface for uploading, retrieving,
 * and deleting files from Supabase Storage buckets.
 * 
 * @module storageService
 */

import { supabase } from '../database';

export interface UploadOptions {
    /** Target bucket name (default: 'photos') */
    bucket?: string;
    /** Content type of the file */
    contentType?: string;
    /** Whether to overwrite existing files */
    upsert?: boolean;
}

export interface UploadResult {
    success: boolean;
    publicUrl: string | null;
    error: string | null;
    path: string | null;
}

/**
 * Storage service for centralized file operations
 */
export const storageService = {
    /**
     * Upload a base64 encoded image to Supabase Storage
     * 
     * @param folder - Folder path within the bucket (e.g., 'eleve', 'classe')
     * @param entityId - Unique identifier for the file naming
     * @param base64Data - Base64 encoded image data (with data URI prefix)
     * @param options - Upload options
     * @returns Upload result with public URL or error
     * 
     * @example
     * ```typescript
     * const result = await storageService.uploadImage('eleve', 'abc-123', base64String);
     * if (result.success) {
     *   console.log('Uploaded to:', result.publicUrl);
     * }
     * ```
     */
    uploadImage: async (
        folder: string,
        entityId: string,
        base64Data: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> => {
        const {
            bucket = 'photos',
            contentType = 'image/jpeg',
            upsert = true
        } = options;

        try {
            // Validate input
            if (!base64Data || !base64Data.startsWith('data:image')) {
                return {
                    success: false,
                    publicUrl: null,
                    error: 'Invalid base64 image data',
                    path: null
                };
            }

            // Convert base64 to Blob
            const response = await fetch(base64Data);
            const blob = await response.blob();

            // Generate unique filename
            const timestamp = Date.now();
            const fileName = `${folder}/${entityId}_${timestamp}.jpg`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, blob, {
                    contentType,
                    upsert
                });

            if (uploadError) {
                console.error('[StorageService] Upload error:', uploadError);
                return {
                    success: false,
                    publicUrl: null,
                    error: uploadError.message,
                    path: null
                };
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return {
                success: true,
                publicUrl,
                error: null,
                path: fileName
            };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[StorageService] Unexpected error:', error);
            return {
                success: false,
                publicUrl: null,
                error: message,
                path: null
            };
        }
    },

    /**
     * Delete a file from Supabase Storage
     * 
     * @param path - Full path to the file (e.g., 'eleve/abc-123_1234567890.jpg')
     * @param bucket - Bucket name (default: 'photos')
     * @returns True if deletion was successful
     */
    deleteFile: async (path: string, bucket: string = 'photos'): Promise<boolean> => {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) {
                console.error('[StorageService] Delete error:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[StorageService] Unexpected delete error:', error);
            return false;
        }
    },

    /**
     * Get a signed URL for temporary access to a private file
     * 
     * @param path - Full path to the file
     * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
     * @param bucket - Bucket name (default: 'photos')
     * @returns Signed URL or null on error
     */
    getSignedUrl: async (
        path: string,
        expiresIn: number = 3600,
        bucket: string = 'photos'
    ): Promise<string | null> => {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.error('[StorageService] Signed URL error:', error);
                return null;
            }

            return data.signedUrl;
        } catch (error) {
            console.error('[StorageService] Unexpected signed URL error:', error);
            return null;
        }
    },

    /**
     * List files in a folder
     * 
     * @param folder - Folder path to list
     * @param bucket - Bucket name (default: 'photos')
     * @returns Array of file objects or empty array on error
     */
    listFiles: async (folder: string, bucket: string = 'photos') => {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .list(folder, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) {
                console.error('[StorageService] List error:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('[StorageService] Unexpected list error:', error);
            return [];
        }
    }
};

export default storageService;
