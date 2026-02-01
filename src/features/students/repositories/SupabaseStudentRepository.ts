import { supabase } from '../../../lib/database';
import { fetchDelta } from '../../../lib/sync';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IStudentRepository } from './IStudentRepository';

export class SupabaseStudentRepository implements IStudentRepository {
    async findById(id: string): Promise<Tables<'Eleve'> | null> {
        const { data, error } = await supabase
            .from('Eleve')
            .select('id, nom, prenom, photo_url, sex, date_naissance, niveau_id, classe_id, titulaire_id, importance_suivi, trust_trend, updated_at')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Tables<'Eleve'> | null;
    }

    async findAll(): Promise<Tables<'Eleve'>[]> {
        const { data, error } = await supabase
            .from('Eleve')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    async create(student: TablesInsert<'Eleve'>): Promise<Tables<'Eleve'>> {
        const { data, error } = await supabase
            .from('Eleve')
            .insert(student)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id: string, student: TablesUpdate<'Eleve'>): Promise<Tables<'Eleve'>> {
        const { data, error } = await supabase
            .from('Eleve')
            .update(student)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('Eleve')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async getLinkedGroupIds(studentId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('groupe_id')
            .eq('eleve_id', studentId);

        if (error) throw error;
        return data ? data.map(g => g.groupe_id as string) : [];
    }

    // Helper to get raw links if needed for deletion by ID, but interface just exposes business need.
    // Actually for efficient deletion we might need the link IDs.
    // Let's add a specialized method or keep it simple.
    async getStudentGroupLinks(studentId: string): Promise<{ id: string, groupe_id: string }[]> {
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('id, groupe_id')
            .eq('eleve_id', studentId);

        if (error) throw error;
        return data || [];
    }

    async linkToGroup(studentId: string, groupId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('EleveGroupe').insert({
            eleve_id: studentId,
            groupe_id: groupId,
            user_id: userId
        });
        if (error) throw error;
    }

    async unlinkFromGroup(linkId: string): Promise<void> {
        const { error } = await supabase
            .from('EleveGroupe')
            .delete()
            .eq('id', linkId);
        if (error) throw error;
    }

    async unlinkMultiFromGroup(linkIds: string[]): Promise<void> {
        if (linkIds.length === 0) return;
        const { error } = await supabase
            .from('EleveGroupe')
            .delete()
            .in('id', linkIds);
        if (error) throw error;
    }

    async findByClass(classId: string): Promise<Tables<'Eleve'>[]> {
        const { data, error } = await supabase
            .from('Eleve')
            .select('id, nom, prenom, photo_url, sex, niveau_id, importance_suivi, trust_trend')
            .eq('classe_id', classId)
            .order('nom');

        if (error) throw error;
        return data as Tables<'Eleve'>[] || [];
    }

    async findByGroup(groupId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                Niveau (nom, ordre),
                EleveGroupe!inner(groupe_id)
            `)
            .eq('EleveGroupe.groupe_id', groupId)
            .order('prenom');

        if (error) throw error;
        return data || [];
    }

    async findByGroups(groupIds: string[]): Promise<any[]> {
        if (groupIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                id, prenom, nom, niveau_id, trust_trend, EleveGroupe!inner(groupe_id)
            `)
            .in('EleveGroupe.groupe_id', groupIds);

        if (error) throw error;
        return data || [];
    }

    async findAllForTeacher(teacherId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                Classe (
                    nom,
                    ClasseAdulte (
                        role,
                        Adulte (id, nom, prenom)
                    )
                ),
                Niveau (nom, ordre),
                EleveGroupe (
                    Groupe (id, nom)
                )
            `)
            .eq('titulaire_id', teacherId)
            .order('nom', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async updateImportance(id: string, importance: number | null): Promise<void> {
        const { error } = await supabase
            .from('Eleve')
            .update({ importance_suivi: importance })
            .eq('id', id);

        if (error) throw error;
    }

    async getStudentsDelta(teacherId: string): Promise<{ delta: any[], isFirstSync: boolean }> {
        const { delta, isFirstSync } = await fetchDelta(
            'Eleve',
            'id, nom, prenom, photo_url, photo_hash, sex, date_naissance, niveau_id, classe_id, updated_at, trust_trend, Niveau(nom, ordre), Classe(nom)',
            { titulaire_id: teacherId }
        );
        return { delta, isFirstSync };
    }
}
