/**
 * Nom du module/fichier : SupabaseActivityRepository.ts
 * 
 * Données en entrée : Requêtes de données (ID, filtres) ou objets à enregistrer (activités, liens matériel).
 * 
 * Données en sortie : Données brutes issues de la base de données Supabase (lignes de tables).
 * 
 * Objectif principal : Être le "traducteur" technique entre l'application et la base de données réelle. C'est ici que l'on écrit les requêtes SQL (via le client Supabase) pour lire, créer, modifier ou supprimer physiquement les activités, leurs photos et leurs réglages.
 * 
 * Ce que ça affiche : Rien. C'est un composant de bas niveau (accès aux données).
 */

import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IActivityRepository, ActivityWithRelations } from './IActivityRepository';

/**
 * Implémentation concrète du contrat IActivityRepository pour la base de données Supabase.
 */
export class SupabaseActivityRepository implements IActivityRepository {
    async getModule(id: string): Promise<{ nom: string } | null> {
        const { data, error } = await supabase
            .from('Module')
            .select('nom')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as { nom: string } | null;
    }

    async getMaterialTypes(): Promise<Tables<'TypeMateriel'>[]> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .select('*')
            .order('nom');
        if (error) throw error;
        return data || [];
    }

    async getActivityMaterials(activityId: string): Promise<{ type_materiel_id: string }[]> {
        const { data, error } = await supabase
            .from('ActiviteMateriel')
            .select('type_materiel_id')
            .eq('activite_id', activityId);
        if (error) throw error;
        return data || [];
    }

    async createMaterialType(name: string, userId: string): Promise<Tables<'TypeMateriel'>> {
        const { data, error } = await supabase
            .from('TypeMateriel')
            .insert([{
                nom: name,
                user_id: userId
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateMaterialType(id: string, name: string): Promise<void> {
        const { error } = await supabase
            .from('TypeMateriel')
            .update({ nom: name })
            .eq('id', id);
        if (error) throw error;
    }

    async deleteMaterialType(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeMateriel')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async getLevels(): Promise<Tables<'Niveau'>[]> {
        const { data, error } = await supabase
            .from('Niveau')
            .select('*')
            .order('ordre');
        if (error) throw error;
        return data || [];
    }

    async getActivityLevels(activityId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('ActiviteNiveau')
            .select(`
                *,
                Niveau (nom)
            `)
            .eq('activite_id', activityId);
        if (error) throw error;
        return data || [];
    }

    async createActivity(dataToSave: TablesInsert<'Activite'>): Promise<Tables<'Activite'>> {
        const { data, error } = await supabase
            .from('Activite')
            .insert([dataToSave])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async createActivities(dataToSave: TablesInsert<'Activite'>[]): Promise<Tables<'Activite'>[]> {
        const { data, error } = await supabase
            .from('Activite')
            .insert(dataToSave)
            .select();
        if (error) throw error;
        return data || [];
    }

    async getActivityCount(moduleId: string): Promise<number> {
        const { count, error } = await supabase
            .from('Activite')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', moduleId);

        if (error) throw error;
        return count || 0;
    }

    async getMaxActivityOrder(moduleId: string): Promise<number> {
        const { data, error } = await supabase
            .from('Activite')
            .select('ordre')
            .eq('module_id', moduleId)
            .order('ordre', { ascending: false })
            .limit(1);

        if (error) throw error;
        return data?.[0]?.ordre || 0;
    }

    async updateActivity(id: string, data: TablesUpdate<'Activite'>): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .update(data)
            .eq('id', id);
        if (error) throw error;
    }

    async upsertActivities(data: TablesInsert<'Activite'>[]): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .upsert(data, { onConflict: 'id' });
        if (error) throw error;
    }

    /**
     * Suppression sécurisée : on doit d'abord supprimer tous les liens (progrès, niveaux, matériel) 
     * avant de pouvoir supprimer l'activité elle-même pour respecter l'intégrité de la base.
     */
    async deleteActivity(id: string): Promise<void> {
        // 1. Supprime l'historique des passages des élèves (Progression)
        const { error: errorProg } = await supabase
            .from('Progression')
            .delete()
            .eq('activite_id', id);
        if (errorProg) throw errorProg;

        // 2. Supprime les réglages par niveau scolaire
        const { error: errorLevels } = await supabase
            .from('ActiviteNiveau')
            .delete()
            .eq('activite_id', id);
        if (errorLevels) throw errorLevels;

        // 3. Supprime les liens avec le matériel requis
        const { error: errorMat } = await supabase
            .from('ActiviteMateriel')
            .delete()
            .eq('activite_id', id);
        if (errorMat) throw errorMat;

        // 4. Enfin, supprime l'activité elle-même
        const { error } = await supabase
            .from('Activite')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    /**
     * Requête complexe : récupère la liste des activités en incluant automatiquement 
     * les noms des modules et les détails des réglages par niveau.
     */
    async getActivities(): Promise<ActivityWithRelations[]> {
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                Module (nom, statut),
                ActiviteNiveau (
                    *,
                    Niveau (nom, ordre)
                )
            `)
            .order('titre');

        if (error) throw error;
        return (data || []) as unknown as ActivityWithRelations[];
    }

    async clearActivityMaterials(activityId: string): Promise<void> {
        const { error } = await supabase.from('ActiviteMateriel').delete().eq('activite_id', activityId);
        if (error) throw error;
    }

    async addActivityMaterials(links: TablesInsert<'ActiviteMateriel'>[]): Promise<void> {
        const { error } = await supabase.from('ActiviteMateriel').insert(links);
        if (error) throw error;
    }

    async clearActivityLevels(activityId: string): Promise<void> {
        const { error } = await supabase.from('ActiviteNiveau').delete().eq('activite_id', activityId);
        if (error) throw error;
    }

    async addActivityLevels(links: TablesInsert<'ActiviteNiveau'>[]): Promise<void> {
        const { error } = await supabase.from('ActiviteNiveau').insert(links);
        if (error) throw error;
    }

    async updateActivityField(id: string, field: string, value: any): Promise<void> {
        const { error } = await supabase
            .from('Activite')
            .update({ [field]: value } as any)
            .eq('id', id);
        if (error) throw error;
    }

    async updateActivityLevelField(id: string, field: string, value: any): Promise<void> {
        const { error } = await supabase
            .from('ActiviteNiveau')
            .update({ [field]: value } as any)
            .eq('id', id);
        if (error) throw error;
    }

    async getCustomActivities(): Promise<Tables<'custom_activities'>[]> {
        const { data, error } = await supabase
            .from('custom_activities')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createCustomActivity(title: string, userId: string): Promise<Tables<'custom_activities'>> {
        const { data, error } = await supabase
            .from('custom_activities')
            .insert([{ title, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteCustomActivity(id: string): Promise<void> {
        const { error } = await supabase
            .from('custom_activities')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 1. Une fonction du service (ex: `getActivities`) appelle ce dépôt.
 * 2. Le dépôt prépare la requête de sélection ou d'insertion.
 * 3. Il contacte le serveur distant Supabase via une connexion sécurisée.
 * 4. Il attend le résultat du serveur.
 * 5. Si une erreur survient (réseau, droits d'accès), il lève une exception.
 * 6. Si tout va bien, il retourne les lignes de données brutes.
 */
