/**
 * Nom du module/fichier : activityTypeService.ts
 * 
 * Données en entrée : 
 *   - repository : Instance du dépôt de données (Supabase par défaut).
 *   - Paramètres métiers : libellés, identifiants utilisateur.
 * 
 * Données en sortie : 
 *   - ActivityType : Objet représentant un type d'action.
 *   - ActivityType[] : Liste de types d'actions.
 * 
 * Objectif principal : Ce service contient les "règles métier" pour la gestion des types d'actions. Il s'assure que les données sont valides (pas de texte vide) et gère l'injection automatique des actions par défaut (Observation, Aide, etc.) lors de la première utilisation.
 */

import { ActivityType } from '../types/adult.types';
import { IActivityTypeRepository } from '../repositories/IActivityTypeRepository';
import { SupabaseActivityTypeRepository } from '../repositories/SupabaseActivityTypeRepository';

export class ActivityTypeService {
    constructor(private repository: IActivityTypeRepository) { }

    // ACTIONS PAR DÉFAUT : Liste injectée si l'utilisateur n'en a aucune
    private readonly DEFAULT_TYPES = [
        "Observation de la classe",
        "Présentation",
        "Accompagnement individualisé",
        "Entretien famille",
        "Autre"
    ];

    /**
     * RÉCUPÉRATION : Liste complète ordonnée
     */
    async fetchAll(): Promise<ActivityType[]> {
        return await this.repository.getAll();
    }

    /**
     * INJECTION INITIALE (Seed) : Règle métier - On n'injecte que si la liste est vide
     */
    async seedDefaults(userId: string): Promise<ActivityType[]> {
        const existing = await this.repository.getAll();

        if (existing.length > 0) {
            return existing;
        }

        return await this.repository.bulkCreate(this.DEFAULT_TYPES, userId);
    }

    /**
     * CRÉATION : Avec validation métier du texte
     */
    async create(label: string, userId: string): Promise<ActivityType> {
        // VALIDATION : On refuse les textes vides ou uniquement composés d'espaces
        if (!label || label.trim().length === 0) {
            throw new Error('Le libellé du type d\'activité est requis');
        }

        return await this.repository.create(label.trim(), userId);
    }

    /**
     * MISE À JOUR : Avec validation identique à la création
     */
    async update(id: string, label: string): Promise<ActivityType> {
        if (!label || label.trim().length === 0) {
            throw new Error('Le libellé du type d\'activité est requis');
        }

        return await this.repository.update(id, label.trim());
    }

    /**
     * SUPPRESSION
     */
    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }
}

// Instance unique (Singleton) utilisée par toute l'application
export const activityTypeService = new ActivityTypeService(new SupabaseActivityTypeRepository());

// Export du type pour faciliter les imports
export type { ActivityType };

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. APPEL : Le hook demande une action (ex: Créer "Aide").
 * 2. VÉRIFICATION : Le service nettoie le texte (trim) et vérifie qu'il n'est pas vide.
 * 3. PERSISTANCE : Si valide, il délègue au "repository" l'écriture physique dans la base.
 * 4. ERREUR : Si invalide, il renvoie une erreur explicite qui sera affichée à l'utilisateur.
 */
