/**
 * Nom du module/fichier : IAdultRepository.ts
 * 
 * Données en entrée : Définitions des méthodes pour gérer les fiches des intervenants (Adultes) et leur suivi.
 * 
 * Données en sortie : Une interface TypeScript imposant un contrat de service.
 * 
 * Objectif principal : Ce fichier définit le "contrat de service" pour la gestion des adultes dans l'application (intervenants, ATSEM, stagiaires, etc.). Il liste les actions possibles (créer un adulte, modifier son profil, enregistrer sa présence ou son activité du jour) sans se soucier de la manière dont les données sont stockées techniquement.
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

/**
 * Interface de dépôt pour la gestion des Adultes.
 */
export interface IAdultRepository {
    /**
     * Récupère la liste de tous les adultes enregistrés, triés par nom.
     */
    getAll(userId: string): Promise<Tables<'Adulte'>[]>;

    /**
     * Ajoute un nouvel adulte dans le répertoire.
     */
    create(adultData: TablesInsert<'Adulte'>): Promise<Tables<'Adulte'>>;

    /**
     * Met à jour les informations d'un adulte existant (nom, prénom, rôle, etc.).
     */
    update(id: string, adultData: TablesUpdate<'Adulte'>): Promise<Tables<'Adulte'>>;

    /**
     * Supprime un adulte du répertoire.
     */
    delete(id: string): Promise<void>;

    /**
     * Récupère les données de suivi (présence/activité) pour tous les adultes à la date d'aujourd'hui.
     */
    fetchTrackingToday(userId: string): Promise<any[]>;

    /**
     * Enregistre une activité spécifique effectuée par un adulte à un moment donné.
     */
    addActivity(adulteId: string, activiteId: string, userId: string): Promise<void>;

    /**
     * Supprime une entrée de suivi (erreur de saisie, etc.).
     */
    deleteSuivi(id: string): Promise<void>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ABSTRACTION : Ce fichier définit "ce que l'application doit pouvoir faire" avec les adultes.
 * 2. COHÉRENCE : Toutes les implémentations (Supabase ou autre) devront obligatoirement proposer ces fonctions.
 * 3. TRAÇABILITÉ : Il inclut à la fois la gestion des profils (create/update) et le suivi opérationnel quotidien (addActivity).
 */
