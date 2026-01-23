/**
 * Image Compression Utility
 * Compresses images to reduce file size and dimensions
 * Target: 100x100px max, 10KB max for profile photos
 */

/**
 * Compress a base64 image to target size and dimensions
 * @param {string} base64String - Base64 encoded image (with or without data URI prefix)
 * @param {number} maxWidth - Maximum width in pixels (default: 100)
 * @param {number} maxHeight - Maximum height in pixels (default: 100)
 * @param {number} targetSizeKB - Target size in KB (default: 10)
 * @returns {Promise<string>} - Compressed base64 image with data URI prefix
 */
export const compressImage = async (
    base64String: string,
    maxWidth: number = 100,
    maxHeight: number = 100,
    targetSizeKB: number = 10
): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            // Create image element
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;

                const aspectRatio = width / height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        width = maxWidth;
                        height = width / aspectRatio;
                    } else {
                        height = maxHeight;
                        width = height * aspectRatio;
                    }
                }

                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get 2D context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Try WebP first (best compression)
                let quality = 0.9;
                let compressed = canvas.toDataURL('image/webp', quality);

                // If WebP not supported or still too large, use JPEG with iterative quality reduction
                const targetSizeBytes = targetSizeKB * 1024;
                let attempts = 0;
                const maxAttempts = 10;

                while (getBase64Size(compressed) > targetSizeBytes && attempts < maxAttempts) {
                    quality -= 0.1;
                    if (quality < 0.1) quality = 0.1;

                    // Try WebP first, fallback to JPEG
                    compressed = canvas.toDataURL('image/webp', quality);
                    if (getBase64Size(compressed) > targetSizeBytes) {
                        compressed = canvas.toDataURL('image/jpeg', quality);
                    }

                    attempts++;
                }

                resolve(compressed);
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Handle base64 with or without data URI prefix
            if (base64String.startsWith('data:')) {
                img.src = base64String;
            } else {
                img.src = `data:image/jpeg;base64,${base64String}`;
            }
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Get the size of a base64 string in bytes
 * @param {string} base64String - Base64 encoded string
 * @returns {number} - Size in bytes
 */
const getBase64Size = (base64String: string): number => {
    // Remove data URI prefix if present
    const base64 = base64String.split(',')[1] || base64String;

    // Calculate size: (base64 length * 3/4) - padding
    const padding = (base64.match(/=/g) || []).length;
    return (base64.length * 3) / 4 - padding;
};

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted string (e.g., "5.2 KB")
 */
export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if an image needs compression
 * @param {string} base64String - Base64 encoded image
 * @param {number} maxSizeKB - Maximum size in KB
 * @returns {boolean} - True if compression needed
 */
export const needsCompression = (base64String: string, maxSizeKB: number = 10): boolean => {
    if (!base64String) return false;
    const sizeBytes = getBase64Size(base64String);
    return sizeBytes > maxSizeKB * 1024;
};
