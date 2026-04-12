/**
 * Nom du module/fichier : plannerService.ts
 * 
 * Données en entrée : Dates de semaine, objets de créneaux horaires.
 * 
 * Données en sortie : Données de planning formatées.
 * 
 * Objectif principal : Agir comme le "Chef d'Orchestre" pour l'emploi du temps hebdomadaire. Ce service fait le pont entre l'interface utilisateur (les composants React) et le stockage des données (le Repository). Il s'assure que les ordres de l'enseignant (ajouter un cours, supprimer un créneau) sont correctement transmis au système de sauvegarde.
 * 
 * Ce que ça coordonne : 
 *   - La récupération de l'emploi du temps pour une semaine donnée.
 *   - L'enregistrement de nouvelles activités.
 *   - La mise à jour et la suppression de créneaux.
 */

import { IPlannerRepository, WeeklyPlanningItem } from '../repositories/IPlannerRepository';
import { SupabasePlannerRepository } from '../repositories/SupabasePlannerRepository';
import { TablesInsert } from '../../../types/supabase';

/**
 * Service gérant la logique métier du planning.
 */
export class PlannerService {
    // Le service a besoin d'un "répertoire" (repository) pour lire et écrire les données
    constructor(private repository: IPlannerRepository) { }

    /**
     * RÉCUPÉRATION : Demande au répertoire de fournir le programme de la semaine.
     */
    async getPlanningForWeek(weekStartDate: string, userId: string): Promise<WeeklyPlanningItem[]> {
        return await this.repository.getPlanningForWeek(weekStartDate, userId);
    }

    /**
     * AJOUT : Demande au répertoire de sauvegarder une nouvelle case dans l'agenda.
     */
    async createPlanningItem(item: TablesInsert<'weekly_planning'>): Promise<WeeklyPlanningItem> {
        return await this.repository.createPlanningItem(item);
    }

    /**
     * MODIFICATION : Demande au répertoire de mettre à jour un cours existant.
     */
    async updatePlanningItem(id: string, updates: Partial<TablesInsert<'weekly_planning'>>): Promise<void> {
        await this.repository.updatePlanningItem(id, updates);
    }

    /**
     * SUPPRESSION : Demande au répertoire de retirer un cours.
     */
    async deletePlanningItem(id: string): Promise<void> {
        await this.repository.deletePlanningItem(id);
    }
}

/**
 * EXPORTATION : On crée une instance unique du service prête à l'emploi avec Supabase.
 */
export const plannerService = new PlannerService(new SupabasePlannerRepository());

/**
 * LOGIGRAMME DE COHÉSION :
 * 
 * 1. UTILISATEUR -> Clique sur "Ajouter une activité" dans l'agenda.
 * 2. COMPOSANT -> Appelle `plannerService.createPlanningItem(données)`.
 * 3. SERVICE -> Vérifie l'ordre et le transmet au `repository`.
 * 4. REPOSITORY -> Communique avec la base de données (Supabase).
 * 5. RETOUR -> L'activité apparaît dans l'agenda de l'utilisateur.
 */
