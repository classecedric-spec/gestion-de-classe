import DOMPurify from 'dompurify';

/**
 * Utility for sanitizing HTML content to prevent XSS attacks.
 * Wraps DOMPurify with default safe configurations.
 * 
 * @param html - The untrusted HTML string to sanitize
 * @returns A safe, sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [] // No attributes allowed for maximum safety by default
    }) as string;
};

/**
 * Specialized sanitizer for attributes (e.g. mailto links)
 * Ensures no javascript: or other dangerous protocols are used.
 */
export const sanitizeUrl = (url: string): string => {
    const sanitized = DOMPurify.sanitize(url);
    if (sanitized.startsWith('javascript:') || sanitized.startsWith('data:')) {
        return '';
    }
    return sanitized;
};
