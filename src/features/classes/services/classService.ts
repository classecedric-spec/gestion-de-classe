import { supabase } from '../../../lib/supabaseClient';
import { Tables, TablesUpdate } from '../../../types/supabase';

export interface ClassWithAdults extends Tables<'Classe'> {
    ClasseAdulte: {
        role: string | null;
        Adulte: {
            id: string;
            nom: string | null;
            prenom: string | null;
        } | null;
    }[];
}

export interface StudentWithRelations extends Tables<'Eleve'> {
    Classe: {
        nom: string | null;
    } | null;
    EleveGroupe: {
        Groupe: {
            id: string;
            nom: string | null;
        } | null;
    }[];
}

export const classService = {
    /**
     * Récupère toutes les classes avec les adultes référents
     */
    getClasses: async (): Promise<ClassWithAdults[]> => {
        const { data, error } = await supabase
            .from('Classe')
            .select(`
                *,
                ClasseAdulte (
                    role,
                    Adulte (id, nom, prenom)
                )
            `)
            .order('nom');

        if (error) throw error;
        return (data as any) || [];
    },

    /**
     * Récupère les élèves d'une classe spécifique
     */
    getStudentsByClass: async (classId: string): Promise<StudentWithRelations[]> => {
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                Classe (nom),
                EleveGroupe (
                    Groupe (id, nom)
                )
            `)
            .eq('classe_id', classId)
            .order('nom');

        if (error) throw error;
        return (data as any) || [];
    },

    /**
     * Supprime une classe
     */
    deleteClass: async (classId: string): Promise<void> => {
        const { error } = await supabase
            .from('Classe')
            .delete()
            .eq('id', classId);
        if (error) throw error;
    },

    /**
     * Retire un élève de sa classe (met classe_id à null)
     */
    removeStudentFromClass: async (studentId: string): Promise<void> => {
        const { error } = await supabase
            .from('Eleve')
            .update({ classe_id: null } as TablesUpdate<'Eleve'>)
            .eq('id', studentId);
        if (error) throw error;
    },

    /**
     * Met à jour un champ spécifique d'un élève
     */
    updateStudentField: async (studentId: string, field: keyof TablesUpdate<'Eleve'>, value: any): Promise<void> => {
        const { error } = await supabase
            .from('Eleve')
            .update({ [field]: value } as TablesUpdate<'Eleve'>)
            .eq('id', studentId);
        if (error) throw error;
    }
};
