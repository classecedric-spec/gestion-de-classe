import { supabase } from '../../../lib/database';
import { IModuleRepository } from './IModuleRepository';
import { calculateModuleProgress, ModuleWithRelations } from '../../../pages/Modules/utils/moduleHelpers';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export class SupabaseModuleRepository implements IModuleRepository {
    private readonly selectQuery = `
                *,
                SousBranche:sous_branche_id (
                    id,
                    nom,
                    branche_id,
                    ordre,
                    Branche:branche_id (
                        id,
                        nom,
                        ordre
                    )
                ),
                Activite (
                    *,
                    ActiviteNiveau (
                        *,
                        Niveau (*)
                    ),
                    ActiviteMateriel (
                        TypeMateriel (
                            acronyme
                        )
                    ),
                    Progression (etat)
                )
            `;

    async getAllModulesWithDetails(): Promise<ModuleWithRelations[]> {
        const { data, error } = await supabase
            .from('Module')
            .select(this.selectQuery)
            .order('nom')
            .order('ordre', { foreignTable: 'Activite', ascending: true });

        if (error) throw error;

        // Calculate progress for each module
        return (data || []).map((m: any) => ({
            ...m,
            ...calculateModuleProgress(m)
        }));
    }

    async getModuleWithDetails(moduleId: string): Promise<any> {
        const { data, error } = await supabase
            .from('Module')
            .select(this.selectQuery)
            .eq('id', moduleId)
            .single();

        if (error) throw error;
        return data;
    }

    async deleteModule(moduleId: string): Promise<void> {
        const { error } = await supabase.from('Module').delete().eq('id', moduleId);
        if (error) throw error;
    }

    async updateModuleStatus(moduleId: string, newStatus: string): Promise<void> {
        const { error } = await supabase.from('Module').update({ statut: newStatus }).eq('id', moduleId);
        if (error) throw error;
    }

    async getActiveModules(): Promise<any[]> {
        const { data } = await supabase
            .from('Module')
            .select('*, SousBranche(id, nom, ordre, Branche(id, nom, ordre))')
            .eq('statut', 'en_cours');
        return data || [];
    }

    async getBranches(): Promise<Tables<'Branche'>[]> {
        const { data } = await supabase.from('Branche').select('*').order('ordre');
        return data || [];
    }

    async createModule(data: TablesInsert<'Module'>): Promise<Tables<'Module'>> {
        const { data: created, error } = await supabase
            .from('Module')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return created;
    }

    async updateModule(id: string, data: TablesUpdate<'Module'>): Promise<void> {
        const { error } = await supabase
            .from('Module')
            .update(data)
            .eq('id', id);

        if (error) throw error;
    }
}
