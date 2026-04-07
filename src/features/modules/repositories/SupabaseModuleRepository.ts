/**
 * Nom du module/fichier : SupabaseModuleRepository.ts
 * 
 * Données en entrée : 
 *   - Requêtes vers les tables 'Module', 'Activite', 'Progression', 'Eleve'.
 *   - Identifiants de classe ou de module.
 * 
 * Données en sortie : 
 *   - Les modules avec tous leurs détails (activités, matériel, progression des élèves).
 *   - Liste des activités en retard.
 * 
 * Objectif principal : Assurer la communication réelle entre l'application et la base de données Supabase pour tout ce qui concerne les parcours pédagogiques (Modules). Il construit des requêtes complexes "en cascade" pour récupérer, en un seul voyage, toutes les informations nécessaires (ex: un module + ses activités + le matériel requis pour chaque activité).
 * 
 * Ce que ça affiche : Rien (technique pure).
 */

import { supabase } from '../../../lib/database';
import { IModuleRepository } from './IModuleRepository';
import { calculateModuleProgress, ModuleWithRelations } from '../../../pages/Modules/utils/moduleHelpers';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export class SupabaseModuleRepository implements IModuleRepository {
    /**
     * LANGAGE DE REQUÊTE (selectQuery) :
     * C'est la liste de course géante que l'on donne à la base de données.
     * On ne demande pas juste le module, on demande :
     * - La sous-matière et sa matière parente.
     * - Toutes les activités liées.
     * - Pour chaque activité : les niveaux concernés, le matériel nécessaire et l'état d'avancement des élèves.
     */
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
                    Progression (eleve_id, etat)
                )
            `;

    /**
     * LECTURE DE TOUS LES MODULES :
     * Récupère la liste complète et calcule pour chacun le pourcentage de réussite globale.
     */
    async getAllModulesWithDetails(): Promise<ModuleWithRelations[]> {
        const { data, error } = await supabase
            .from('Module')
            .select(this.selectQuery)
            .order('nom')
            .order('ordre', { foreignTable: 'Activite', ascending: true });

        if (error) throw error;

        return (data || []).map((m: any) => ({
            ...m,
            ...calculateModuleProgress(m)
        }));
    }

    /**
     * LECTURE D'UN MODULE PRÉCIS :
     * Identique à la lecture globale, mais pour un seul identifiant.
     */
    async getModuleWithDetails(moduleId: string): Promise<any> {
        const { data, error } = await supabase
            .from('Module')
            .select(this.selectQuery)
            .eq('id', moduleId)
            .order('ordre', { foreignTable: 'Activite', ascending: true })
            .single();

        if (error) throw error;

        return {
            ...data,
            ...calculateModuleProgress(data)
        };
    }

    /**
     * SUPPRESSION :
     * Retire le module de la base (les activités liées seront aussi supprimées par cascade).
     */
    async deleteModule(moduleId: string): Promise<void> {
        const { error } = await supabase.from('Module').delete().eq('id', moduleId);
        if (error) throw error;
    }

    /**
     * CHANGEMENT DE STATUT :
     * Permet de passer un module de "En cours" à "Terminé".
     */
    async updateModuleStatus(moduleId: string, newStatus: string): Promise<void> {
        const { error } = await supabase.from('Module').update({ statut: newStatus }).eq('id', moduleId);
        if (error) throw error;
    }

    /**
     * MODULES ACTIFS :
     * Récupère uniquement les modules sur lesquels les élèves travaillent actuellement.
     */
    async getActiveModules(): Promise<any[]> {
        const { data } = await supabase
            .from('Module')
            .select('*, SousBranche(id, nom, ordre, Branche(id, nom, ordre))')
            .eq('statut', 'en_cours');
        return data || [];
    }

    /**
     * RÉFÉRENTIELS :
     * Liste toutes les branches (Français, Maths, etc.) disponibles.
     */
    async getBranches(): Promise<Tables<'Branche'>[]> {
        const { data } = await supabase.from('Branche').select('*').order('ordre');
        return data || [];
    }

    /**
     * CRÉATION :
     * Enregistre un nouveau module.
     */
    async createModule(data: TablesInsert<'Module'>): Promise<Tables<'Module'>> {
        const { data: created, error } = await supabase
            .from('Module')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return created;
    }

    /**
     * MISE À JOUR ET CASCADE :
     * Modifie le module. Si la date de fin change, le programme met à jour 
     * automatiquement toutes les "dates limites" des activités des élèves.
     */
    async updateModule(id: string, data: TablesUpdate<'Module'>): Promise<void> {
        const { error } = await supabase
            .from('Module')
            .update(data)
            .eq('id', id);

        if (error) throw error;

        // Mise à jour en cascade des dates pour les élèves
        if (data.date_fin) {
            const { data: activities, error: actError } = await supabase
                .from('Activite')
                .select('id')
                .eq('module_id', id);

            if (!actError && activities && activities.length > 0) {
                const activityIds = activities.map(a => a.id);
                await supabase
                    .from('Progression')
                    .update({ date_limite: data.date_fin })
                    .in('activite_id', activityIds);
            }
        }
    }

    /**
     * SUIVI DES RETARDS :
     * Une requête très intelligente qui :
     * 1. Calcule la date du vendredi dernier.
     * 2. Trouve toutes les activités non terminées dont la date limite est passée.
     * 3. Récupère le nom de l'élève, sa photo, sa classe et le nom de l'activité.
     */
    async getDetailedLateActivities(classId: string): Promise<any[]> {
        const today = new Date();
        const day = today.getDay() || 7; 
        const monday = new Date(today);
        monday.setDate(today.getDate() - (day - 1));
        const lastFriday = new Date(monday);
        lastFriday.setDate(monday.getDate() - 3);
        lastFriday.setHours(23, 59, 59, 999);

        const lastFridayISO = lastFriday.toISOString().split('T')[0];

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
        return data || [];
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre son tableau de bord des Modules.
 * 2. ÉTAPE REQUÊTE : Le dépôt (Repository) lance la "Grosse Requête" qui ramène tout d'un coup.
 * 3. ÉTAPE ANALYSE : Pour chaque module reçu, le programme calcule le score moyen de la classe (grâce à `calculateModuleProgress`).
 * 4. ÉTAPE CASCADE : Si l'enseignant décide de prolonger un module d'une semaine, le dépôt met à jour le module ET change instantanément l'agenda de tous les élèves concernés.
 * 5. ÉTAPE ALERTES : Le dépôt surveille le calendrier et identifie les enfants qui n'ont pas fini leur travail pour vendredi dernier.
 */
