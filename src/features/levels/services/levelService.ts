import { supabase } from '../../../lib/database'; // Keep supabase for auth for now, or use auth service if available
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { LevelWithStudentCount } from '../../../types';
import { ILevelRepository } from '../repositories/ILevelRepository';
import { SupabaseLevelRepository } from '../repositories/SupabaseLevelRepository';

export class LevelService {
    constructor(private repository: ILevelRepository) { }

    /**
     * Fetch all levels with student count
     * @returns {Promise<LevelWithStudentCount[]>} List of levels with associated student count
     * @throws {PostgrestError} If query fails
     */
    fetchLevels = async (): Promise<LevelWithStudentCount[]> => {
        return await this.repository.getLevels();
    }

    /**
     * Fetch students for a specific level
     * @param {string} levelId - The ID of the level
     * @returns {Promise<Tables<'Eleve'>[]>} List of students in that level
     * @throws {PostgrestError} If query fails
     */
    fetchStudents = async (levelId: string): Promise<Tables<'Eleve'>[]> => {
        return await this.repository.getStudentsByLevel(levelId);
    }

    /**
     * Create a new level
     * @param {TablesInsert<'Niveau'>} levelData - The level data to insert
     * @returns {Promise<LevelWithStudentCount>} The created level with student count (0)
     * @throws {Error} If no user logged in or query fails
     */
    createLevel = async (levelData: TablesInsert<'Niveau'>): Promise<LevelWithStudentCount> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const maxOrder = await this.repository.getMaxOrder();
        const nextOrder = maxOrder + 1;

        return await this.repository.createLevel({
            ...levelData,
            user_id: user.id,
            ordre: nextOrder
        });
    }

    /**
     * Update an existing level
     * @param {string} id - Level ID
     * @param {TablesUpdate<'Niveau'>} levelData - Data to update
     * @returns {Promise<LevelWithStudentCount>} The updated level
     * @throws {PostgrestError} If query fails
     */
    updateLevel = async (id: string, levelData: TablesUpdate<'Niveau'>): Promise<LevelWithStudentCount> => {
        return await this.repository.updateLevel(id, levelData);
    }

    /**
     * Delete a level
     * @param {string} id - Level ID
     * @returns {Promise<void>}
     * @throws {PostgrestError} If query fails
     */
    deleteLevel = async (id: string): Promise<void> => {
        return await this.repository.deleteLevel(id);
    }

    /**
     * Update levels order
     * @param {TablesUpdate<'Niveau'>[]} updates - List of updates with new order
     * @returns {Promise<void>}
     * @throws {PostgrestError} If query fails
     */
    updateOrder = async (updates: TablesUpdate<'Niveau'>[]): Promise<void> => {
        return await this.repository.updateOrders(updates);
    }
}

export const levelService = new LevelService(new SupabaseLevelRepository());
