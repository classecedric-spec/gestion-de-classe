import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGroupRepository } from '../repositories/IGroupRepository';
import { SupabaseGroupRepository } from '../repositories/SupabaseGroupRepository';

export class GroupService {
    constructor(private repository: IGroupRepository) { }

    /**
     * Récupère tous les groupes
     * @returns {Promise<Tables<'Groupe'>[]>} Liste des groupes triés alphabétiquement
     * @throws {PostgrestError} Si la requête échoue
     */
    getGroups = async (): Promise<Tables<'Groupe'>[]> => {
        return await this.repository.getGroups();
    }

    /**
     * Récupère un groupe par ID
     * @param {string} id - ID du groupe
     * @returns {Promise<Tables<'Groupe'> | null>} Le groupe trouvé ou null
     * @throws {PostgrestError} Si la requête échoue
     */
    getGroup = async (id: string): Promise<Tables<'Groupe'> | null> => {
        return await this.repository.getGroup(id);
    }

    /**
     * Crée un nouveau groupe
     * @param {TablesInsert<'Groupe'>} group - Données du groupe à créer
     * @returns {Promise<Tables<'Groupe'>>} Le groupe créé
     * @throws {PostgrestError} Si la requête échoue
     */
    createGroup = async (group: TablesInsert<'Groupe'>): Promise<Tables<'Groupe'>> => {
        return await this.repository.createGroup(group);
    }

    /**
     * Met à jour un groupe
     * @param {string} id - ID du groupe à mettre à jour
     * @param {TablesUpdate<'Groupe'>} updates - Données à mettre à jour
     * @returns {Promise<Tables<'Groupe'>>} Le groupe mis à jour
     * @throws {PostgrestError} Si la requête échoue
     */
    updateGroup = async (id: string, updates: TablesUpdate<'Groupe'>): Promise<Tables<'Groupe'>> => {
        return await this.repository.updateGroup(id, updates);
    }

    /**
     * Supprime un groupe
     * @param {string} id - ID du groupe à supprimer
     * @returns {Promise<void>}
     * @throws {PostgrestError} Si la requête échoue
     */
    deleteGroup = async (id: string): Promise<void> => {
        return await this.repository.deleteGroup(id);
    }

    /**
     * Met à jour l'ordre d'un groupe
     * @param {string} id - ID du groupe
     * @param {number} order - Nouvelle position
     */
    updateGroupOrder = async (id: string, order: number): Promise<void> => {
        return await this.repository.updateOrder(id, order);
    }
}

export const groupService = new GroupService(new SupabaseGroupRepository());
