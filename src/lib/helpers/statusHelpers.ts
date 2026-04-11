/**
 * statusHelpers.ts
 * Centralized status configuration and helper functions
 * Used across all progression/activity status displays
 */

import { Check, AlertCircle, ShieldCheck, Home, LucideIcon } from 'lucide-react';

export type StatusKey =
    | 'a_commencer'
    | 'en_cours'
    | 'besoin_d_aide'
    | 'a_domicile'
    | 'ajustement'
    | 'a_verifier'
    | 'termine';

export interface StatusDetail {
    color: string;
    textColor: string;
    icon: LucideIcon | null;
    label: string;
    shortLabel: string;
}

/**
 * Status configuration object
 * Single source of truth for all status-related styling and labels
 */
export const STATUS_CONFIG: Record<StatusKey, StatusDetail> = {
    a_commencer: {
        color: 'bg-white/10',
        textColor: 'text-grey-medium',
        icon: null,
        label: 'À commencer',
        shortLabel: 'À faire'
    },
    en_cours: {
        color: 'bg-primary',
        textColor: 'text-black',
        icon: null,
        label: 'En cours',
        shortLabel: 'En cours'
    },
    besoin_d_aide: {
        color: 'bg-gray-400',
        textColor: 'text-white',
        icon: AlertCircle,
        label: 'Besoin d\'aide',
        shortLabel: 'Aide'
    },
    a_domicile: {
        color: 'bg-danger',
        textColor: 'text-white',
        icon: Home,
        label: 'À domicile',
        shortLabel: 'Maison'
    },
    ajustement: {
        color: 'bg-amber-accent',
        textColor: 'text-black',
        icon: AlertCircle,
        label: '⚠️ Erreur > 1',
        shortLabel: '⚠️ E > 1'
    },
    a_verifier: {
        color: 'bg-violet-500',
        textColor: 'text-white',
        icon: ShieldCheck,
        label: 'À vérifier',
        shortLabel: 'À vérifier'
    },
    termine: {
        color: 'bg-success',
        textColor: 'text-white',
        icon: Check,
        label: 'Terminé',
        shortLabel: 'Fait'
    }
};

/**
 * Get the background color class for a status
 * @param {string} status - The status key
 * @returns {string} Tailwind CSS class
 */
export const getStatusStyle = (status: string): string => {
    return STATUS_CONFIG[status as StatusKey]?.color || STATUS_CONFIG.a_commencer.color;
};

/**
 * Get the text color class for a status
 * @param {string} status - The status key
 * @returns {string} Tailwind CSS class
 */
export const getStatusTextColor = (status: string): string => {
    return STATUS_CONFIG[status as StatusKey]?.textColor || STATUS_CONFIG.a_commencer.textColor;
};

/**
 * Get the icon component for a status
 * @param {string} status - The status key
 * @returns {LucideIcon | null} Lucide icon component or null
 */
export const getStatusIcon = (status: string): LucideIcon | null => {
    return STATUS_CONFIG[status as StatusKey]?.icon || null;
};

/**
 * Get the full label for a status
 * @param {string} status - The status key
 * @returns {string} Full label
 */
export const getStatusLabel = (status: string): string => {
    return STATUS_CONFIG[status as StatusKey]?.label || STATUS_CONFIG.a_commencer.label;
};

/**
 * Get the short label for a status (for compact displays)
 * @param {string} status - The status key
 * @returns {string} Short label
 */
export const getStatusShortLabel = (status: string): string => {
    return STATUS_CONFIG[status as StatusKey]?.shortLabel || STATUS_CONFIG.a_commencer.shortLabel;
};

/**
 * Status cycle order for manual clicking
 * a_commencer -> besoin_d_aide -> a_domicile -> ajustement -> termine -> a_commencer
 */
export const STATUS_CYCLE: StatusKey[] = ['a_commencer', 'besoin_d_aide', 'a_domicile', 'ajustement', 'termine'];

/**
 * Get the next status in the cycle
 * @param {string} currentStatus - Current status
 * @returns {string} Next status in cycle
 */
export const getNextStatus = (currentStatus: string): StatusKey => {
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus as StatusKey);
    if (currentIndex === -1) {
        // Unknown status, start from besoin_d_aide (first action after a_commencer)
        return 'besoin_d_aide';
    }
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    return STATUS_CYCLE[nextIndex];
};

/**
 * Valid statuses for filtering/validation
 */
export const VALID_STATUSES = Object.keys(STATUS_CONFIG) as StatusKey[];

/**
 * Normalize a status value
 * @param {string} status - Raw status value
 * @returns {StatusKey} Normalized status
 */
export const normalizeStatus = (status: string | null | undefined): StatusKey => {
    if (!status || !VALID_STATUSES.includes(status as StatusKey)) {
        return 'a_commencer';
    }
    return status as StatusKey;
};

/**
 * Statuses that count as "completed" for progress calculation
 */
export const COMPLETED_STATUSES: StatusKey[] = ['termine', 'a_verifier'];

/**
 * Check if a status is considered "completed"
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export const isCompletedStatus = (status: string): boolean => {
    return COMPLETED_STATUSES.includes(status as StatusKey);
};

/**
 * Statuses that appear in the help/tracking panel
 */
export const HELP_PANEL_STATUSES: StatusKey[] = ['besoin_d_aide', 'a_verifier', 'ajustement'];
