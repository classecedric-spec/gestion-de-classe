import { Tables } from './supabase';

export interface LevelWithStudentCount extends Tables<'Niveau'> {
    Eleve: { count: number }[];
}

export type Student = Tables<'Eleve'>;
export type Level = Tables<'Niveau'>;
export type Class = Tables<'Classe'>;
export type Group = Tables<'Groupe'>;
