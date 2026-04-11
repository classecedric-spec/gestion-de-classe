/**
 * Utility functions for the application
 */

import { StatusKey } from './statusHelpers';

/**
 * Get initials from a student/user object
 * @param {any} person - Object with prenom and nom properties
 * @returns {string} - Initials (e.g., "JD" for Jean Dupont)
 */
export const getInitials = (person: { prenom?: string | null; nom?: string | null } | null | undefined): string => {
    if (!person) return '';
    return (person.prenom?.[0] || '') + (person.nom?.[0] || '');
};

/**
 * Calculate age from a date string
 * @param {string | null | undefined} dateString - Date of birth in ISO format
 * @returns {string} - Age in years (e.g., "8 ans") or 'N/A'
 */
export const calculateAge = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return `${age} ans`;
};

/**
 * Format a date in French locale
 * @param {string|Date|null|undefined} date - Date to format
 * @param {Intl.DateTimeFormatOptions} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDateFR = (
    date: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' }
): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', options);
};

/**
 * Format a date as short French format (DD/MM)
 * @param {string|Date|null|undefined} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateShort = (date: string | Date | null | undefined): string => {
    return formatDateFR(date, { day: '2-digit', month: '2-digit' });
};

/**
 * Get status color classes based on progression status
 * @param {string} status - Status string ('termine', 'besoin_d_aide', 'en_cours', etc.)
 * @returns {string} Tailwind CSS classes
 */
export const getStatusColorClasses = (status: string | null | undefined): string => {
    switch (status as StatusKey) {
        case 'termine':
            return 'bg-success text-white border-success';
        case 'besoin_d_aide':
            return 'bg-grey-medium text-white border-grey-medium';
        case 'ajustement':
            return 'bg-amber-accent text-black border-amber-accent';
        case 'en_cours':
            return 'bg-primary/20 text-primary border-primary';
        case 'a_domicile':
            return 'bg-danger text-white border-danger';
        default:
            return 'bg-surface/50 text-grey-medium border-white/5';
    }
};

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Capitalize first letter of a string
 * @param {string | null | undefined} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalize = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generate a unique ID
 * @returns {string} - Unique ID string
 */
export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
};

/**
 * Detect if the user is on a mobile phone (not tablet)
 * @returns {boolean} - True if mobile phone, false otherwise
 */
export const isMobilePhone = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera;
    // Check for mobile phones specifically (excludes tablets like iPad)
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    // Also check screen width for extra safety (phones are typically < 768px)
    const isSmallScreen = window.innerWidth < 768;
    return isMobile && isSmallScreen;
};
