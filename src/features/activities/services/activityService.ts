/**
 * Nom du module/fichier : activityService.ts
 * 
 * Données en entrée : Informations sur les activités (données de base, matériel lié, exigences par niveau scolaire)
 *   et les types de matériel.
 * 
 * Données en sortie : Activités sauvegardées, listes de matériels, ou confirmation de suppression.
 * 
 * Objectif principal : Agir comme le "cerveau" de la gestion des activités (ateliers). Il coordonne 
 *   la création et la mise à jour des activités complexes qui touchent à plusieurs tables 
 *   (l'activité elle-même, ses photos, son matériel et ses spécificités par niveau).
 * 
 * Ce que ça affiche : Rien directement. C'est un service de traitement de données.
 */

import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { storageService } from '../../../lib/storage';
import { validateWith, ActivitySchema } from '../../../lib/helpers';
import { IActivityRepository, ActivityWithRelations, ActivityLevelInput } from '../repositories/IActivityRepository';
import { SupabaseActivityRepository } from '../repositories/SupabaseActivityRepository';

export type { ActivityWithRelations, ActivityLevelInput };

/**
 * Le service Activities gère toute la logique métier liée aux ateliers pédagogiques.
 */
export class ActivityService {
    constructor(private repository: IActivityRepository) { }

    /**
     * Récupère les détails d'un module
     * @param {string} id - ID du module
     * @returns {Promise<any>} Détails du module
     */
    getModule = async (id: string) => {
        return await this.repository.getModule(id);
    }

    /**
     * Récupère tous les types de matériel
     * @returns {Promise<Tables<'TypeMateriel'>[]>} Liste des types de matériel
     */
    getMaterialTypes = async () => {
        return await this.repository.getMaterialTypes();
    }

    /**
     * Récupère les matériaux liés à une activité
     * @param {string} activityId - ID de l'activité
     * @returns {Promise<{type_materiel_id: string}[]>} Liste des IDs de type matériel
     */
    getActivityMaterials = async (activityId: string) => {
        return await this.repository.getActivityMaterials(activityId);
    }

    /**
     * Crée un nouveau type de matériel
     * @param {string} name - Nom du matériel
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Tables<'TypeMateriel'>>} Le type de matériel créé
     */
    createMaterialType = async (name: string, userId: string) => {
        return await this.repository.createMaterialType(name, userId);
    }

    /**
     * Met à jour un type de matériel
     * @param {string} id - ID du matériel
     * @param {string} name - Nouveau nom
     * @returns {Promise<void>}
     */
    updateMaterialType = async (id: string, name: string) => {
        await this.repository.updateMaterialType(id, name);
    }

    /**
     * Supprime un type de matériel
     * @param {string} id - ID du matériel
     * @returns {Promise<void>}
     */
    deleteMaterialType = async (id: string) => {
        await this.repository.deleteMaterialType(id);
    }

    /**
     * Récupère tous les niveaux
     * @returns {Promise<Tables<'Niveau'>[]>} Liste des niveaux
     */
    getLevels = async () => {
        return await this.repository.getLevels();
    }

    /**
     * Récupère les niveaux spécifiques (exceptions) d'une activité
     * @param {string} activityId - ID de l'activité
     * @returns {Promise<any[]>} Liste des niveaux liés avec détails
     */
    getActivityLevels = async (activityId: string) => {
        return await this.repository.getActivityLevels(activityId);
    }

    /**
     * Helper to upload photo to storage using centralized storage service
     * @param {string} entityId - ID de l'entité
     * @param {string} base64 - Données base64
     * @returns {Promise<string | null>} URL publique
     */
    uploadPhoto = async (entityId: string, base64: string): Promise<string | null> => {
        const result = await storageService.uploadImage('activite', entityId, base64);
        return result.publicUrl;
    }

