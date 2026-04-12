/**
 * Nom du module/fichier : IMaterialRepository.ts
 * 
 * Données en entrée : 
 *   - Identifiants de matériel.
 *   - Données de création/modification (nom, acronyme).
 * 
 * Données en sortie : 
 *   - Promesses (Promises) d'objets `TypeMateriel` ou de listes d'activités.
 * 
 * Objectif principal : Définir le "contrat de service" pour le stockage du matériel. Cette interface dicte quelles actions sont possibles (lister, créer, modifier, supprimer) sans s'occuper de *comment* c'est fait techniquement. C'est une sécurité pour le programme.
 * 
 * Ce que ça définit : 
 *   - Comment récupérer tous les outils de la classe.
 *   - Comment savoir quelles leçons utilisent tel outil spécifique.
 *   - Les règles de mise à jour et de suppression.
 */

import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { TypeMateriel, MaterialActivity } from '../types/material.types';

/**
 * Interface définissant les méthodes obligatoires pour gérer le matériel.
 */
export interface IMaterialRepository {
    /**
     * Récupère la liste complète du matériel, classée par nom.
     */
    getAll(userId: string): Promise<TypeMateriel[]>;

    /**
     * Trouve toutes les activités pédagogiques qui ont besoin d'un matériel précis.
     */
    getLinkedActivities(materialId: string): Promise<MaterialActivity[]>;

    /**
     * Enregistre un nouvel objet matériel.
     */
    create(materialData: TablesInsert<'TypeMateriel'>): Promise<TypeMateriel>;

    /**
     * Modifie les informations d'un matériel existant.
     */
    update(id: string, materialData: TablesUpdate<'TypeMateriel'>): Promise<TypeMateriel>;

    /**
     * Supprime définitivement un type de matériel.
     */
    delete(id: string): Promise<void>;
}

// Exportation des types pour une utilisation simplifiée ailleurs
export type { TypeMateriel, MaterialActivity };

/**
 * LOGIGRAMME DE CONTRAT :
 * 
 * 1. DÉFINITION -> L'interface dit : "Si tu veux être un dépôt de matériel, tu DOIS savoir faire 'getAll'".
 * 2. UTILISATION -> Le reste de l'application utilise ces noms de fonctions sans savoir qu'elles parlent à Supabase.
 * 3. SÉCURITÉ -> Si on change de base de données plus tard, on n'aura qu'à créer une nouvelle version qui respecte ce même contrat.
 */
