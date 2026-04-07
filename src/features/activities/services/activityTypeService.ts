/**
 * Nom du module/fichier : activityTypeService.ts
 * 
 * Données en entrée : Aucune (demande de liste).
 * 
 * Données en sortie : Liste des types d'activités disponibles pour les adultes.
 * 
 * Objectif principal : Gérer la récupération des différents types d'activités (ex: "Sport", "Maths", "Réunion") spécifiquement pour les intervenants adultes.
 * 
 * Ce que ça affiche : Rien directement. C'est un service de données.
 */

import { IActivityTypeRepository } from '../../adults/repositories/IActivityTypeRepository';
import { SupabaseActivityTypeRepository } from '../../adults/repositories/SupabaseActivityTypeRepository';
import { Tables } from '../../../types/supabase';

/**
 * Service minimaliste pour la gestion des types d'activités.
 */
export class ActivityTypeService {
    constructor(private repository: IActivityTypeRepository) { }

    /**
     * Récupère la liste complète des catégories d'ateliers pour adultes.
     */
    async fetchAdultTypes(): Promise<Tables<'TypeActiviteAdulte'>[]> {
        return await this.repository.getAll();
    }
}

export const activityTypeService = new ActivityTypeService(new SupabaseActivityTypeRepository());

/**
 * LOGIGRAMME :
 * 1. L'application a besoin d'afficher les catégories d'activités.
 * 2. Elle appelle `activityTypeService.fetchAdultTypes()`.
 * 3. Le service demande au dépôt (Repository) de chercher les données dans Supabase.
 * 4. La liste des types est retournée pour être affichée dans les menus déroulants.
 */
