import { supabase } from '../../../lib/supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export const studentService = {
    /**
     * Récupère toutes les classes
     */
    getClasses: async (): Promise<Tables<'Classe'>[]> => {
        const { data, error } = await supabase.from('Classe').select('*');
        if (error) throw error;
        return data ? data.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')) : [];
    },

    /**
     * Récupère tous les groupes
     */
    getGroups: async (): Promise<Tables<'Groupe'>[]> => {
        const { data, error } = await supabase.from('Groupe').select('*');
        if (error) throw error;
        return data ? data.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')) : [];
    },

    /**
     * Récupère tous les niveaux
     */
    getLevels: async (): Promise<Tables<'Niveau'>[]> => {
        const { data, error } = await supabase.from('Niveau').select('*');
        if (error) throw error;
        return data ? data.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)) : [];
    },

    /**
     * Récupère un élève par son ID
     */
    getStudent: async (id: string): Promise<Tables<'Eleve'> | null> => {
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Récupère les IDs des groupes liés à un élève
     */
    getStudentGroupIds: async (studentId: string): Promise<string[]> => {
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('groupe_id')
            .eq('eleve_id', studentId);
        if (error) throw error;
        return data ? data.map(g => g.groupe_id as string) : [];
    },

    /**
     * Sauvegarde (Création ou Mise à jour) d'un élève et de ses groupes
     */
    saveStudent: async (
        studentData: TablesInsert<'Eleve'> | TablesUpdate<'Eleve'>,
        groupIds: string[],
        userId: string,
        isEdit = false,
        editId: string | null = null
    ): Promise<string> => {
        let studentId = editId;

        // 1. Insert or Update Student
        if (isEdit && editId) {
            const { error } = await supabase
                .from('Eleve')
                .update(studentData as TablesUpdate<'Eleve'>)
                .eq('id', editId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from('Eleve')
                .insert(studentData as TablesInsert<'Eleve'>)
                .select()
                .single();
            if (error) throw error;
            studentId = data.id;
        }

        if (!studentId) throw new Error("Student ID could not be determined");

        // 2. Manage Groups (Sync)
        // Fetch current links to minimize deletions/insertions
        const { data: currentLinks, error: fetchError } = await supabase
            .from('EleveGroupe')
            .select('id, groupe_id')
            .eq('eleve_id', studentId);

        if (fetchError) throw fetchError;

        const currentLinkedGroupIds = currentLinks?.map(l => l.groupe_id) || [];
        const groupsToAdd = groupIds.filter(id => !currentLinkedGroupIds.includes(id));
        const groupsToRemove = currentLinkedGroupIds.filter(id => !groupIds.includes(id));

        // Add new links
        if (groupsToAdd.length > 0) {
            const toInsert = groupsToAdd.map(gid => ({
                eleve_id: studentId as string,
                groupe_id: gid,
                user_id: userId
            }));
            const { error: addErr } = await supabase.from('EleveGroupe').insert(toInsert);
            if (addErr) throw addErr;
        }

        // Remove old links
        if (groupsToRemove.length > 0) {
            const linkIdsToRemove = currentLinks
                ?.filter(link => groupsToRemove.includes(link.groupe_id))
                .map(link => link.id) || [];

            if (linkIdsToRemove.length > 0) {
                const { error: delErr } = await supabase
                    .from('EleveGroupe')
                    .delete()
                    .in('id', linkIdsToRemove);
                if (delErr) throw delErr;
            }
        }

        return studentId;
    }
};
