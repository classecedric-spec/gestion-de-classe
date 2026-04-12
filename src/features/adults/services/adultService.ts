/**
 * Nom du module/fichier : adultService.ts
 * 
 * Données en entrée : 
 *   - adultRepository : Dépôt pour les profils adultes et leur suivi.
 *   - activityTypeRepository : Dépôt pour les types d'actions.
 * 
 * Données en sortie : 
 *   - Adult / AdultActivity : Objets représentant les personnes et leurs actions enregistrées.
 *   - Méthodes CRUD pour les adultes et leurs activités.
 * 
 * Objectif principal : Ce service est le point d'entrée principal pour tout ce qui concerne les "Adultes" dans l'application. Il coordonne la gestion des profils (nom, prénom) et la saisie de leur suivi quotidien (ex: "M. Dupont a fait de l'Observation aujourd'hui"). Il assure également que l'utilisateur est bien identifié (authentifié) avant de créer des données.
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IAdultRepository } from '../repositories/IAdultRepository';
import { SupabaseAdultRepository } from '../repositories/SupabaseAdultRepository';
import { IActivityTypeRepository, ActivityType } from '../repositories/IActivityTypeRepository';
import { SupabaseActivityTypeRepository } from '../repositories/SupabaseActivityTypeRepository';

export type { ActivityType };

// INTERFACES SIMPLIFIÉES POUR LE SUIVI
export interface Adult {
    id: string;
    nom: string;
    prenom: string;
}

export interface AdultActivity extends Tables<'SuiviAdulte'> {
    Adulte?: { id: string; nom: string; prenom: string } | null;
    TypeActiviteAdulte?: { id: string; label: string } | null;
}

export class AdultService {
    constructor(
        private adultRepository: IAdultRepository,
        private activityTypeRepository: IActivityTypeRepository
    ) { }

    // --- GESTION DES PROFILS ADULTES ---

    /**
     * RÉCUPÉRATION : Liste complète (format Supabase)
     */
    async fetchAdults(userId: string): Promise<Tables<'Adulte'>[]> {
        return await this.adultRepository.getAll(userId);
    }

    /**
     * RÉCUPÉRATION : Format simplifié pour l'affichage du suivi
     */
    async fetchAllAdults(userId: string): Promise<Adult[]> {
        const adults = await this.adultRepository.getAll(userId);
        return adults.map(a => ({ id: a.id, nom: a.nom, prenom: a.prenom }));
    }

    /**
     * CRÉATION
     */
    async createAdult(adultData: TablesInsert<'Adulte'>): Promise<Tables<'Adulte'>> {
        return await this.adultRepository.create(adultData);
    }

    /**
     * MISE À JOUR
     */
    async updateAdult(id: string, adultData: TablesUpdate<'Adulte'>): Promise<Tables<'Adulte'>> {
        return await this.adultRepository.update(id, adultData);
    }

    /**
     * SUPPRESSION
     */
    async deleteAdult(id: string): Promise<void> {
        await this.adultRepository.delete(id);
    }

    // --- GESTION DU SUIVI QUOTIDIEN ---

    /**
     * SUIVI DU JOUR : Récupère les actions saisies aujourd'hui
     */
    async fetchTrackingToday(userId: string): Promise<AdultActivity[]> {
        return await this.adultRepository.fetchTrackingToday(userId);
    }

    /**
     * HISTORIQUE : Récupère les activités depuis une date donnée
     */
    async fetchAdultActivities(_sinceDate: string, userId: string): Promise<AdultActivity[]> {
        // Note : Actuellement limité au suivi du jour par le repository
        return await this.adultRepository.fetchTrackingToday(userId);
    }

    /**
     * ENREGISTREMENT D'UNE ACTION : Lie un adulte à un type d'activité
     */
    async addActivity(adulteId: string, activiteId: string, userId: string): Promise<void> {
        await this.adultRepository.addActivity(adulteId, activiteId, userId);
    }

    /**
     * CRÉATION D'ACTIVITÉ (Variante d'appel)
     */
    async createAdultActivity(activity: { adulte_id: string; activite_id: string; user_id: string }): Promise<void> {
        await this.adultRepository.addActivity(activity.adulte_id, activity.activite_id, activity.user_id);
    }

    /**
     * ANNULATION D'UN SUIVI
     */
    async deleteSuivi(id: string): Promise<void> {
        await this.adultRepository.deleteSuivi(id);
    }

    /**
     * SUPPRESSION D'ACTIVITÉ (Variante d'appel)
     */
    async deleteAdultActivity(id: string): Promise<void> {
        await this.adultRepository.deleteSuivi(id);
    }

    // --- GESTION DES TYPES D'ACTIONS (Délégation) ---

    async fetchActivityTypes(userId: string): Promise<ActivityType[]> {
        return await this.activityTypeRepository.getAll(userId);
    }

    /**
     * GÉNÉRATION INITIALE : Crée les actions types si aucune n'existe
     */
    async seedDefaultActivityTypes(): Promise<ActivityType[]> {
        // On récupère l'identifiant de l'utilisateur connecté
        const { data: { user } } = await (await import('../../../lib/database')).supabase.auth.getUser();
        if (!user) return [];

        const defaults = [
            "Co-enseignement",
            "Remédiation",
            "Observation",
            "Aide ponctuelle",
            "Soutien"
        ];
        return await this.activityTypeRepository.bulkCreate(defaults, user.id);
    }

    /**
     * CRÉATION DE TYPE : Avec vérification d'authentification
     */
    async createActivityType(label: string): Promise<ActivityType> {
        const { data: { user } } = await (await import('../../../lib/database')).supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        return await this.activityTypeRepository.create(label, user.id);
    }

    async updateActivityType(id: string, label: string): Promise<ActivityType> {
        return await this.activityTypeRepository.update(id, label);
    }

    async deleteActivityType(id: string): Promise<void> {
        await this.activityTypeRepository.delete(id);
    }
}

// Instance unique (Singleton) regroupant toute la logique métier
export const adultService = new AdultService(
    new SupabaseAdultRepository(),
    new SupabaseActivityTypeRepository()
);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ORIENTATION : Le service aiguille les demandes soit vers les profils (Adultes), soit vers les actions (Activities).
 * 2. AUTHENTIFICATION : Avant toute création (Seed ou Type personnalisé), il vérifie l'identité via Supabase.
 * 3. COORDINATION : Il transforme parfois les données (mapping) pour simplifier le travail des composants visuels.
 * 4. PERSISTANCE : Il utilise les dépôts (repositories) pour transformer ces ordres en requêtes SQL vers la base de données.
 */
