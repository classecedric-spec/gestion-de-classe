/**
 * Utility to resize an image and convert it to a Base64 string.
 * @param {File} file - The image file to process.
 * @param {number} width - The target width (default 100).
 * @param {number} height - The target height (default 100).
 * @param {number} quality - The image quality (0 to 1, default 0.8).
 * @returns {Promise<string>} - A promise that resolves with the Base64 string.
 */
export const resizeAndConvertToBase64 = (file: File, width: number = 100, height: number = 100, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event: ProgressEvent<FileReader>) => {
            if (!event.target?.result) {
                reject(new Error('Failed to read file'));
                return;
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Clear canvas to ensure transparency for PNGs
                ctx.clearRect(0, 0, width, height);

                // Draw image on canvas with resizing
                ctx.drawImage(img, 0, 0, width, height);

                // Get the base64 string, preserving format if it's a PNG
                const fileType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(fileType, quality);
                resolve(dataUrl);
            };
            img.onerror = (error) => {
                reject(error);
            };
        };
        reader.onerror = (error) => {
            reject(error);
        };
    });
};

// Alias for backward compatibility
export const resizeImage = resizeAndConvertToBase64;

