/**
 * Nom du module/fichier : SupabasePlannerRepository.ts
 * 
 * Données en entrée : Identifiants de base de données, objets de planning.
 * 
 * Données en sortie : Données brutes provenant de la table 'weekly_planning' de Supabase.
 * 
 * Objectif principal : Réaliser les opérations réelles de stockage (Lecture/Écriture) dans la base de données Supabase pour le module Planning. Ce fichier est le "bras armé" technique qui exécute les ordres définis dans l'interface `IPlannerRepository`.
 * 
 * Ce que ça fait : 
 *   - Se connecte à la table `weekly_planning`.
 *   - Filtre les données par date de début de semaine.
 *   - Gère les erreurs de base de données.
 */

import { supabase } from '../../../lib/database';
import { IPlannerRepository, WeeklyPlanningItem } from './IPlannerRepository';
import { TablesInsert } from '../../../types/supabase';

/**
 * Implémentation concrète du répertoire pour Supabase.
 */
export class SupabasePlannerRepository implements IPlannerRepository {
    /**
     * LECTURE : Va chercher tous les créneaux d'une semaine précise.
     */
    async getPlanningForWeek(weekStartDate: string): Promise<WeeklyPlanningItem[]> {
        const { data } = await supabase
            .from('weekly_planning')
            .select('*')
            .eq('week_start_date', weekStartDate);
        
        // On renvoie la liste trouvée, ou un tableau vide s'il n'y a rien
        return (data as WeeklyPlanningItem[]) || [];
    }

    /**
     * CRÉATION : Enregistre une nouvelle activité dans l'emploi du temps.
     */
    async createPlanningItem(item: TablesInsert<'weekly_planning'>): Promise<WeeklyPlanningItem> {
        const { data, error } = await supabase
            .from('weekly_planning')
            .insert([item])
            .select() // On demande à Supabase de nous renvoyer l'objet créé (avec son ID)
            .single();

        if (error) throw error;
        return data as WeeklyPlanningItem;
    }

    /**
     * MODIFICATION : Met à jour les détails d'un créneau (ex: changement d'heure ou de titre).
     */
    async updatePlanningItem(id: string, updates: Partial<TablesInsert<'weekly_planning'>>): Promise<void> {
        const { error } = await supabase
            .from('weekly_planning')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * SUPPRESSION : Efface définitivement un créneau.
     */
    async deletePlanningItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('weekly_planning')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. APPEL -> Une fonction demande `getPlanningForWeek`.
 * 2. REQUÊTE -> Le code envoie un message à Supabase : "Donne-moi les lignes de 'weekly_planning' où la date est XXX".
 * 3. RÉCEPTION -> Supabase répond avec les données.
 * 4. TRADUCTION -> Le code transforme ces données en objets `WeeklyPlanningItem` compréhensibles par le reste du programme.
 * 5. RETOUR -> Le résultat est affiché dans l'agenda à l'écran.
 */
