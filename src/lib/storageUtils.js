
import { supabase } from './supabaseClient';

const BUCKET_NAME = 'photos';

/**
 * Converts a Base64 string to a Blob object.
 * @param {string} base64 - Base64 string (with or without data URI prefix)
 * @returns {Blob}
 */
export const base64ToBlob = (base64) => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1] || parts[0]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
};

/**
 * Uploads a Base64 image to Supabase Storage.
 * @param {string} base64 - The image data
 * @param {string} filePath - Path in the bucket (e.g. 'eleve/id.jpg')
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export const uploadImageToStorage = async (base64, filePath) => {
    try {
        if (!base64 || !base64.startsWith('data:image/')) return null;

        const blob = base64ToBlob(base64);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                contentType: blob.type,
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image to storage:', error);
        return null;
    }
};

/**
 * Deletes an image from Supabase Storage.
 * @param {string} filePath - Path in the bucket
 */
export const deleteImageFromStorage = async (filePath) => {
    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting image from storage:', error);
    }
};
