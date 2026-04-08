/**
 * Nom du module/fichier : IGradeRepository.ts
 * 
 * Données en entrée : Rien de physique. C'est un document juridique (une "Interface").
 * 
 * Données en sortie : Un contrat strict définissant toutes les méthodes que la base de données DOIT posséder.
 * 
 * Objectif principal : Agir comme un cahier des charges. Si demain le professeur décide de quitter la technologie "Supabase" pour passer chez un autre fournisseur, le code sait exactement quelles fonctions il faut recréer pour que le carnet de cotes fonctionne à l'identique.
 * 
 * Ce que ça affiche : Absolument rien à l'écran, ce n'est que de la "loi" pour les développeurs.
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export interface IGradeRepository {
    // Evaluation CRUD
    findEvaluationsByContext(brancheId?: string, periode?: string): Promise<Tables<'Evaluation'>[]>;
    findAllEvaluationsDetailed(): Promise<any[]>;
    createEvaluation(evaluation: TablesInsert<'Evaluation'>): Promise<Tables<'Evaluation'>>;
    updateEvaluation(id: string, evaluation: TablesUpdate<'Evaluation'>): Promise<Tables<'Evaluation'>>;
    deleteEvaluation(id: string): Promise<void>;

    // Questions CRUD
    findQuestionsByEvaluation(evaluationId: string): Promise<Tables<'EvaluationQuestion'>[]>;
    createQuestions(questions: TablesInsert<'EvaluationQuestion'>[]): Promise<Tables<'EvaluationQuestion'>[]>;
    upsertQuestions(questions: TablesInsert<'EvaluationQuestion'>[]): Promise<Tables<'EvaluationQuestion'>[]>;
    deleteQuestion(id: string): Promise<void>;

    // Resultat CRUD
    findResultsByEvaluation(evaluationId: string): Promise<Tables<'Resultat'>[]>;
    findResultsByEvaluations(evaluationIds: string[]): Promise<Tables<'Resultat'>[]>;
    findAllResultsDetailed(): Promise<any[]>;
    upsertResult(result: TablesInsert<'Resultat'>): Promise<Tables<'Resultat'>>;
    deleteResult(id: string): Promise<void>;

    // Question Results CRUD
    findQuestionResultsByEvaluation(evaluationId: string): Promise<Tables<'ResultatQuestion'>[]>;
    upsertQuestionResults(results: TablesInsert<'ResultatQuestion'>[]): Promise<Tables<'ResultatQuestion'>[]>;

    // Regroupement CRUD
    findRegroupementsByEvaluation(evaluationId: string): Promise<any[]>;
    upsertRegroupements(regroupements: any[]): Promise<any[]>;
    deleteRegroupement(id: string): Promise<void>;

    // TypeNote CRUD
    findAllNoteTypes(): Promise<Tables<'TypeNote'>[]>;
    createNoteType(typeNote: TablesInsert<'TypeNote'>): Promise<Tables<'TypeNote'>>;
    updateNoteType(id: string, typeNote: TablesUpdate<'TypeNote'>): Promise<Tables<'TypeNote'>>;
    deleteNoteType(id: string): Promise<void>;

    // Helpers
    getResultsWithStudents(evaluationId: string): Promise<any[]>;
}

/**
 * 1. Un composant visuel (ex: la calculette de correction) a besoin d'enregistrer une note.
 * 2. Il lit ce contrat (`IGradeRepository`) pour voir quel est le vocabulaire officiel à utiliser (ex: il voit l'existence de `upsertResult`).
 * 3. L'exécutant réel (`SupabaseGradeRepository`), qui a signé ce contrat, prend le relais et exécute la tâche de sauvegarde physique vers le cloud.
 */
