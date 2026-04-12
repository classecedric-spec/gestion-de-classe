/**
 * Nom du module/fichier : materialService.ts
 * 
 * Données en entrée : 
 *   - Données brutes du matériel (nom, acronyme).
 *   - Identifiant de l'utilisateur (userId).
 * 
 * Données en sortie : 
 *   - Objets matériels nettoyés et validés.
 *   - Listes d'activités triées.
 * 
 * Objectif principal : Agir comme le "cerveau métier" pour le matériel. Ce service s'occupe de valider que les noms ne sont pas vides, de nettoyer les espaces inutiles, et de trier les résultats pour que l'affichage soit toujours propre et ordonné pour l'enseignant.
 * 
 * Ce que ça fait : 
 *   - `fetchAll` : Récupère tout le catalogue.
 *   - `fetchLinkedActivities` : Récupère les leçons liées et les trie par ordre alphabétique.
 *   - `create`/`update` : Vérifie que les données sont valides avant de les envoyer au "secrétariat technique" (Repository).
 */

import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IMaterialRepository, TypeMateriel, MaterialActivity } from '../repositories/IMaterialRepository';
import { SupabaseMaterialRepository } from '../repositories/SupabaseMaterialRepository';

// Exportation des types pour assurer la compatibilité avec le reste du code
export type { TypeMateriel, MaterialActivity };
export type TypeMaterielInsert = TablesInsert<'TypeMateriel'>;
export type TypeMaterielUpdate = TablesUpdate<'TypeMateriel'>;

/**
 * Service de gestion du matériel.
 * Contient la logique métier (validation, tri, nettoyage).
 */
export class MaterialService {
    constructor(private repository: IMaterialRepository) { }

    /**
     * Récupère la liste complète du matériel.
     */
    async fetchAll(userId: string): Promise<TypeMateriel[]> {
        return await this.repository.getAll(userId);
    }

    /**
     * Récupère les activités liées à un matériel et les trie par titre.
     */
    async fetchLinkedActivities(materialId: string): Promise<MaterialActivity[]> {
        const activities = await this.repository.getLinkedActivities(materialId);

        // Logique métier : On trie les activités par ordre alphabétique de titre
        return activities.sort((a, b) =>
            (a.titre || '').localeCompare(b.titre || '')
        );
    }

    /**
     * Crée un nouveau matériel après validation.
     */
    async create(materialData: Omit<TablesInsert<'TypeMateriel'>, 'user_id'>, userId: string): Promise<TypeMateriel> {
        // Validation : Le nom ne doit pas être vide
        if (!materialData.nom || materialData.nom.trim().length === 0) {
            throw new Error('Le nom du matériel est requis');
        }

        return await this.repository.create({
            ...materialData,
            nom: materialData.nom.trim(), // On enlève les espaces inutiles
            user_id: userId
        });
    }

    /**
     * Modifie un matériel existant avec validation.
     */
    async update(id: string, materialData: TablesUpdate<'TypeMateriel'>): Promise<TypeMateriel> {
        // Si on change le nom, on vérifie qu'il est valide
        if (materialData.nom !== undefined) {
            if (!materialData.nom || materialData.nom.trim().length === 0) {
                throw new Error('Le nom du matériel est requis');
            }
            materialData.nom = materialData.nom.trim();
        }

        return await this.repository.update(id, materialData);
    }

    /**
     * Supprime un matériel.
     */
    async delete(id: string): Promise<boolean> {
        await this.repository.delete(id);
        return true;
    }
}

// Création d'une instance unique (Singleton) pour toute l'application
export const materialService = new MaterialService(new SupabaseMaterialRepository());

export default materialService;

/**
 * LOGIGRAMME DE VALIDATION :
 * 
 * 1. ACTION -> L'utilisateur veut modifier le nom d'un matériel.
 * 2. NETTOYAGE -> Le service retire les espaces superflus au début et à la fin.
 * 3. VÉRIFICATION -> Si le nom est vide, le service bloque l'action et affiche une erreur.
 * 4. TRANSMISSION -> Si tout est bon, le service transmet les données au Repository pour l'enregistrement.
 */
