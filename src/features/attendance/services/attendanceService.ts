/**
 * Nom du module/fichier : attendanceService.ts
 * 
 * Données en entrée : 
 *   - Requêtes provenant de l'interface (ex: "Donne-moi les élèves de la classe CE1").
 *   - Données brutes de présences à sauvegarder.
 * 
 * Données en sortie : 
 *   - Listes d'objets (élèves, groupes, présences) formatés pour l'affichage.
 *   - Confirmation de réussite ou d'échec des opérations de sauvegarde.
 * 
 * Objectif principal : Agir comme le "majordome" de l'application pour tout ce qui concerne les présences. Il reçoit les ordres de l'interface, vérifie que les données sont valides (ex: vérifier qu'un nom de configuration n'est pas vide), puis demande au dépôt de données (`repository`) de faire le travail technique avec la base de données. Il centralise les règles métier, comme par exemple s'assurer qu'une catégorie "Absent" existe toujours par défaut.
 */

import { TablesInsert } from '../../../types/supabase';
import { IAttendanceRepository } from '../repositories/IAttendanceRepository';
import { SupabaseAttendanceRepository } from '../repositories/SupabaseAttendanceRepository';
import type {
    Group,
    Student,
    SetupPresence,
    CategoriePresence,
    Attendance,
    AttendanceWithCategory
} from '../repositories/IAttendanceRepository';

// Exportation des types pour qu'ils soient réutilisables dans toute l'application
export type { Group, Student, SetupPresence, CategoriePresence, Attendance };

/**
 * Service pour la gestion des présences.
 * C'est ici qu'on définit "comment" l'application doit se comporter.
 */
export class AttendanceService {
    // Le service utilise un 'repository' pour parler à la base de données.
    // Cela permet de changer de base de données plus tard sans tout réécrire.
    constructor(private repository: IAttendanceRepository) { }

    // ==================== GESTION DES GROUPES (CLASSES) ====================

    /** Récupère toutes les classes rangées par nom. */
    async fetchGroups(userId: string): Promise<Group[]> {
        return await this.repository.getGroups(userId);
    }

    /** Lit une préférence enregistrée (ex: quelle était la dernière classe ouverte). */
    async getUserPreferences(userId: string, key: string): Promise<any> {
        return await this.repository.getUserPreferences(userId, key);
    }

    /** Enregistre une préférence pour l'utilisateur. */
    async saveGroupPreference(userId: string, groupId: string): Promise<void> {
        await this.repository.saveGroupPreference(userId, groupId);
    }

    // ==================== GESTION DES ÉLÈVES ====================

    /** Récupère la liste des élèves d'une classe précise. */
    async fetchStudentsByGroup(groupId: string, userId: string): Promise<Student[]> {
        return await this.repository.getStudentsByGroup(groupId, userId);
    }

    // ==================== CONFIGURATION (SETS & CATÉGORIES) ====================

    /** Récupère les types d'appels (Matin, Cantine, etc.). */
    async fetchSetups(userId: string): Promise<SetupPresence[]> {
        return await this.repository.getSetups(userId);
    }

    /** Récupère les statuts (Présent, Absent, etc.) liés à un type d'appel. */
    async fetchCategories(setupId: string, userId: string): Promise<CategoriePresence[]> {
        return await this.repository.getCategories(setupId, userId);
    }

    /** Crée un nouveau type d'appel après avoir vérifié que le nom est correct. */
    async createSetup(userId: string, name: string, description: string | null): Promise<SetupPresence> {
        // Règle métier : impossible de créer un type d'appel sans nom
        if (!name || name.trim().length === 0) {
            throw new Error('Le nom du setup est requis');
        }

        return await this.repository.createSetup(userId, name.trim(), description);
    }

    /** Modifie un type d'appel existant. */
    async updateSetup(id: string, userId: string, name: string, description: string | null): Promise<void> {
        if (!name || name.trim().length === 0) {
            throw new Error('Le nom du setup est requis');
        }

        await this.repository.updateSetup(id, userId, name.trim(), description);
    }

