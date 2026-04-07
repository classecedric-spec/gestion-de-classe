/**
 * Nom du module/fichier : IClassRepository.ts
 * 
 * Données en entrée : Signature des méthodes (types de paramètres).
 * 
 * Données en sortie : Types de retour promis (Promesses).
 * 
 * Objectif principal : Définir le contrat (l'interface) pour l'accès aux données des classes. Cela garantit que n'importe quelle implémentation (ex: Supabase, ou une base de données de test) respecte la même structure pour récupérer ou modifier les données.
 * 
 * Ce que ça affiche : Rien. C'est une définition purement technique du "quoi" faire, sans dire "comment" le faire.
 */

import { TablesUpdate } from '../../../types/supabase';
import { ClassWithAdults, StudentWithRelations } from '../services/classService';

/**
 * L'interface Repository définit le tunnel de communication avec la base de données 
 * pour tout ce qui concerne les classes d'école.
 */
export interface IClassRepository {
    // Lecture des données
    getClasses(): Promise<ClassWithAdults[]>;
    getClassById(classId: string): Promise<ClassWithAdults | null>;
    getStudentsByClass(classId: string): Promise<StudentWithRelations[]>;
    
    // Actions de nettoyage
    deleteClass(classId: string): Promise<void>;
    removeStudentFromClass(studentId: string): Promise<void>;
    
    // Mise à jour de profils
    updateStudentField(studentId: string, field: keyof TablesUpdate<'Eleve'>, value: any): Promise<void>;

    /**
     * Section regroupant les actions d'écriture (création et modification majeure).
     */
    createClass(data: any): Promise<{ id: string }>;
    updateClass(classId: string, data: any): Promise<void>;
    linkAdult(classId: string, adultId: string, role: string): Promise<void>;
    unlinkAllAdults(classId: string): Promise<void>;
    uploadLogo(classId: string, photoBlob: Blob): Promise<string | null>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Une partie du code a besoin de manipuler des classes (ex: afficher la liste).
 * 2. Elle appelle une fonction définie dans ce contrat (ex: `getClasses`).
 * 3. Le code réel qui exécute la requête SQL (SupabaseClassRepository) doit obligatoirement respecter ce format.
 * 4. Cette étape intermédiaire permet de rendre le code plus solide et plus facile à tester.
 */
