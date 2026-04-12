/**
 * Nom du module/fichier : levelService.ts
 * 
 * Données en entrée : 
 *   - Les informations brutes d'un niveau (nom, identifiant).
 *   - L'identifiant de l'enseignant connecté.
 * 
 * Données en sortie : 
 *   - Les objets "Niveau" ordonnés et consolidés.
 * 
 * Objectif principal : Agir comme le "Chef d'Orchestre" pour la gestion des niveaux scolaires. Ce service fait le lien entre l'interface utilisateur et le système de stockage (le dépôt/repository). Il s'assure que les nouveaux niveaux reçoivent automatiquement un identifiant d'utilisateur et un numéro d'ordre correct avant d'être enregistrés.
 * 
 * Ce que ça affiche : Rien (c'est un service de coordination invisible).
 */

import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { LevelWithStudentCount } from '../../../types';
import { ILevelRepository } from '../repositories/ILevelRepository';
import { SupabaseLevelRepository } from '../repositories/SupabaseLevelRepository';

/**
 * CLASSE DE SERVICE DES NIVEAUX :
 * Elle contient toute la "Recette Cuisine" pour manipuler les niveaux.
 */
export class LevelService {
    constructor(private repository: ILevelRepository) { }

    /**
     * RÉCUPÉRATION DES NIVEAUX :
     * Demande la liste complète des niveaux enregistrés.
     */
    fetchLevels = async (userId: string): Promise<LevelWithStudentCount[]> => {
        return await this.repository.getLevels(userId);
    }

    /**
     * RÉCUPÉRATION DES ÉLÈVES :
     * Demande la liste des enfants inscrits dans un niveau précis.
     */
    fetchStudents = async (levelId: string, userId: string): Promise<Tables<'Eleve'>[]> => {
        return await this.repository.getStudentsByLevel(levelId, userId);
    }

    /**
     * CRÉATION D'UN NIVEAU :
     * 1. Vérifie que l'enseignant est bien connecté.
     * 2. Calcule la position suivante (ex: si on a 4 niveaux, le nouveau sera le 5ème).
     * 3. Commande l'enregistrement définitif.
     */
    createLevel = async (levelData: TablesInsert<'Niveau'>, userId: string): Promise<LevelWithStudentCount> => {
        const maxOrder = await this.repository.getMaxOrder(userId);
        const nextOrder = maxOrder + 1;

        return await this.repository.createLevel({
            ...levelData,
            user_id: userId,
            ordre: nextOrder
        }, userId);
    }

    /**
     * MISE À JOUR :
     * Demande au système de stockage de modifier les informations d'un niveau existant.
     */
    updateLevel = async (id: string, levelData: TablesUpdate<'Niveau'>, userId: string): Promise<LevelWithStudentCount> => {
        return await this.repository.updateLevel(id, levelData, userId);
    }

    /**
     * SUPPRESSION :
     * Demande l'effacement définitif d'un niveau.
     */
    deleteLevel = async (id: string, userId: string): Promise<void> => {
        return await this.repository.deleteLevel(id, userId);
    }

    /**
     * RÉORGANISATION :
     * Sauvegarde le nouvel ordre général des niveaux (ex: glisser le "CM1" avant le "CE2").
     */
    updateOrder = async (updates: TablesUpdate<'Niveau'>[], userId: string): Promise<void> => {
        return await this.repository.updateOrders(updates, userId);
    }
}

// Exportation d'une version prête à l'emploi utilisant le moteur de stockage Supabase
export const levelService = new LevelService(new SupabaseLevelRepository());
