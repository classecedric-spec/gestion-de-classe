import { Tables } from '../../../types/supabase';

/**
 * Type definitions for Tracking feature
 */

export type ProgressionWithDetails = Tables<'Progression'> & {
    eleve: {
        id: string;
        prenom: string | null;
        nom: string | null;
    } | null;
    activite: (Tables<'Activite'> & {
        Module: (Tables<'Module'> & {
            SousBranche: {
                branche_id: string | null;
            } | null;
        }) | null;
    }) | null;
    is_suivi: boolean | null;
};

export type StudentBasicInfo = {
    id: string;
    prenom: string | null;
    nom: string | null;
};
