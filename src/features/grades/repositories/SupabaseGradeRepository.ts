/**
 * Nom du module/fichier : SupabaseGradeRepository.ts
 * 
 * Données en entrée : Les ordres de gestion des notes (ex: "Enregistre cette liste de cotes", "Donne-moi toutes les évaluations de ce trimestre").
 * 
 * Données en sortie : Les données fraîchement récupérées du serveur distant, ou une confirmation d'enregistrement.
 * 
 * Objectif principal : C'est le traducteur technique officiel. Il prend les ordres simples de notre application (ex: "Crée l'interro") et les traduit en langage serveur sécurisé pour "Supabase". C'est le seul fichier du module 'grades' autorisé à parler directement à la base de données.
 * 
 * Ce que ça affiche : Rien, c'est un fichier de communication pur base de données (Back-End invisible).
 */

import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGradeRepository } from './IGradeRepository';

export class SupabaseGradeRepository implements IGradeRepository {
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseGradeRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }

    async findEvaluationsByContext(userId: string, brancheId?: string, periode?: string): Promise<Tables<'Evaluation'>[]> {
        let query = supabase.from('Evaluation').select('*').eq('user_id', userId);
        
        if (brancheId) {
            query = query.eq('branche_id', brancheId);
        }
        
        if (periode) {
            query = query.eq('periode', periode);
        }
        
        // Soft delete filter
        query = query.is('deleted_at', null);
        
        const { data, error } = await query.order('date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    // Récupère toutes les évaluations, tout en exigeant du serveur qu'il utilise des "Jointures" (Joins) pour rapatrier "en même temps" le nom en clair du Groupe, de la Branche et du Barème (sinon on n'aurait que des suites de chiffres).
    async findAllEvaluationsDetailed(userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('EvaluationWithStats')
            .select(`
                *,
                Groupe (nom),
                Branche (nom),
                TypeNote (nom)
            `)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('date', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async createEvaluation(evaluation: TablesInsert<'Evaluation'>, userId: string): Promise<Tables<'Evaluation'>> {
        const { data, error } = await supabase
            .from('Evaluation')
            .insert({ ...evaluation, user_id: userId })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async updateEvaluation(id: string, evaluation: TablesUpdate<'Evaluation'>, userId: string): Promise<Tables<'Evaluation'>> {
        const { data, error } = await supabase
            .from('Evaluation')
            .update(evaluation)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async deleteEvaluation(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Evaluation')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    async findDeletedEvaluations(userId: string): Promise<Tables<'Evaluation'>[]> {
        const { data, error } = await supabase
            .from('Evaluation')
            .select(`
                *,
                Groupe (nom),
                Branche (nom),
                TypeNote (nom)
            `)
            .eq('user_id', userId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async restoreEvaluation(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Evaluation')
            .update({ deleted_at: null })
            .eq('id', id)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    async permanentDeleteEvaluation(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Evaluation')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    // Questions CRUD
    async findQuestionsByEvaluation(evaluationId: string, userId: string): Promise<Tables<'EvaluationQuestion'>[]> {
        if (!this.validateUserId(userId)) return [];
        
        const { data, error } = await supabase
            .from('EvaluationQuestion')
            .select('*')
            .eq('evaluation_id', evaluationId)
            .order('ordre', { ascending: true });
            
        if (error) {
            console.error("[SupabaseGradeRepository] Error fetching questions:", error);
            return [];
        }
        return data || [];
    }

    async findQuestionsByEvaluations(evaluationIds: string[], userId: string): Promise<Tables<'EvaluationQuestion'>[]> {
        if (!this.validateUserId(userId) || evaluationIds.length === 0) return [];
        const { data, error } = await supabase
            .from('EvaluationQuestion')
            .select('*')
            .in('evaluation_id', evaluationIds)
            .order('ordre', { ascending: true });
            
        if (error) {
            console.error("Error fetching multi-questions:", error);
            throw error;
        }
        return data || [];
    }

    async createQuestions(questions: TablesInsert<'EvaluationQuestion'>[], userId: string): Promise<Tables<'EvaluationQuestion'>[]> {
        const sanitized = questions.map(q => {
            const { id, ...rest } = q as any;
            return id ? q : rest;
        });

        const { data, error } = await supabase
            .from('EvaluationQuestion')
            .insert(sanitized)
            .select();
            
        if (error) throw error;
        return data || [];
    }

    async upsertQuestions(questions: TablesInsert<'EvaluationQuestion'>[], userId: string): Promise<Tables<'EvaluationQuestion'>[]> {
        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        for (const q of questions) {
            const { id, ...rest } = q as any;
            if (id) {
                toUpdate.push(q);
            } else {
                toInsert.push(rest);
            }
        }

        const results: Tables<'EvaluationQuestion'>[] = [];

        if (toUpdate.length > 0) {
            const { data, error } = await supabase
                .from('EvaluationQuestion')
                .upsert(toUpdate, { onConflict: 'id' })
                .select();
            if (error) throw error;
            if (data) results.push(...data);
        }

        if (toInsert.length > 0) {
            const { data, error } = await supabase
                .from('EvaluationQuestion')
                .insert(toInsert)
                .select();
            if (error) throw error;
            if (data) results.push(...data);
        }

        return results;
    }

    async deleteQuestion(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('EvaluationQuestion')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }

    // Resultat CRUD
    async findResultsByEvaluation(evaluationId: string, userId: string): Promise<Tables<'Resultat'>[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Resultat')
            .select('*')
            .eq('evaluation_id', evaluationId)
            .eq('user_id', userId);
            
        if (error) throw error;
        return data || [];
    }

    async findResultsByEvaluations(evaluationIds: string[], userId: string): Promise<Tables<'Resultat'>[]> {
        if (!this.validateUserId(userId) || evaluationIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Resultat')
            .select('*')
            .in('evaluation_id', evaluationIds)
            .eq('user_id', userId);
            
        if (error) throw error;
        return data || [];
    }

    async findAllResultsDetailed(userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
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
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async upsertResults(results: TablesInsert<'Resultat'>[], userId: string): Promise<Tables<'Resultat'>[]> {
        if (results.length === 0) return [];
        const sanitized = results.map(r => {
            const { Eleve, Evaluation, ...rest } = r as any;
            return { ...rest, user_id: userId };
        });
        const { data, error } = await supabase
            .from('Resultat')
            .upsert(sanitized, { onConflict: 'evaluation_id,eleve_id' })
            .select();
            
        if (error) throw error;
        return data || [];
    }

    async upsertResult(result: TablesInsert<'Resultat'>, userId: string): Promise<Tables<'Resultat'>> {
        // Sanitize to remove relationship fields that aren't columns
        const { Eleve, Evaluation, ...sanitized } = result as any;
        const { data, error } = await supabase
            .from('Resultat')
            .upsert({ ...sanitized, user_id: userId }, { onConflict: 'evaluation_id,eleve_id' })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async deleteResult(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Resultat')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    // ResultatQuestion CRUD
    async findQuestionResultsByEvaluation(evaluationId: string, userId: string): Promise<Tables<'ResultatQuestion'>[]> {
        if (!this.validateUserId(userId)) return [];
        
        // We first get the question IDs for this evaluation.
        const questions = await this.findQuestionsByEvaluation(evaluationId, userId);
        const questionIds = questions.map(q => q.id);
        
        if (questionIds.length === 0) return [];

        const { data, error } = await supabase
            .from('ResultatQuestion')
            .select('*')
            .in('question_id', questionIds);
            
        if (error) throw error;
        return data || [];
    }

    async findQuestionResultsByEvaluations(evaluationIds: string[], userId: string): Promise<Tables<'ResultatQuestion'>[]> {
        if (!this.validateUserId(userId) || evaluationIds.length === 0) return [];
        // Filtering by evaluationIds via the joined EvaluationQuestion table
        // and by userId via the joined Evaluation table
        const { data, error } = await supabase
            .from('ResultatQuestion')
            .select('*, EvaluationQuestion!inner(evaluation_id, Evaluation!inner(user_id))')
            .in('EvaluationQuestion.evaluation_id', evaluationIds)
            .eq('EvaluationQuestion.Evaluation.user_id', userId);
            
        if (error) throw error;
        return data || [];
    }

    async upsertQuestionResults(results: TablesInsert<'ResultatQuestion'>[], userId: string): Promise<Tables<'ResultatQuestion'>[]> {
        // Sanitize to remove relationship fields that aren't columns
        const sanitized = results.map(r => {
            const { EvaluationQuestion, ...rest } = r as any;
            return { ...rest };
        });
        
        const { data, error } = await supabase
            .from('ResultatQuestion')
            .upsert(sanitized, { onConflict: 'eleve_id,question_id' })
            .select();
            
        if (error) throw error;
        return data || [];
    }

    // Regroupement CRUD
    async findRegroupementsByEvaluation(evaluationId: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('EvaluationRegroupement')
            .select('*, Evaluation!inner(user_id)')
            .eq('evaluation_id', evaluationId)
            .eq('Evaluation.user_id', userId)
            .order('ordre', { ascending: true });
            
        if (error) throw error;
        return data || [];
    }

    async findRegroupementsByEvaluations(evaluationIds: string[], userId: string): Promise<any[]> {
        if (!this.validateUserId(userId) || evaluationIds.length === 0) return [];
        const { data, error } = await supabase
            .from('EvaluationRegroupement')
            .select('*, Evaluation!inner(user_id)')
            .in('evaluation_id', evaluationIds)
            .eq('Evaluation.user_id', userId)
            .order('ordre', { ascending: true });
            
        if (error) throw error;
        return data || [];
    }

    async upsertRegroupements(regroupements: any[], userId: string): Promise<any[]> {
        const sanitized = regroupements.map(r => {
            const { id, ...rest } = r;
            return id ? r : rest;
        });

        const { data, error } = await supabase
            .from('EvaluationRegroupement')
            .upsert(sanitized, { onConflict: 'id' })
            .select();
            
        if (error) throw error;
        return data || [];
    }

    async deleteRegroupement(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('EvaluationRegroupement')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    }

    // TypeNote CRUD
    async findAllNoteTypes(userId: string): Promise<Tables<'TypeNote'>[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('TypeNote')
            .select('*')
            .eq('user_id', userId)
            .order('nom', { ascending: true });
            
        if (error) throw error;
        return data || [];
    }

    async createNoteType(typeNote: TablesInsert<'TypeNote'>, userId: string): Promise<Tables<'TypeNote'>> {
        const { data, error } = await supabase
            .from('TypeNote')
            .insert({ ...typeNote, user_id: userId })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async updateNoteType(id: string, typeNote: TablesUpdate<'TypeNote'>, userId: string): Promise<Tables<'TypeNote'>> {
        const { data, error } = await supabase
            .from('TypeNote')
            .update(typeNote)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async deleteNoteType(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('TypeNote')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    // Helpers
    async getResultsWithStudents(userId: string, evaluationId: string): Promise<any[]> {
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
            .eq('user_id', userId)
            .eq('evaluation_id', evaluationId);
            
        if (error) throw error;
        return data || [];
    }
}

/**
 * 1. Un service métier de l'application (ex: `gradeService`) a besoin de stocker un résultat d'examen.
 * 2. Il appelle `upsertResult` en lui donnant la note brute et la carte d'identité de l'élève.
 * 3. Ce `SupabaseGradeRepository` prend son "téléphone rouge" (`supabase.from(...)`) et dicte l'ordre exact au gros serveur central en langage technique.
 * 4. Le serveur base de données exécute le calcul et répond avec ses résultats dans `data` (succès) ou un avertissement dans `error` (mauvaise connexion internet par exemple).
 * 5. Le Repository intercepte la réponse, s'assure qu'elle n'est pas cassée, et retransmet la donnée pure au reste de l'application graphique qui l'affichera à l'enseignant.
 */
