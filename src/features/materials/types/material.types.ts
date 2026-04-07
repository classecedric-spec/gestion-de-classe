/**
 * Nom du module/fichier : material.types.ts
 * 
 * Données en entrée : 
 *   - Définitions provenant de la base de données (Supabase).
 * 
 * Données en sortie : 
 *   - Modèles de données (Interfaces) pour le matériel et les types de matériel.
 * 
 * Objectif principal : Définir la structure exacte de ce qu'est un "Matériel" et un "Type de matériel" dans l'application. Cela permet au code de savoir exactement quelles informations (nom, acronyme, lien avec un module) il peut manipuler.
 * 
 * Ce que ça contient : 
 *   - `TypeMateriel` : La définition de base d'un objet (ex: 'Règle', 'Tablette').
 *   - `MaterialActivity` : Le lien entre une activité pédagogique et le matériel dont elle a besoin.
 */

import { Tables } from '../../../types/supabase';

/**
 * Définition du type de matériel basé sur la table de la base de données.
 */
export type TypeMateriel = Tables<'TypeMateriel'>;

/**
 * Interface représentant une activité utilisant du matériel spécifique.
 */
export interface MaterialActivity {
    id: string;
    titre: string;
    Module: { nom: string } | null;
    ActiviteMateriel: {
        TypeMateriel: {
            id: string;
            nom: string;
            acronyme: string | null;
        } | null;
    }[];
}

/**
 * LOGIGRAMME DE STRUCTURE :
 * 
 * 1. BASE DE DONNÉES -> Fournit la table 'TypeMateriel'.
 * 2. TYPE MATERIEL -> Contient le Nom, l'Acronyme et l'ID.
 * 3. ACTIVITÉ -> Est liée à une liste de 'TypeMateriel' nécessaires.
 * 4. CODE -> Utilise ces définitions pour garantir que chaque écran affiche les bonnes données.
 */
