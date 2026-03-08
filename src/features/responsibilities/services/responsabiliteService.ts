import { supabase } from '../../../lib/database';

export interface Responsabilite {
    id: string;
    titre: string;
    user_id: string;
    created_at: string;
}

export interface ResponsabiliteEleve {
    id: string;
    responsabilite_id: string;
    eleve_id: string;
    user_id: string;
    created_at: string;
}

export interface ResponsabiliteWithEleves extends Responsabilite {
    eleves: {
        id: string;
        eleve_id: string;
        eleve: {
            id: string;
            nom: string;
            prenom: string;
            photo_url: string | null;
        }
    }[];
}

export const responsabiliteService = {
    /**
     * Fetch all responsibilities for a user, including assigned students
     */
    async getResponsibilities(userId: string): Promise<ResponsabiliteWithEleves[]> {
        const { data, error } = await supabase
            .from('Responsabilite')
            .select(`
                *,
                eleves:ResponsabiliteEleve(
                    id,
                    eleve_id,
                    eleve:Eleve(id, nom, prenom, photo_url)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new responsibility
     */
    async createResponsibility(userId: string, titre: string): Promise<Responsabilite> {
        const { data, error } = await supabase
            .from('Responsabilite')
            .insert({ titre, user_id: userId })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a responsibility
     */
    async deleteResponsibility(id: string): Promise<void> {
        const { error } = await supabase
            .from('Responsabilite')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Assign a student to a responsibility
     */
    async assignStudent(userId: string, responsabiliteId: string, eleveId: string): Promise<void> {
        const { error } = await supabase
            .from('ResponsabiliteEleve')
            .insert({
                responsabilite_id: responsabiliteId,
                eleve_id: eleveId,
                user_id: userId
            });

        if (error) throw error;
    },

    /**
     * Assign multiple students to a responsibility
     */
    async assignStudents(userId: string, responsabiliteId: string, eleveIds: string[]): Promise<void> {
        if (!eleveIds.length) return;

        const inserts = eleveIds.map(eleveId => ({
            responsabilite_id: responsabiliteId,
            eleve_id: eleveId,
            user_id: userId
        }));

        const { error } = await supabase
            .from('ResponsabiliteEleve')
            .insert(inserts);

        if (error) throw error;
    },

    /**
     * Unassign a student from a responsibility
     */
    async unassignStudent(assignmentId: string): Promise<void> {
        const { error } = await supabase
            .from('ResponsabiliteEleve')
            .delete()
            .eq('id', assignmentId);

        if (error) throw error;
    }
};
