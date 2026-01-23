import { Tables, TablesUpdate } from '../../../types/supabase';
import { IClassRepository } from '../repositories/IClassRepository';
import { SupabaseClassRepository } from '../repositories/SupabaseClassRepository';

export interface ClassWithAdults extends Tables<'Classe'> {
    ClasseAdulte: {
        role: string | null;
        Adulte: {
            id: string;
            nom: string | null;
            prenom: string | null;
        } | null;
    }[];
}

export interface StudentWithRelations extends Tables<'Eleve'> {
    Classe: {
        nom: string | null;
    } | null;
    EleveGroupe: {
        Groupe: {
            id: string;
            nom: string | null;
        } | null;
    }[];
}

export class ClassService {
    constructor(private repository: IClassRepository) { }

    /**
     * Récupère toutes les classes avec les adultes référents
     * @returns {Promise<ClassWithAdults[]>} Liste des classes avec détails des adultes
     * @throws {PostgrestError} Si la requête échoue
     */
    getClasses = async (): Promise<ClassWithAdults[]> => {
        return await this.repository.getClasses();
    }

    /**
     * Récupère les élèves d'une classe spécifique
     * @param {string} classId - ID de la classe
     * @returns {Promise<StudentWithRelations[]>} Liste des élèves avec relations
     * @throws {PostgrestError} Si la requête échoue
     */
    getStudentsByClass = async (classId: string): Promise<StudentWithRelations[]> => {
        return await this.repository.getStudentsByClass(classId);
    }

    /**
     * Supprime une classe
     * @param {string} classId - ID de la classe à supprimer
     * @returns {Promise<void>}
     * @throws {PostgrestError} Si la requête échoue
     */
    deleteClass = async (classId: string): Promise<void> => {
        return await this.repository.deleteClass(classId);
    }

    /**
     * Retire un élève de sa classe (met classe_id à null)
     * @param {string} studentId - ID de l'élève
     * @returns {Promise<void>}
     * @throws {PostgrestError} Si la requête échoue
     */
    removeStudentFromClass = async (studentId: string): Promise<void> => {
        return await this.repository.removeStudentFromClass(studentId);
    }

    /**
     * Met à jour un champ spécifique d'un élève
     * @param {string} studentId - ID de l'élève
     * @param {keyof TablesUpdate<'Eleve'>} field - Champ à mettre à jour
     * @param {any} value - Nouvelle valeur
     * @returns {Promise<void>}
     * @throws {PostgrestError} Si la requête échoue
     */
    updateStudentField = async (studentId: string, field: keyof TablesUpdate<'Eleve'>, value: any): Promise<void> => {
        return await this.repository.updateStudentField(studentId, field, value);
    }

    /**
     * Crée une nouvelle classe
     */
    createClass = async (data: any): Promise<{ id: string }> => {
        return await this.repository.createClass(data);
    }

    /**
     * Met à jour une classe existante
     */
    updateClass = async (classId: string, data: any): Promise<void> => {
        return await this.repository.updateClass(classId, data);
    }

    /**
     * Lie un adulte à une classe
     */
    linkAdult = async (classId: string, adultId: string, role: string): Promise<void> => {
        return await this.repository.linkAdult(classId, adultId, role);
    }

    /**
     * Supprime tous les liens adultes-classe
     */
    /**
     * Supprime tous les liens adultes-classe
     */
    unlinkAllAdults = async (classId: string): Promise<void> => {
        return await this.repository.unlinkAllAdults(classId);
    }

    /**
     * Upload le logo de la classe
     */
    uploadLogo = async (classId: string, photoBlob: Blob): Promise<string | null> => {
        return await this.repository.uploadLogo(classId, photoBlob);
    }
}

export const classService = new ClassService(new SupabaseClassRepository());
