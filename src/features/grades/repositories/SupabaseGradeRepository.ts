import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGradeRepository } from './IGradeRepository';

export class SupabaseGradeRepository implements IGradeRepository {
    async findEvaluationsByContext(brancheId?: string, periode?: string): Promise<Tables<'Evaluation'>[]> {
        let query = supabase.from('Evaluation').select('*');
        
        if (brancheId) {
            query = query.eq('branche_id', brancheId);
        }
        
        if (periode) {
            query = query.eq('periode', periode);
        }
        
        const { data, error } = await query.order('date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async findAllEvaluationsDetailed(): Promise<any[]> {
        const { data, error } = await supabase
            .from('EvaluationWithStats')
            .select(`
                *,
                Groupe (nom),
                Branche (nom),
                TypeNote (nom)
            `)
            .order('date', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async createEvaluation(evaluation: TablesInsert<'Evaluation'>): Promise<Tables<'Evaluation'>> {
        const { data, error } = await supabase
            .from('Evaluation')
            .insert(evaluation)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async updateEvaluation(id: string, evaluation: TablesUpdate<'Evaluation'>): Promise<Tables<'Evaluation'>> {
        const { data, error } = await supabase
            .from('Evaluation')
            .update(evaluation)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async deleteEvaluation(id: string): Promise<void> {
        const { error } = await supabase
            .from('Evaluation')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }

    // Questions CRUD
    async findQuestionsByEvaluation(evaluationId: string): Promise<Tables<'EvaluationQuestion'>[]> {
        const { data, error } = await supabase
            .from('EvaluationQuestion')
            .select('*')
            .eq('evaluation_id', evaluationId)
            .order('ordre', { ascending: true });
            
        if (error) throw error;
        return data || [];
    }

    async createQuestions(questions: TablesInsert<'EvaluationQuestion'>[]): Promise<Tables<'EvaluationQuestion'>[]> {
        const { data, error } = await supabase
            .from('EvaluationQuestion')
            .insert(questions)
            .select();
            
        if (error) throw error;
        return data || [];
    }

    async deleteQuestion(id: string): Promise<void> {
        const { error } = await supabase
            .from('EvaluationQuestion')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }

    // Resultat CRUD
    async findResultsByEvaluation(evaluationId: string): Promise<Tables<'Resultat'>[]> {
        const { data, error } = await supabase
            .from('Resultat')
            .select('*')
            .eq('evaluation_id', evaluationId);
            
        if (error) throw error;
        return data || [];
    }

    async findResultsByEvaluations(evaluationIds: string[]): Promise<Tables<'Resultat'>[]> {
        if (evaluationIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Resultat')
            .select('*')
            .in('evaluation_id', evaluationIds);
            
        if (error) throw error;
        return data || [];
    }

    async findAllResultsDetailed(): Promise<any[]> {
        const { data, error } = await supabase
            .from('Resultat')
            .select(`
                *,
                Eleve (id, nom, prenom),
                Evaluation (
                    id, 
                    titre, 
                    date, 
                    periode,
                    max_note_evaluation,
                    Groupe (id, nom),
                    Branche (id, nom),
                    TypeNote (id, nom)
                )
            `)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async upsertResult(result: TablesInsert<'Resultat'>): Promise<Tables<'Resultat'>> {
        const { data, error } = await supabase
            .from('Resultat')
            .upsert(result, { onConflict: 'evaluation_id,eleve_id' })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async deleteResult(id: string): Promise<void> {
        const { error } = await supabase
            .from('Resultat')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }

    // ResultatQuestion CRUD
    async findQuestionResultsByEvaluation(evaluationId: string): Promise<Tables<'ResultatQuestion'>[]> {
        const { data, error } = await supabase
            .from('ResultatQuestion')
            .select('*, EvaluationQuestion!inner(*)')
            .eq('EvaluationQuestion.evaluation_id', evaluationId);
            
        if (error) throw error;
        return data || [];
    }

    async upsertQuestionResults(results: TablesInsert<'ResultatQuestion'>[]): Promise<Tables<'ResultatQuestion'>[]> {
        const { data, error } = await supabase
            .from('ResultatQuestion')
            .upsert(results, { onConflict: 'eleve_id,question_id' })
            .select();
            
        if (error) throw error;
        return data || [];
    }

    // TypeNote CRUD
    async findAllNoteTypes(): Promise<Tables<'TypeNote'>[]> {
        const { data, error } = await supabase
            .from('TypeNote')
            .select('*')
            .order('nom', { ascending: true });
            
        if (error) throw error;
        return data || [];
    }

    async createNoteType(typeNote: TablesInsert<'TypeNote'>): Promise<Tables<'TypeNote'>> {
        const { data, error } = await supabase
            .from('TypeNote')
            .insert(typeNote)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async updateNoteType(id: string, typeNote: TablesUpdate<'TypeNote'>): Promise<Tables<'TypeNote'>> {
        const { data, error } = await supabase
            .from('TypeNote')
            .update(typeNote)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async deleteNoteType(id: string): Promise<void> {
        const { error } = await supabase
            .from('TypeNote')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }

    // Helpers
    async getResultsWithStudents(evaluationId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Resultat')
            .select(`
                *,
                Eleve (
                    id,
                    nom,
                    prenom,
                    photo_url
                )
            `)
            .eq('evaluation_id', evaluationId);
            
        if (error) throw error;
        return data || [];
    }
}