    /** Supprime un type d'appel. */
    async deleteSetup(id: string, userId: string): Promise<void> {
        await this.repository.deleteSetup(id, userId);
    }

    /** Enregistre plusieurs catégories de présence d'un coup. */
    async upsertCategories(categories: TablesInsert<'CategoriePresence'>[], userId: string): Promise<void> {
        await this.repository.upsertCategories(categories, userId);
    }

    /** Supprime un statut de présence spécifique. */
    async deleteCategory(id: string, userId: string): Promise<void> {
        await this.repository.deleteCategory(id, userId);
    }

    /** Sécurité : s'assure que le statut 'Absent' est toujours disponible. */
    async ensureAbsentCategory(setupId: string, userId: string): Promise<void> {
        await this.repository.ensureAbsentCategory(setupId, userId);
    }

    // ==================== SAISIE DES PRÉSENCES ====================

    /** Récupère l'état de l'appel pour un jour et une heure donnés. */
    async fetchAttendances(date: string, period: string, studentIds: string[], setupId: string, userId: string): Promise<Attendance[]> {
        return await this.repository.getAttendances(date, period, studentIds, setupId, userId);
    }

    /** Vérifie si un appel a déjà été commencé pour guider l'enseignant. */
    async checkExistingSetup(date: string, period: string, studentIds: string[], userId: string): Promise<string | undefined> {
        return await this.repository.checkExistingSetup(date, period, studentIds, userId);
    }

    /** Enregistre la présence d'un élève. */
    async upsertAttendance(attendanceRecord: Partial<Attendance> & { id?: string }, userId: string): Promise<Attendance> {
        return await this.repository.upsertAttendance(attendanceRecord, userId);
    }

    /** Annule la saisie de présence pour un élève (le remet en 'Non assigné'). */
    async deleteAttendance(id: string, userId: string): Promise<void> {
        await this.repository.deleteAttendance(id, userId);
    }

    /** Enregistre les présences de toute une classe d'un coup. */
    async bulkInsertAttendances(records: TablesInsert<'Attendance'>[], userId: string): Promise<Attendance[]> {
        return await this.repository.bulkInsertAttendances(records, userId);
    }

    // ==================== RAPPORTS ET STATISTIQUES ====================

    /** Trouve toutes les dates où un appel a été réalisé. */
    async fetchDistinctDates(setupId: string, userId: string): Promise<string[]> {
        return await this.repository.getDistinctDates(setupId, userId);
    }

    /** Récupère toutes les données de présences entre deux dates (pour les PDF). */
    async fetchAttendanceRange(start: string, end: string, userId: string): Promise<AttendanceWithCategory[]> {
        return await this.repository.getAttendanceRange(start, end, userId);
    }

    /** 
     * Recopie les présences du matin vers l'après-midi. 
     * Vérifie d'abord qu'on ne recopie pas sur la même période.
     */
    async copyPeriodData(date: string, setupId: string, fromPeriod: string, toPeriod: string, userId: string): Promise<void> {
        if (fromPeriod === toPeriod) {
            throw new Error('Les périodes source et destination doivent être différentes');
        }

        await this.repository.copyPeriodData(date, setupId, fromPeriod, toPeriod, userId);
    }

    /** Récupère les données optimisées pour l'affichage sur téléphone mobile. */
    async getMobileAttendance(userId: string, date: string): Promise<any[]> {
        return await this.repository.getMobileData(userId, date);
    }
}

// On crée une seule instance du service (Singleton) pour toute l'application.
// Elle utilise l'implémentation Supabase par défaut.
export const attendanceService = new AttendanceService(new SupabaseAttendanceRepository());

export default attendanceService;
/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. APPEL : L'interface appelle une fonction (ex: `createSetup`).
 * 2. VÉRIFICATION : Le service vérifie si les données sont cohérentes (ex: le nom est-il rempli ?).
 * 3. DÉLÉGATION : Si tout est bon, il transmet l'ordre au `repository`.
 * 4. RETOUR : Il renvoie le résultat (ou l'erreur) à l'interface pour affichage.
 */
