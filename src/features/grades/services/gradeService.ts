/**
 * Nom du module/fichier : gradeService.ts
 * 
 * Données en entrée : Les demandes brutes provenant de l'interface (enregistrer, créer un devoir) et des informations à analyser.
 * 
 * Données en sortie : L'exécution de la mécanique intelligente de l'application (calculer une moyenne, vérifier des paliers) et la sous-traitance à la base de données.
 * 
 * Objectif principal : Agir comme le "cerveau" administratif. Ce classeur connaît les règles mathématiques de l'école (comment faire une moyenne en ignorant un élève absent) et protège la base de données de requêtes mal formées.
 * 
 * Ce que ça affiche : Rien, c'est purement du calcul ("Application Service").
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IGradeRepository } from '../repositories/IGradeRepository';

export interface GradeStats {
    average: number;
    highest: number;
    lowest: number;
    count: number;
    totalPossible: number;
}

export class GradeService {
    constructor(private repository: IGradeRepository) {}

    async getEvaluations(userId: string, brancheId?: string, periode?: string) {
        return this.repository.findEvaluationsByContext(userId, brancheId, periode);
    }

    async getAllEvaluationsDetailed(userId: string) {
        return this.repository.findAllEvaluationsDetailed(userId);
    }

    async getAllResultsDetailed(userId: string) {
        return this.repository.findAllResultsDetailed(userId);
    }

    // Processus de création d'un devoir : on crée d'abord la coquille vide (l'évaluation physique en DB), puis s'il y a des petites questions dictées par le prof, le service les greffe automatiquement à la nouvelle coquille.
    async createEvaluation(evaluation: TablesInsert<'Evaluation'>, userId: string, questions?: { id?: string, titre: string, note_max: number, ratio: number, ordre: number }[], regroupements?: any[]) {
        const ev = await this.repository.createEvaluation(evaluation, userId);
        
        if (questions && questions.length > 0) {
            await this.repository.createQuestions(questions.map(q => ({
                ...q,
                evaluation_id: ev.id
            })) as any, userId);
        }
 
        if (regroupements && regroupements.length > 0) {
            await this.repository.upsertRegroupements(regroupements.map((r, idx) => ({
                ...r,
                evaluation_id: ev.id,
                ordre: r.ordre ?? idx
            })), userId);
        }
        
        return ev;
    }

    async updateEvaluation(id: string, evaluation: TablesUpdate<'Evaluation'>, userId: string, questions?: { id?: string, titre: string, note_max: number, ratio: number, ordre: number }[], regroupements?: any[]) {
        const ev = await this.repository.updateEvaluation(id, evaluation, userId);
        
        // Questions handling
        if (questions) {
            const existingQuestions = await this.repository.findQuestionsByEvaluation(id, userId);
            const newQuestionIds = questions.map(q => q.id).filter(qid => !!qid);
            const toDelete = existingQuestions.filter(eq => !newQuestionIds.includes(eq.id));
            
            for (const q of toDelete) {
                await this.repository.deleteQuestion(q.id, userId);
            }
            
            if (questions.length > 0) {
                await this.repository.upsertQuestions(questions.map(q => ({
                    ...q,
                    evaluation_id: ev.id
                })) as any, userId);
            }
        }

        // Regroupements handling
        if (regroupements) {
            const existingRegroups = await this.repository.findRegroupementsByEvaluation(id, userId);
            const newRegroupIds = regroupements.map(r => r.id).filter(rid => !!rid);
            const toDelete = existingRegroups.filter(er => !newRegroupIds.includes(er.id));

            for (const r of toDelete) {
                await this.repository.deleteRegroupement(r.id, userId);
            }

            if (regroupements.length > 0) {
                await this.repository.upsertRegroupements(regroupements.map((r, idx) => {
                    const { isSuggested, ...cleanR } = r; // Remove UI-only properties
                    return {
                        ...cleanR,
                        evaluation_id: ev.id,
                        ordre: r.ordre ?? idx
                    };
                }), userId);
            }
        }

        return ev;
    }

    async deleteEvaluation(id: string, userId: string) {
        return this.repository.deleteEvaluation(id, userId);
    }

    async getDeletedEvaluations(userId: string) {
        return this.repository.findDeletedEvaluations(userId);
    }

    async restoreEvaluation(id: string, userId: string) {
        return this.repository.restoreEvaluation(id, userId);
    }

    async permanentDeleteEvaluation(id: string, userId: string) {
        return this.repository.permanentDeleteEvaluation(id, userId);
    }

    async getQuestions(evaluationId: string, userId: string) {
        return this.repository.findQuestionsByEvaluation(evaluationId, userId);
    }

    async getRegroupements(evaluationId: string, userId: string) {
        return this.repository.findRegroupementsByEvaluation(evaluationId, userId);
    }

    async getResults(userId: string, evaluationId: string) {
        return this.repository.getResultsWithStudents(userId, evaluationId);
    }

    async getResultsForEvaluations(evaluationIds: string[], userId: string) {
        if (!userId) {
            console.error('[GradeService] getResultsForEvaluations called without userId');
            return [];
        }
        return this.repository.findResultsByEvaluations(evaluationIds, userId);
    }

    async getQuestionResults(evaluationId: string, userId: string) {
        return this.repository.findQuestionResultsByEvaluation(evaluationId, userId);
    }

    async getQuestionsForEvaluations(evaluationIds: string[], userId: string) {
        return this.repository.findQuestionsByEvaluations(evaluationIds, userId);
    }
    
    async getQuestionResultsForEvaluations(evaluationIds: string[], userId: string) {
        return this.repository.findQuestionResultsByEvaluations(evaluationIds, userId);
    }

    async getRegroupementsForEvaluations(evaluationIds: string[], userId: string) {
        return this.repository.findRegroupementsByEvaluations(evaluationIds, userId);
    }

    async saveResult(result: TablesInsert<'Resultat'>, userId: string) {
        return this.repository.upsertResult(result, userId);
    }

    async saveResults(results: TablesInsert<'Resultat'>[], userId: string) {
        if (results.length === 0) return [];
        return this.repository.upsertResults(results, userId);
    }

    async saveQuestionResults(results: TablesInsert<'ResultatQuestion'>[], userId: string) {
        if (results.length === 0) return [];
        return this.repository.upsertQuestionResults(results, userId);
    }

    async batchSaveResults(evaluationId: string, userId: string, studentIds: string[], note?: number, statut: string = 'present') {
        const promises = studentIds.map(studentId => 
            this.repository.upsertResult({
                evaluation_id: evaluationId,
                user_id: userId,
                eleve_id: studentId,
                note,
                statut
            }, userId)
        );
        return Promise.all(promises);
    }

    // TypeNote CRUD
    async getNoteTypes(userId: string) {
        return this.repository.findAllNoteTypes(userId);
    }

    async saveNoteType(typeNote: any, userId: string) {
        if (typeNote.id) {
            return this.repository.updateNoteType(typeNote.id, typeNote, userId);
        }
        return this.repository.createNoteType(typeNote, userId);
    }

    async deleteNoteType(id: string, userId: string) {
        return this.repository.deleteNoteType(id, userId);
    }

    // Calcule la note finale d'un élève pour une évaluation donnée, soit à partir de sa note globale, soit en sommant ses critères (questions).
    calculateStudentTotal(studentId: string, evaluation: any, questions: any[], studentResults: any[], studentQuestionResults: any[]): number | null {
        const studentResult = studentResults.find(r => r.eleve_id === studentId);
        
        // Si l'évaluation possède des critères (questions), on recalcule systématiquement le total dynamiquement.
        if (questions.length > 0) {
            // Un élève est considéré comme participant s'il a au moins une note par question OU s'il est explicitement marqué présent
            const hasAnyNote = studentQuestionResults.some(qr => qr.note !== null);
            const isExplicitlyPresent = studentResult?.statut === 'present';
            const isExplicitlyAbsent = studentResult && studentResult.statut !== 'present';

            if (isExplicitlyAbsent || (!hasAnyNote && !isExplicitlyPresent)) return null;

            let weightedSum = 0;
            let maxWeightedSum = 0;
            let noteFound = false;

            const relevantQuestions = questions.filter(q => q.evaluation_id === evaluation.id);
            for (const q of relevantQuestions) {
                const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
                const qMax = parseFloat(q.note_max.toString());
                maxWeightedSum += qMax * ratio;

                const qr = studentQuestionResults.find(r => r.question_id === q.id && r.eleve_id === studentId);
                if (qr && qr.note !== null) {
                    weightedSum += parseFloat(qr.note.toString()) * ratio;
                    noteFound = true;
                }
            }

            if (!noteFound || maxWeightedSum === 0) return null;
            const evalMax = parseFloat(evaluation.note_max?.toString() || '20');
            return parseFloat(((weightedSum / maxWeightedSum) * evalMax).toFixed(2));
        }

        // Sinon, on utilise la note globale enregistrée (si présente et si présent).
        if (!studentResult || studentResult.statut !== 'present') return null;
        return studentResult.note !== null ? parseFloat(studentResult.note.toString()) : null;
    }

    // La calculette interne : elle prend toutes les notes d'un devoir, enlève intelligemment les absents ou les cases vides, puis sort la moyenne, la meilleure et la pire performance.
    calculateStats(results: Tables<'Resultat'>[], noteMax: number): GradeStats {
        const validGrades = results
            .filter(r => r.statut === 'present' && r.note !== null && r.note !== undefined)
            .map(r => r.note as number);

        if (validGrades.length === 0) {
            return { average: 0, highest: 0, lowest: 0, count: 0, totalPossible: noteMax };
        }

        const sum = validGrades.reduce((a, b) => a + b, 0);
        return {
            average: sum / validGrades.length,
            highest: Math.max(...validGrades),
            lowest: Math.min(...validGrades),
            count: validGrades.length,
            totalPossible: noteMax
        };
    }

    getGradeColor(note: number | null, noteMax: number): string {
        if (note === null) return 'text-grey-medium';
        const percentage = (note / noteMax) * 100;
        if (percentage >= 80) return 'text-success';
        if (percentage >= 50) return 'text-info';
        return 'text-danger';
    }

    formatStatut(statut: string): string {
        switch (statut) {
            case 'absent': return 'Absent';
            case 'malade': return 'Non évaluable';
            case 'non_remis': 
            case 'non_rendu': return 'Non remis';
            default: return 'Présent';
        }
    }

    // La machine à convertir : on lui donne une note sur 20 chiffrée, elle la transforme en pourcentage et fouille dans les règles du prof ("Paliers") pour savoir quelle note alphabétique (Lettres) recracher.
    getConversionPalier(note: number | null, noteMax: number, typeNote: any): any | null {
        if (note === null || note === undefined || !typeNote || typeNote.systeme !== 'conversion') return null;
        const config = typeNote.config as any;
        if (!config || !config.paliers || !Array.isArray(config.paliers)) return null;

        const percentage = (note / noteMax) * 100;
        
        return config.paliers.find((p: any) => {
            const min = p.minPercent ?? 0;
            const max = p.maxPercent ?? 0;
            if (percentage >= 100 && max >= 100) return percentage >= min;
            return percentage >= min && percentage < max;
        }) || null;
    }

    convertNoteToLetter(note: number | null, noteMax: number, typeNote: any): string | null {
        const palier = this.getConversionPalier(note, noteMax, typeNote);
        return palier ? palier.letter : null;
    }
}

/**
 * 1. Les Hooks ou les fenêtres de l'application ont besoin de réaliser une action liée aux notes.
 * 2. Ils s'adressent à ce "gradeService" unique au lieu de refaire des maths complexes à chaque composant visuel.
 * 3. Le Service exécute la logique "métier" (calculs de stats, filtres pour absents, pourcentages).
 * 4. S'il faut enregistrer le fruit de ces calculs ou aller lire le grand registre, le `gradeService` délègue poliment cette tâche technique à son sous-traitant spécialisé en base de données (le `repository`).
 */
