import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { LevelWithStudentCount } from '../../../types';

export interface ILevelRepository {
    getLevels(): Promise<LevelWithStudentCount[]>;
    getStudentsByLevel(levelId: string): Promise<Tables<'Eleve'>[]>;
    createLevel(level: TablesInsert<'Niveau'>): Promise<LevelWithStudentCount>;
    updateLevel(id: string, updates: TablesUpdate<'Niveau'>): Promise<LevelWithStudentCount>;
    deleteLevel(id: string): Promise<void>;
    updateOrders(updates: TablesUpdate<'Niveau'>[]): Promise<void>;
    getMaxOrder(): Promise<number>;
}
