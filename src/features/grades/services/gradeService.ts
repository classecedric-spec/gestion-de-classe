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

    async getEvaluations(brancheId?: string, periode?: string) {
        return this.repository.findEvaluationsByContext(brancheId, periode);
    }

    async getAllEvaluationsDetailed() {
        return this.repository.findAllEvaluationsDetailed();
    }

    async getAllResultsDetailed() {
        return this.repository.findAllResultsDetailed();
    }

    // Processus de création d'un devoir : on crée d'abord la coquille vide (l'évaluation physique en DB), puis s'il y a des petites questions dictées par le prof, le service les greffe automatiquement à la nouvelle coquille.
    async createEvaluation(evaluation: TablesInsert<'Evaluation'>, questions?: { titre: string, note_max: number, ratio: number, ordre: number }[]) {
        const ev = await this.repository.createEvaluation(evaluation);
        if (questions && questions.length > 0) {
            await this.repository.createQuestions(questions.map(q => ({
                ...q,
                evaluation_id: ev.id
            })));
        }
        return ev;
    }

    async updateEvaluation(id: string, evaluation: TablesUpdate<'Evaluation'>, questions?: { id?: string, titre: string, note_max: number, ratio: number, ordre: number }[]) {
        const ev = await this.repository.updateEvaluation(id, evaluation);
        
        if (questions) {
            // Find existing questions to know what to delete
            const existingQuestions = await this.repository.findQuestionsByEvaluation(id);
            const newQuestionIds = questions.map(q => q.id).filter(qid => qid !== undefined);
            const toDelete = existingQuestions.filter(eq => !newQuestionIds.includes(eq.id));
            
            // Delete removed questions
            for (const q of toDelete) {
                await this.repository.deleteQuestion(q.id);
            }
            
            // Upsert remaining/new questions
            if (questions.length > 0) {
                await this.repository.upsertQuestions(questions.map(q => ({
                    ...q,
                    evaluation_id: ev.id
                })));
            }
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

    async getResultsForEvaluations(evaluationIds: string[]) {
        return this.repository.findResultsByEvaluations(evaluationIds);
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
