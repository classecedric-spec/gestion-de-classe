/**
 * Nom du module/fichier : IStudentRepository.ts
 * 
 * Données en entrée : Définitions des signatures de méthodes pour manipuler les élèves.
 * 
 * Données en sortie : Un contrat (interface) stricte que tout dépôt de données d'élèves (qu'il soit réel ou de test) doit respecter.
 * 
 * Objectif principal : Établir une liste de "commandes" standardisées pour la gestion des élèves. En utilisant cette interface, le reste de l'application (comme le StudentService) n'a pas besoin de savoir comment les données sont techniquement enregistrées (Supabase, fichier local, etc.). Il lui suffit de savoir que ces fonctions précises existent et renvoient les bons résultats.
 * 
 * Ce que ça affiche : Rien, c'est une pièce de structure technique (Contrat d'interface).
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

/**
 * Interface définissant les capacités requises pour gérer le stockage des élèves.
 */
export interface IStudentRepository {
    // OPERATIONS DE BASE (C.R.U.D)
    findById(id: string): Promise<Tables<'Eleve'> | null>;
    findAll(): Promise<Tables<'Eleve'>[]>;
    create(student: TablesInsert<'Eleve'>): Promise<Tables<'Eleve'>>;
    update(id: string, student: TablesUpdate<'Eleve'>): Promise<Tables<'Eleve'>>;
    delete(id: string): Promise<void>;

    // GESTION DES RELATIONS (Liaisons É élèves <-> Groupes)
    // Permet de savoir dans quels groupes est un enfant et de modifier ces liens.
    getLinkedGroupIds(studentId: string): Promise<string[]>;
    linkToGroup(studentId: string, groupId: string, userId: string): Promise<void>;
    unlinkFromGroup(linkId: string): Promise<void>;
    unlinkMultiFromGroup(linkIds: string[]): Promise<void>;
    getStudentGroupLinks(studentId: string): Promise<{ id: string, groupe_id: string }[]>;

    // REQUÊTES SPÉCIFIQUES ET FILTRAGES
    // Fonctions optimisées pour récupérer des listes d'enfants selon différents critères métier.
    findByClass(classId: string): Promise<Tables<'Eleve'>[]>;
    findByGroup(groupId: string): Promise<any[]>;
    findByGroups(groupIds: string[]): Promise<any[]>;
    findAllForTeacher(teacherId: string): Promise<any[]>;
    
    // Suivi particulier : met à jour le niveau d'alerte (importance) d'un élève.
    updateImportance(id: string, importance: number | null): Promise<void>;
    
    // Synchronisation : récupère uniquement les changements récents.
    getStudentsDelta(teacherId: string): Promise<{ delta: any[], isFirstSync: boolean }>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le service métier (StudentService) décide de sauvegarder un nouvel élève.
 * 2. Il ne veut pas s'occuper des détails SQL ou des serveurs distants.
 * 3. Il s'appuie sur ce contrat `IStudentRepository` pour être certain que la fonction `create` est disponible.
 * 4. Le contrat garantit que cette fonction accepte des données d'élèves et renvoie une fiche complète.
 * 5. L'implémentation (ex: SupabaseStudentRepository) prend ensuite le relais pour l'exécution réelle.
 * 6. Grâce à ce contrat, si l'on change de base de données plus tard, on n'a qu'à réécrire une implémentation sans toucher à la logique du service.
 */
