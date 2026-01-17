import { supabase } from '../../../lib/supabaseClient';

export const classService = {
    /**
     * Récupère toutes les classes avec les adultes référents
     */
    getClasses: async () => {
        const { data, error } = await supabase
            .from('Classe')
            .select(`
                id, nom, acronyme, photo_base64, logo_url,
                ClasseAdulte (
                    role,
                    Adulte (id, nom, prenom)
                )
            `)
            .order('nom');

        if (error) throw error;
        return data || [];
    },

    /**
     * Récupère les élèves d'une classe spécifique
     */
    getStudentsByClass: async (classId) => {
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                id, nom, prenom, date_naissance, sex, photo_base64, photo_hash,
                Classe (nom),
                EleveGroupe (
                    Groupe (id, nom)
                )
            `)
            .eq('classe_id', classId)
            .order('nom');

        if (error) throw error;
        return data || [];
    },

    /**
     * Supprime une classe
     */
    deleteClass: async (classId) => {
        const { error } = await supabase
            .from('Classe')
            .delete()
            .eq('id', classId);
        if (error) throw error;
    },

    /**
     * Retire un élève de sa classe (met classe_id à null)
     */
    removeStudentFromClass: async (studentId) => {
        const { error } = await supabase
            .from('Eleve')
            .update({ classe_id: null })
            .eq('id', studentId);
        if (error) throw error;
    },

    /**
     * Met à jour un champ spécifique d'un élève
     */
    updateStudentField: async (studentId, field, value) => {
        const { error } = await supabase
            .from('Eleve')
            .update({ [field]: value })
            .eq('id', studentId);
        if (error) throw error;
    }
};
