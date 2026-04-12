/**
 * Nom du module/fichier : ILevelRepository.ts
 * 
 * Données en entrée : N/A (Interface technique).
 * 
 * Données en sortie : N/A (Définit les contrats de données pour les niveaux scolaires).
 * 
 * Objectif principal : Définir le "Contrat de Service" pour la gestion des niveaux scolaires (ex: CP, CE1, 6ème). Cette interface garantit que n'importe quel système de stockage (Supabase ou autre) possédera les mêmes fonctions de lecture et d'écriture.
 * 
 * Ce que ça affiche : Rien (c'est une structure purement technique).
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { LevelWithStudentCount } from '../../../types';

/**
 * INTERFACE DU RÉPERTOIRE DES NIVEAUX :
 * Elle liste toutes les missions que le système de stockage doit être capable d'accomplir.
 */
export interface ILevelRepository {
    // Récupérer la liste de tous les niveaux avec le nombre d'élèves dans chacun
    getLevels(userId: string): Promise<LevelWithStudentCount[]>;
    
    // Lister les élèves inscrits dans un niveau spécifique
    getStudentsByLevel(levelId: string, userId: string): Promise<Tables<'Eleve'>[]>;
    
    // Créer un nouveau niveau scolaire
    createLevel(level: TablesInsert<'Niveau'>, userId: string): Promise<LevelWithStudentCount>;
    
    // Modifier les informations d'un niveau (nom, etc.)
    updateLevel(id: string, updates: TablesUpdate<'Niveau'>, userId: string): Promise<LevelWithStudentCount>;
    
    // Supprimer définitivement un niveau
    deleteLevel(id: string, userId: string): Promise<void>;
    
    // Sauvegarder un nouvel ordre d'affichage (ex: mettre le CP avant le CE1)
    updateOrders(updates: TablesUpdate<'Niveau'>[], userId: string): Promise<void>;
    
    // Calculer quel est le numéro d'ordre le plus élevé actuellement
    getMaxOrder(userId: string): Promise<number>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le programme a besoin de parler aux "Niveaux Scolaires".
 * 2. Il consulte ce fichier `ILevelRepository` pour savoir quelles questions il a le droit de poser (ex: "Peux-tu me donner les niveaux ?").
 * 3. Ce fichier ne répond pas lui-même aux questions, il définit juste que TOUTE personne voulant gérer les niveaux DOIT savoir répondre à ces 7 fonctions précises.
 */
