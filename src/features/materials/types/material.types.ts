import { Tables } from '../../../types/supabase';

/**
 * Type definitions for Materials feature
 */

export type TypeMateriel = Tables<'TypeMateriel'>;

export interface MaterialActivity {
    id: string;
    titre: string;
    Module: { nom: string } | null;
    ActiviteMateriel: {
        TypeMateriel: {
            id: string;
            nom: string;
            acronyme: string | null;
        } | null;
    }[];
}
