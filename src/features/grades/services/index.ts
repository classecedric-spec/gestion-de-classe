/**
 * Nom du module/fichier : index.ts
 * 
 * Données en entrée : Rien.
 * 
 * Données en sortie : L'export officiel du `gradeService` prêt à l'emploi.
 * 
 * Objectif principal : C'est l'usine d'assemblage du module "Grades" (les notes). C'est ici qu'on branche le "cerveau" (GradeService) avec le "bras mécanique" (SupabaseGradeRepository) pour que le reste de l'application n'ait plus qu'à utiliser un seul outil global.
 * 
 * Ce que ça affiche : Absolument rien.
 */

import { SupabaseGradeRepository } from '../repositories/SupabaseGradeRepository';
import { GradeService } from './gradeService';

// 1. On allume le composant technique (connexion directe à la base de données Supabase).
const gradeRepository = new SupabaseGradeRepository();

// 2. On donne la télécommande de ce composant au "Cerveau" (Service), et on exporte le robot finalisé pour que toute l'application puisse l'utiliser.
export const gradeService = new GradeService(gradeRepository);

/**
 * 1. Au démarrage de l'application centrale, ce fichier est lu discrètement.
 * 2. Il crée une alliance indestructible (Injection de dépendance) entre la logique mathématique et la technique réseau.
 * 3. Partout ailleurs dans le code, quand un fichier demandera à utiliser les notes via `import { gradeService }`, il obtiendra cet outil parfaitement assemblé et prêt à obéir.
 */
