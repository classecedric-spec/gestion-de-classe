import { supabase } from '../../../lib/database';
import { TablesUpdate } from '../../../types/supabase';
import { IClassRepository } from './IClassRepository';
import { ClassWithAdults, StudentWithRelations } from '../services/classService';

export class SupabaseClassRepository implements IClassRepository {
    async getClasses(): Promise<ClassWithAdults[]> {
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
    }

    async getStudentsByClass(classId: string): Promise<StudentWithRelations[]> {
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
    }

    async deleteClass(classId: string): Promise<void> {
        const { error } = await supabase
            .from('Classe')
            .delete()
            .eq('id', classId);
        if (error) throw error;
    }

    async removeStudentFromClass(studentId: string): Promise<void> {
        const { error } = await supabase
            .from('Eleve')
            .update({ classe_id: null } as TablesUpdate<'Eleve'>)
            .eq('id', studentId);
        if (error) throw error;
    }

    async updateStudentField(studentId: string, field: keyof TablesUpdate<'Eleve'>, value: any): Promise<void> {
        const { error } = await supabase
            .from('Eleve')
            .update({ [field]: value } as TablesUpdate<'Eleve'>)
            .eq('id', studentId);
        if (error) throw error;
    }

    async createClass(data: any): Promise<{ id: string }> {
        // Get the authenticated user's ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch the Adulte record for the current user
        const { data: adulte, error: adulteError } = await supabase
            .from('Adulte')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (adulteError || !adulte) {
            throw new Error('No Adulte record found for current user. Please create an adult profile first.');
        }

        const { data: newClass, error } = await supabase
            .from('Classe')
            .insert({
                ...data,
                titulaire_id: adulte.id  // Use Adulte.id instead of auth.uid()
            })
            .select()
            .single();
        if (error) throw error;
        return { id: newClass.id };
    }

    async updateClass(classId: string, data: any): Promise<void> {
        const { error } = await supabase
            .from('Classe')
            .update(data)
            .eq('id', classId);
        if (error) throw error;
    }

    async linkAdult(classId: string, adultId: string, role: string): Promise<void> {
        const { error } = await supabase
            .from('ClasseAdulte')
            .insert([{ classe_id: classId, adulte_id: adultId, role }]);
        if (error) throw error;
    }

    async unlinkAllAdults(classId: string): Promise<void> {
        const { error } = await supabase
            .from('ClasseAdulte')
            .delete()
            .eq('classe_id', classId);
        if (error) throw error;
    }

    async uploadLogo(classId: string, photoBlob: Blob): Promise<string | null> {
        const fileName = `classe/${classId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('photos').upload(fileName, photoBlob, { upsert: true });
        if (error) {
            console.error("Upload failed", error);
            return null;
        }
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        return publicUrl;
    }
}
