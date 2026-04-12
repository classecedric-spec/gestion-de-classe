/**
 * Nom du module/fichier : IGroupRepository.ts
 * 
 * Données en entrée : 
 *   - Identifiants uniques de groupes (ID).
 *   - Structures de données pour la création ou la mise à jour (nom, couleurs, position).
 * 
 * Données en sortie : 
 *   - Objets "Groupe" complets ou listes de groupes.
 *   - Confirmations de réussite (Promesses vides) pour les actions de suppression ou réorganisation.
 * 
 * Objectif principal : Définir le "Plan de Construction" (Interface) obligatoire pour tout système de stockage des groupes. Ce fichier ne contient pas de code "actif" mais liste les fonctions que n'importe quelle base de données (Supabase, MySQL, ou même un simple fichier) doit être capable de réaliser pour que l'application fonctionne. C'est la garantie que notre application restera flexible et évolutive.
 * 
 * Ce que ça affiche : Rien (couche d'architecture technique).
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

/**
 * CONTRAT DE SERVICE (Interface) :
 * Tout "Dépôt des Groupes" doit obligatoirement savoir effectuer ces 7 actions majeures.
 */
export interface IGroupRepository {
    /** 
     * LISTER TOUS LES GROUPES : 
     * Récupère la liste intégrale des groupes d'un enseignant spécifique.
     */
    getGroups(userId: string): Promise<Tables<'Groupe'>[]>;

    /** 
     * FILTRER PAR UTILISATEUR : 
     * Récupère les groupes spécifiques à un enseignant identifié par son ID.
     */
    getUserGroups(userId: string): Promise<Tables<'Groupe'>[]>;

    /** 
     * TROUVER UN GROUPE : 
     * Recherche une fiche groupe précise par son code ID unique.
     */
    getGroup(id: string, userId: string): Promise<Tables<'Groupe'> | null>;

    /** 
     * CRÉER UN GROUPE : 
     * Enregistre un nouveau groupe et retourne la fiche créée avec son identifiant définitif.
     */
    createGroup(group: TablesInsert<'Groupe'>, userId: string): Promise<Tables<'Groupe'>>;

    /** 
     * METTRE À JOUR : 
     * Modifie les informations d'un groupe (nom, couleur, etc.) sans changer son identifiant.
     */
    updateGroup(id: string, updates: TablesUpdate<'Groupe'>, userId: string): Promise<Tables<'Groupe'>>;

    /** 
     * SUPPRIMER : 
     * Efface définitivement un groupe du système.
     */
    deleteGroup(id: string, userId: string): Promise<void>;

    /** 
     * RÉORDONNER : 
     * Mémorise la nouvelle position d'un groupe dans une liste triée (Drag & Drop).
     */
    updateOrder(id: string, order: number, userId: string): Promise<void>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT (Conceptuel) :
 * 
 * 1. Imaginons que nous voulions changer de base de données pour passer de Supabase à un autre système.
 * 2. Le développeur crée un nouveau traducteur appelé "NouveauStockageRepository.ts".
 * 3. Il indique à l'ordinateur qu'il "signe le contrat" : `implements IGroupRepository`.
 * 4. L'ordinateur vérifie alors point par point :
 *    - "Sais-tu faire `getGroups` ? Oui."
 *    - "Sais-tu faire `createGroup` ? Oui."
 *    - "Sais-tu faire `deleteGroup` ? Non." -> L'ordinateur bloque alors la compilation et dit : "Il manque l'action de suppression dans ton nouveau stockage !".
 * 5. Grâce à ce garde-fou, on est certain que le nouveau système remplira toutes les missions nécessaires avant de le brancher.
 */
