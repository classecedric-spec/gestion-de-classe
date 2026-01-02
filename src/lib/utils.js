/**
 * Utility functions for the application
 */

/**
 * Get initials from a student/user object
 * @param {Object} person - Object with prenom and nom properties
 * @returns {string} - Initials (e.g., "JD" for Jean Dupont)
 */
export const getInitials = (person) => {
    if (!person) return '';
    return (person.prenom?.[0] || '') + (person.nom?.[0] || '');
};

/**
 * Calculate age from a date string
 * @param {string} dateString - Date of birth in ISO format
 * @returns {string} - Age in years (e.g., "8 ans") or 'N/A'
 */
export const calculateAge = (dateString) => {
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
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDateFR = (date, options = { day: '2-digit', month: 'long', year: 'numeric' }) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', options);
};

/**
 * Format a date as short French format (DD/MM)
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateShort = (date) => {
    return formatDateFR(date, { day: '2-digit', month: '2-digit' });
};

/**
 * Get status color classes based on progression status
 * @param {string} status - Status string ('termine', 'besoin_d_aide', 'en_cours', etc.)
 * @returns {string} - Tailwind CSS classes
 */
export const getStatusColorClasses = (status) => {
    switch (status) {
        case 'termine':
            return 'bg-success text-white border-success';
        case 'besoin_d_aide':
            return 'bg-[#A0A8AD] text-white border-[#A0A8AD]';
        case 'en_cours':
            return 'bg-primary/20 text-primary border-primary';
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
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generate a unique ID
 * @returns {string} - Unique ID string
 */
export const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
};
