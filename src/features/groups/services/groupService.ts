/**
 * Nom du module/fichier : groupService.ts
 * 
 * Données en entrée : 
 *   - Des ordres de mission sur les groupes (créer, modifier, supprimer, réordonner).
 *   - Des données brutes de groupes (nom, priorités) ou des identifiants (IDs).
 * 
 * Données en sortie : 
 *   - Les groupes extraits ou mis à jour en base de données.
 *   - La confirmation que l'action (suppression, réorganisation) a réussi.
 * 
 * Objectif principal : Centraliser toute "l'intelligence métier" liée aux groupes d'élèves. Ce service fait le pont entre l'interface utilisateur et la base de données. Il s'assure que les données sont valides et orchestre les opérations comme le changement de position d'un groupe dans une liste.
 * 
 * Ce que ça affiche : Rien (c'est un moteur invisible de services).
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGroupRepository } from '../repositories/IGroupRepository';
import { SupabaseGroupRepository } from '../repositories/SupabaseGroupRepository';

/**
 * Service orchestrant les opérations sur les groupes d'élèves.
 */
export class GroupService {
    /**
     * Le service délègue le travail technique à un "dépôt" (repository).
     * Cela permet de changer de base de données (ex: passer de Supabase à autre chose)
     * sans avoir à modifier ce fichier métier.
     */
    constructor(private repository: IGroupRepository) { }

    /**
     * Récupère la liste intégrale de tous les groupes d'élèves (souvent triés par ordre alphabétique).
     */
    getGroups = async (): Promise<Tables<'Groupe'>[]> => {
        return await this.repository.getGroups();
    }

    /**
     * Recherche la fiche détaillée d'un seul groupe grâce à son identifiant unique.
     */
    getGroup = async (id: string): Promise<Tables<'Groupe'> | null> => {
        return await this.repository.getGroup(id);
    }

    /**
     * Enregistre officiellement un tout nouveau groupe (ex: "Soutien Lecture").
     */
    createGroup = async (group: TablesInsert<'Groupe'>): Promise<Tables<'Groupe'>> => {
        // On demande au dépôt de créer la ligne correspondante en base de données.
        return await this.repository.createGroup(group);
    }

    /**
     * Met à jour les informations d'un groupe existant (ex: changer son nom ou sa couleur).
     */
    updateGroup = async (id: string, updates: TablesUpdate<'Groupe'>): Promise<Tables<'Groupe'>> => {
        return await this.repository.updateGroup(id, updates);
    }

    /**
     * Supprime définitivement un groupe. Attention : les liens avec les élèves seront également coupés.
     */
    deleteGroup = async (id: string): Promise<void> => {
        return await this.repository.deleteGroup(id);
    }

    /**
     * Change la position numérique d'un groupe dans une liste ordonnée.
     * Utile pour réorganiser l'affichage manuellement par l'enseignant.
     */
    updateGroupOrder = async (id: string, order: number): Promise<void> => {
        return await this.repository.updateOrder(id, order);
    }
}

/**
 * Instance unique du service prête à l'emploi dans toute l'application.
 * On utilise par défaut l'implémentation Supabase.
 */
export const groupService = new GroupService(new SupabaseGroupRepository());

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Une action sur un groupe est demandée (ex: clic sur "Créer le groupe").
 * 2. Le `groupService` intercepte la demande depuis l'interface (hooks).
 * 3. S'il s'agit d'une création :
 *    a. Il reçoit les données (nom, couleur).
 *    b. Il demande au `repository` de l'enregistrer dans le grand registre (Supabase).
 * 4. S'il s'agit d'une réorganisation (Drag & Drop) :
 *    a. Il demande au `repository` de mettre à jour le numéro d'ordre en base de données.
 * 5. Une fois l'opération terminée, il renvoie le groupe créé ou mis à jour à l'appelant.
 */
