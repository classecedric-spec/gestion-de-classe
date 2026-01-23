import { TablesInsert, TablesUpdate } from '../../../types/supabase';
import { storageService } from '../../../lib/storage';
import { validateWith, ActivitySchema } from '../../../lib/helpers';
import { IActivityRepository, ActivityWithRelations, ActivityLevelInput } from '../repositories/IActivityRepository';
import { SupabaseActivityRepository } from '../repositories/SupabaseActivityRepository';

export type { ActivityWithRelations, ActivityLevelInput };

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
    saveActivity = async (
        activityData: TablesInsert<'Activite'> | TablesUpdate<'Activite'>,
        materialTypeIds: string[],
        activityLevels: ActivityLevelInput[],
        isEdit = false
    ) => {
        // Validation
        const validation = validateWith(ActivitySchema.partial(), activityData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        let activityId = activityData.id;

        // Extract base64
        const photoBase64 = (activityData as any).photo_base64;
        const dataToSave = { ...activityData };

        // Remove base64 from payload
        // @ts-ignore
        delete dataToSave.photo_base64;

        if (isEdit && activityId) {
            // Upload photo if new
            if (photoBase64 && photoBase64.startsWith('data:image')) {
                const publicUrl = await this.uploadPhoto(activityId, photoBase64);
                if (publicUrl) {
                    (dataToSave as any).photo_url = publicUrl;
                }
            }

            await this.repository.updateActivity(activityId, dataToSave as TablesUpdate<'Activite'>);
        } else {
            const createdStart = await this.repository.createActivity(dataToSave as TablesInsert<'Activite'>);
            activityId = createdStart.id;

            // Upload photo after creation
            if (photoBase64 && photoBase64.startsWith('data:image')) {
                const publicUrl = await this.uploadPhoto(activityId, photoBase64);
                if (publicUrl) {
                    await this.repository.updateActivity(activityId, { photo_url: publicUrl } as any);
                }
            }
        }

        if (!activityId) throw new Error("Erreur: ID de l'activité manquant après sauvegarde.");

        // 2. Handle Materials Relations (Delete all & Re-insert)
        await this.repository.clearActivityMaterials(activityId);

        if (materialTypeIds.length > 0) {
            const links = materialTypeIds.map(mtId => ({
                activite_id: activityId!,
                type_materiel_id: mtId
            }));
            await this.repository.addActivityMaterials(links);
        }

        // 3. Handle Activity Levels Relations
        await this.repository.clearActivityLevels(activityId);

        if (activityLevels.length > 0) {
            // Need user_id for ActiviteNiveau. Use from activityData if available, usually is.
            // If not available in update, we might have an issue. 
            // In original code: `user_id: activityData.user_id`
            // Ensure activityData has user_id or we might assume current user? 
            // Assuming activityData.user_id is present as per original code.

            const userId = (activityData as any).user_id; // Cast because update type might not have it optional?

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
