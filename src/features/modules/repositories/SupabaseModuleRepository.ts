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
            .order('ordre', { foreignTable: 'Activite', ascending: true }) // Ensure activities are returned
            .single();

        if (error) throw error;

        // Ensure we return the same shape as getAllModulesWithDetails
        return {
            ...data,
            ...calculateModuleProgress(data)
        };
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

        // Cascade date update to Progressions
        if (data.date_fin) {
            // 1. Get activities for this module
            const { data: activities, error: actError } = await supabase
                .from('Activite')
                .select('id')
                .eq('module_id', id);

            if (actError) {
                return;
            }

            if (activities && activities.length > 0) {
                const activityIds = activities.map(a => a.id);

                // 2. Update Progressions
                // We update date_limite for ALL progressions linked to these activities
                const { error: progError } = await supabase
                    .from('Progression')
                    .update({ date_limite: data.date_fin })
                    .in('activite_id', activityIds);

                if (progError) {
                    console.error("Error cascading date update to progressions:", progError);
                }
            }
        }
    }

    async getDetailedLateActivities(classId: string): Promise<any[]> {
        // Calculate last Friday (W-1)
        const today = new Date();
        const day = today.getDay() || 7; // 1 (Mon) to 7 (Sun)
        const monday = new Date(today);
        monday.setDate(today.getDate() - (day - 1));
        const lastFriday = new Date(monday);
        lastFriday.setDate(monday.getDate() - 3);
        lastFriday.setHours(23, 59, 59, 999);

        const lastFridayISO = lastFriday.toISOString().split('T')[0];

        // Complex select query including all necessary joins
        const { data, error } = await supabase
            .from('Progression')
            .select(`
                *,
                Eleve:eleve_id!inner (
                    id, nom, prenom, photo_url, classe_id,
                    Niveau:niveau_id (
                        nom, ordre
                    )
                ),
                Activite:activite_id!inner (
                    titre,
                    Module:module_id!inner (
                        nom, date_fin, statut,
                        SousBranche:sous_branche_id (
                            nom, ordre,
                            Branche:branche_id (
                                nom, ordre
                            )
                        )
                    )
                )
            `)
            .not('etat', 'in', '("termine","verifie")')
            .eq('Eleve.classe_id', classId)
            .eq('Activite.Module.statut', 'en_cours')
            .lte('Activite.Module.date_fin', lastFridayISO);

        if (error) throw error;

        // Post-filtering and sorting since PostgREST filter on joined tables can be tricky if not properly configured on server
        // But the requirement says "SQL unique, performante et réactive".
        // In Supabase, filtering on joined tables (one-to-many or many-to-one) is possible via dot notation if the relations are well defined.

        return (data || []).map((item: any) => ({
            ...item,
            // Flatten slightly for easier use in components if needed, or keep nested structure
        }));
    }
}
