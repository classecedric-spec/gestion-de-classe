import { Tables, TablesInsert } from '../../../types/supabase';
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

    async getEvaluations(brancheId?: string, periode?: string) {
        return this.repository.findEvaluationsByContext(brancheId, periode);
    }

    async createEvaluation(evaluation: TablesInsert<'Evaluation'>, questions?: { titre: string, note_max: number, ordre: number }[]) {
        const ev = await this.repository.createEvaluation(evaluation);
        if (questions && questions.length > 0) {
            await this.repository.createQuestions(questions.map(q => ({
                ...q,
                evaluation_id: ev.id
            })));
        }
        return ev;
    }

    async deleteEvaluation(id: string) {
        return this.repository.deleteEvaluation(id);
    }

    async getQuestions(evaluationId: string) {
        return this.repository.findQuestionsByEvaluation(evaluationId);
    }

    async getResults(evaluationId: string) {
        return this.repository.getResultsWithStudents(evaluationId);
    }

    async getQuestionResults(evaluationId: string) {
        return this.repository.findQuestionResultsByEvaluation(evaluationId);
    }

    async saveResult(result: TablesInsert<'Resultat'>) {
        return this.repository.upsertResult(result);
    }

    async saveQuestionResults(results: TablesInsert<'ResultatQuestion'>[]) {
        if (results.length === 0) return [];
        return this.repository.upsertQuestionResults(results);
    }

    async batchSaveResults(evaluationId: string, userId: string, studentIds: string[], note?: number, statut: string = 'present') {
        const promises = studentIds.map(studentId => 
            this.repository.upsertResult({
                evaluation_id: evaluationId,
                user_id: userId,
                eleve_id: studentId,
                note,
                statut
            })
        );
        return Promise.all(promises);
    }

    // TypeNote CRUD
    async getNoteTypes() {
        return this.repository.findAllNoteTypes();
    }

    async saveNoteType(typeNote: any) {
        if (typeNote.id) {
            return this.repository.updateNoteType(typeNote.id, typeNote);
        }
        return this.repository.createNoteType(typeNote);
    }

    async deleteNoteType(id: string) {
        return this.repository.deleteNoteType(id);
    }

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
        if (note === null) return 'text-gray-400';
        const percentage = (note / noteMax) * 100;
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 50) return 'text-blue-600';
        return 'text-red-600';
    }

    formatStatut(statut: string): string {
        switch (statut) {
            case 'absent': return 'Absent';
            case 'malade': return 'Malade';
            case 'non_rendu': return 'Non rendu';
            default: return 'Présent';
        }
    }
}
