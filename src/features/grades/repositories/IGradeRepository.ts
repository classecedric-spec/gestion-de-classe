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

    // TypeNote CRUD
    findAllNoteTypes(): Promise<Tables<'TypeNote'>[]>;
    createNoteType(typeNote: TablesInsert<'TypeNote'>): Promise<Tables<'TypeNote'>>;
    updateNoteType(id: string, typeNote: TablesUpdate<'TypeNote'>): Promise<Tables<'TypeNote'>>;
    deleteNoteType(id: string): Promise<void>;

    // Helpers
    getResultsWithStudents(evaluationId: string): Promise<any[]>;
}