    /**
     * Crée ou met à jour une activité complète (avec ses relations)
     * @param {TablesInsert<'Activite'> | TablesUpdate<'Activite'>} activityData - Données de l'activité
     * @param {string[]} materialTypeIds - IDs des matériels liés
     * @param {ActivityLevelInput[]} activityLevels - Niveaux spécifiques
     * @param {boolean} [isEdit=false] - Mode édition
     * @returns {Promise<string>} ID de l'activité
     * @throws {Error} Si validation échoue ou erreur DB
     */
    // La fonction la plus importante : elle sauvegarde une activité complète, y compris ses liens avec le matériel et les réglages par niveau scolaire.
    saveActivity = async (
        activityData: TablesInsert<'Activite'> | TablesUpdate<'Activite'>,
        materialTypeIds: string[],
        activityLevels: ActivityLevelInput[],
        isEdit = false
    ) => {
        // Étape 1 : On vérifie que les données envoyées respectent bien le format attendu pour éviter d'enregistrer n'importe quoi.
        const validation = validateWith(ActivitySchema.partial(), activityData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        // Étape 2 : On gère l'ID. Si c'est une modification, on garde l'ID existant, sinon on en créera un nouveau.
        let activityId = activityData.id;

        // Extraction de la photo en format texte (base64) avant de préparer les données pour la base de données.
        const photoBase64 = (activityData as any).photo_base64;
        const dataToSave = { ...activityData };

        // On retire le format texte de la photo du paquet final car la base de données ne stocke que le lien URL.
        // @ts-ignore
        delete dataToSave.photo_base64;

        if (isEdit && activityId) {
            // Gestion de la photo en cas de modification.
            if (photoBase64 && photoBase64.startsWith('data:image')) {
                const publicUrl = await this.uploadPhoto(activityId, photoBase64);
                if (publicUrl) {
                    (dataToSave as any).photo_url = publicUrl;
                }
            }

            await this.repository.updateActivity(activityId, dataToSave as TablesUpdate<'Activite'>);
        } else {
            // Création d'une nouvelle activité.
            const createdStart = await this.repository.createActivity(dataToSave as TablesInsert<'Activite'>);
            activityId = createdStart.id;

            // Envoi de la photo juste après la création pour lier l'ID généré.
            if (photoBase64 && photoBase64.startsWith('data:image')) {
                const publicUrl = await this.uploadPhoto(activityId, photoBase64);
                if (publicUrl) {
                    await this.repository.updateActivity(activityId, { photo_url: publicUrl } as any);
                }
            }
        }

        if (!activityId) throw new Error("Erreur: ID de l'activité manquant après sauvegarde.");

        // Gestion du matériel : on vide l'ancienne liste de matériel pour cette activité et on la remplace par la nouvelle (méthode 'nettoyer et recréer').
        await this.repository.clearActivityMaterials(activityId);

        if (materialTypeIds.length > 0) {
            const links = materialTypeIds.map(mtId => ({
                activite_id: activityId!,
                type_materiel_id: mtId
            }));
            await this.repository.addActivityMaterials(links);
        }

        // Spécificités par niveau : on fait de même pour les réglages particuliers (ex: plus d'exercices demandés en GS qu'en MS pour la même activité).
        await this.repository.clearActivityLevels(activityId);

        if (activityLevels.length > 0) {
            const userId = (activityData as any).user_id; 

            const levelLinks = activityLevels.map(al => ({
                activite_id: activityId!,
                niveau_id: al.niveau_id,
                nombre_exercices: typeof al.nombre_exercices === 'string' ? parseInt(al.nombre_exercices, 10) : al.nombre_exercices || 1,
                nombre_erreurs: typeof al.nombre_erreurs === 'string' ? parseInt(al.nombre_erreurs, 10) : al.nombre_erreurs || 1,
                statut_exigence: al.statut_exigence,
                user_id: userId
            }));

            await this.repository.addActivityLevels(levelLinks);
        }

        return activityId;
    }

    /**
     * Récupère la liste complète des activités avec relations
     * @returns {Promise<ActivityWithRelations[]>} Liste des activités
     */
    fetchActivities = async () => {
        return await this.repository.getActivities();
    }

    /**
     * Supprime une activité
     * @param {string} activityId - ID de l'activité
     * @returns {Promise<void>}
     */
    deleteActivity = async (activityId: string) => {
        await this.repository.deleteActivity(activityId);
    }

    /**
     * Upsert multiple activities (e.g. for reordering)
     */
    upsertActivities = async (data: TablesInsert<'Activite'>[]) => {
        await this.repository.upsertActivities(data);
    }

    /**
     * Met à jour une exigence (Activite ou ActiviteNiveau)
     * @param {boolean} isBase - Vrai si mise à jour sur Activite, faux sur ActiviteNiveau
     * @param {string} id - ID de l'entité
     * @param {string} field - Champ à modifier
     * @param {any} value - Nouvelle valeur
     * @returns {Promise<void>}
     */
    updateRequirement = async (isBase: boolean, id: string, field: string, value: any) => {
        if (isBase) {
            await this.repository.updateActivityField(id, field, value);
        } else {
            await this.repository.updateActivityLevelField(id, field, value);
        }
    }
}

export const activityService = new ActivityService(new SupabaseActivityRepository());

/**
 * LOGIGRAMME DU FLUX DE SAUVEGARDE :
 * 
 * 1. L'utilisateur clique sur "Enregistrer" dans le formulaire d'activité.
 * 2. Le service reçoit les données (activité, matériels choisis, exigences par niveau).
 * 3. Validation des données via un schéma de contrôle pour éviter les erreurs.
 * 4. Traitement de la photo :
 *    - Si nouvelle photo : Envoi sur le serveur et récupération de l'URL.
 *    - Mise à jour des informations de l'activité avec cette URL.
 * 5. Sauvegarde en base de données :
 *    - Si nouveau : Création d'une nouvelle ligne.
 *    - Si existant : Mise à jour de la ligne actuelle.
 * 6. Synchronisation des liens externes (Matériel et Niveaux) :
 *    - On supprime tous les anciens liens pour cet ID d'activité.
 *    - On recrée les nouveaux liens à partir de la sélection actuelle.
 * 7. L'ID de l'activité finale est retourné pour confirmer le succès de l'opération.
 */
