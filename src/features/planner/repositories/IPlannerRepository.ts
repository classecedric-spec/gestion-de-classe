/**
 * Nom du module/fichier : IPlannerRepository.ts
 * 
 * Données en entrée : N/A (Interface technique).
 * 
 * Données en sortie : N/A (Définit les contrats de données pour l'emploi du temps).
 * 
 * Objectif principal : Définir le "Contrat technique" pour la gestion du planning hebdomadaire. Cette interface liste toutes les capacités que doit posséder le système pour lire, créer, modifier ou supprimer un créneau horaire dans l'agenda de l'enseignant.
 * 
 * Ce que ça affiche : Rien (c'est une structure purement technique).
 */

import { TablesInsert } from '../../../types/supabase';

/**
 * STRUCTURE D'UN CRÉNEAU DE PLANNING :
 * Représente une "case" dans l'emploi du temps (ex: lundi, 8h30, Maths).
 */
export interface WeeklyPlanningItem {
    id: string;
    day_of_week: string;   // Jour de la semaine (Lundi, Mardi...)
    period_index: number;  // Position dans la journée (1er cours, 2ème...)
    activity_title: string; // Ce qu'on fait (ex: "Calcul Mental")
    color_code?: string;   // Couleur pour l'affichage visuel
    duration: number;      // Durée en minutes
    week_start_date: string; // Identifiant de la semaine concernée
    user_id?: string;
    matiere_principale?: string;
    date_fin?: string;
    niveaux?: string[];    // Niveaux concernés (ex: CE1, CE2)
}

/**
 * INTERFACE DU RÉPERTOIRE DE PLANNING :
 * Liste les missions que le système de stockage doit savoir accomplir.
 */
export interface IPlannerRepository {
    /**
     * LECTURE : Récupérer tout le programme d'une semaine précise.
     */
    getPlanningForWeek(weekStartDate: string): Promise<WeeklyPlanningItem[]>;

    /**
     * CRÉATION : Ajouter une nouvelle activité à l'agenda.
     */
    createPlanningItem(item: TablesInsert<'weekly_planning'>): Promise<WeeklyPlanningItem>;

    /**
     * MODIFICATION : Changer l'heure, le titre ou la couleur d'un créneau existant.
     */
    updatePlanningItem(id: string, updates: Partial<TablesInsert<'weekly_planning'>>): Promise<void>;

    /**
     * SUPPRESSION : Retirer un créneau du planning.
     */
    deletePlanningItem(id: string): Promise<void>;
}

/**
 * LOGIGRAMME DE RÉFÉRENCE :
 * 
 * 1. L'application veut afficher le planning du 15 au 21 mars.
 * 2. Elle demande au dépôt (Repository) : `getPlanningForWeek("2026-03-15")`.
 * 3. Le dépôt renvoie une liste d'objets `WeeklyPlanningItem`.
 * 4. Si l'enseignant déplace un cours, l'application appelle `updatePlanningItem` avec les nouvelles coordonnées.
 */
