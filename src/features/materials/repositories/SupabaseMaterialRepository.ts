import { supabase } from '../../../lib/database';
import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IMaterialRepository, TypeMateriel, MaterialActivity } from './IMaterialRepository';

/**
 * Supabase implementation of the Material Repository
 */
export class SupabaseMaterialRepository implements IMaterialRepository {

    async getAll(): Promise<TypeMateriel[]> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    async getLinkedActivities(materialId: string): Promise<MaterialActivity[]> {
        const { data, error } = await supabase
            .from('ActiviteMateriel')
            .select(`
        activite_id,
        Activite:activite_id (
          id,
          titre,
          Module:module_id (nom),
          ActiviteMateriel (
            TypeMateriel (
              id,
              nom,
              acronyme
            )
          )
        )
      `)
            .eq('type_materiel_id', materialId);

        if (error) throw error;

        // Extract activities from the join and filter nulls
        const activities = (data as any[])?.map(item => item.Activite).filter(Boolean) || [];

        return activities;
    }

    async create(materialData: TablesInsert<'TypeMateriel'>): Promise<TypeMateriel> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .insert([materialData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id: string, materialData: TablesUpdate<'TypeMateriel'>): Promise<TypeMateriel> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .update(materialData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
