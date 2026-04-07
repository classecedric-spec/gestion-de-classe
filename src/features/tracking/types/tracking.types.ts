/**
 * Nom du module/fichier : tracking.types.ts
 * 
 * Objectif principal : Définir les "Formulaires" de données (Types) utilisés dans tout le module de suivi. 
 * Plutôt que de dire "c'est une liste d'objets", on explique ici précisément ce que contient chaque objet (ex: une progression doit avoir un élève, son prénom, son nom, etc.). Cela permet au logiciel de vérifier qu'on ne fait pas d'erreur en manipulant les données.
 */

import { Tables } from '../../../types/supabase';

/**
 * Type : ProgressionWithDetails (L'Avancement Détaillé)
 * C'est la structure de données la plus complète pour un exercice. 
 * Elle combine :
 * - Les données de base de Supabase (id, état, date).
 * - Les infos de l'élève (Prénom, Nom, Importance du suivi).
 * - Les infos de l'activité (Titre, Module, et même la Matière parente).
 * - Un drapeau "is_suivi" pour savoir si c'est un suivi manuel de l'enseignant.
 */
export type ProgressionWithDetails = Tables<'Progression'> & {
    eleve: {
        id: string;
        prenom: string | null;
        nom: string | null;
        importance_suivi: number | null;
    } | null;
    activite: (Tables<'Activite'> & {
        Module: (Tables<'Module'> & {
            SousBranche: {
                branche_id: string | null;
            } | null;
        }) | null;
    }) | null;
    is_suivi: boolean | null;
};

/**
 * Type : StudentBasicInfo (Infos Élève Simplifiées)
 * Une version légère utilisée pour les listes rapides (ex: suggérer des tuteurs).
 * On ne garde que l'essentiel : l'identité et l'importance du suivi.
 */
export type StudentBasicInfo = {
    id: string;
    prenom: string | null;
    nom: string | null;
    importance_suivi: number | null;
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. PRÉPARATION : L'enseignant veut voir qui a besoin d'aide.
 * 2. STRUCTURE : Le système prépare une boîte vide au format `ProgressionWithDetails`.
 * 3. REMPLISSAGE : La base de données Supabase remplit la boîte avec les infos de Lucas, l'exercice "Grammaire", et son état "Besoin d'aide".
 * 4. CONTRÔLE : Le code vérifie que la boîte est bien complète (elle a bien un `eleve.prenom`).
 * 5. LIVRAISON : La boîte est envoyée à l'écran `MobileRequestCard` pour être affichée.
 */
