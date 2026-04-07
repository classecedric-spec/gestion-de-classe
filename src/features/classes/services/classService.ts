/**
 * Nom du module/fichier : classService.ts
 * 
 * Données en entrée : Informations sur les classes, les élèves et les adultes référents.
 * 
 * Données en sortie : Listes de classes, détails d'une classe, ou confirmation d'actions (création, modification, suppression).
 * 
 * Objectif principal : Centraliser toute l'intelligence métier pour la gestion des structures de classe. Il permet de manipuler les classes, d'y affecter des adultes (professeurs, ATSEM) et de gérer les informations administratives des élèves au sein de ces classes.
 * 
 * Ce que ça affiche : Rien directement. C'est un service de traitement de données.
 */

import { Tables, TablesUpdate } from '../../../types/supabase';
import { IClassRepository } from '../repositories/IClassRepository';
import { SupabaseClassRepository } from '../repositories/SupabaseClassRepository';

/**
 * Interface décrivant une classe enrichie avec les informations des adultes qui y interviennent.
 */
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

/**
 * Interface décrivant un élève avec ses relations (classe, groupes, photo).
 */
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
    photo_base64?: string | null;
    photo_hash: string | null;
}

/**
 * Le service ClassService orchestre toutes les opérations sur les classes de l'école.
 */
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
     * Récupère une classe par son ID avec ses relations
     */
    getClassById = async (classId: string): Promise<ClassWithAdults | null> => {
        return await this.repository.getClassById(classId);
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
     * Retire un élève de sa classe (en remettant l'ID de sa classe à vide)
     * @param {string} studentId - ID de l'élève
     * @returns {Promise<void>}
     * @throws {PostgrestError} Si la requête échoue
     */
    removeStudentFromClass = async (studentId: string): Promise<void> => {
        return await this.repository.removeStudentFromClass(studentId);
    }

    /**
     * Met à jour un champ spécifique d'un élève (ex: changer son nom ou sa photo)
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
     * Crée une nouvelle classe dans la base de données.
     */
    createClass = async (data: any): Promise<{ id: string }> => {
        return await this.repository.createClass(data);
    }

    /**
     * Met à jour le nom ou les propriétés d'une classe existante.
     */
    updateClass = async (classId: string, data: any): Promise<void> => {
        return await this.repository.updateClass(classId, data);
    }

    /**
     * Associe un intervenant adulte (ex: maître/maîtresse) à une classe avec un rôle spécifique.
     */
    linkAdult = async (classId: string, adultId: string, role: string): Promise<void> => {
        return await this.repository.linkAdult(classId, adultId, role);
    }

    /**
     * Supprime tous les liens existants entre les adultes et une classe (utilisé avant un changement d'équipe).
     */
    unlinkAllAdults = async (classId: string): Promise<void> => {
        return await this.repository.unlinkAllAdults(classId);
    }

    /**
     * Gère l'enregistrement d'une image de logo/blason pour personnaliser la classe.
     */
    uploadLogo = async (classId: string, photoBlob: Blob): Promise<string | null> => {
        return await this.repository.uploadLogo(classId, photoBlob);
    }
}

export const classService = new ClassService(new SupabaseClassRepository());

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant accède à l'écran de gestion des classes.
 * 2. Le service demande au dépôt (Repository) la liste des classes.
 * 3. Si l'enseignant choisit une classe précise pour voir les détails :
 *    a. Le service récupère tous les élèves inscrits via `getStudentsByClass`.
 *    b. Il récupère les professeurs et adultes liés à cette classe.
 * 4. Si l'enseignant souhaite modifier la classe :
 *    - Il peut changer le nom du groupe.
 *    - Il peut ajouter ou supprimer des enseignants référents via `linkAdult`.
 * 5. Toutes les modifications métier sont validées ici et transmises à la base de données.
 */
