/**
 * Nom du module/fichier : IAttendanceRepository.ts
 * 
 * Objectif principal : Définir le contrat de service pour la gestion des présences (Attendance).
 * Ce fichier est une Interface (un moule). Il liste toutes les actions que le système doit pouvoir effectuer avec la base de données concernant les appels, les retards, et les configurations de présence (matin/après-midi, cantine, etc.).
 * Utiliser cette interface permet de séparer la logique métier (l'appel) de la technique (Supabase).
 */

import { Tables, TablesInsert } from '../../../types/supabase';

/**
 * Types de données métier utilisés dans le module Présence.
 */
export type Group = Tables<'Groupe'>;
export type Student = Tables<'Eleve'> & {
    Classe: { nom: string } | null;
    Niveau: { nom: string; ordre: number | null } | null;
    importance_suivi?: number | null;
    trust_trend?: 'up' | 'down' | 'stable' | null;
    photo_base64?: string | null;
};
export type SetupPresence = Tables<'SetupPresence'>;
export type CategoriePresence = Tables<'CategoriePresence'>;
export type Attendance = Tables<'Attendance'>;
export type AttendanceWithCategory = Attendance & {
    CategoriePresence: { nom: string } | null
};

/**
 * Interface du "Magasin de données" (Repository) pour les Présences.
 */
export interface IAttendanceRepository {
    // ==================== GESTION DES GROUPES ====================
    
    /** Récupère la liste des classes/groupes disponibles. */
    getGroups(userId: string): Promise<Group[]>;
    
    /** Récupère les réglages de l'enseignant (ex: groupe favori). */
    getUserPreferences(userId: string, key: string): Promise<any>;
    
    /** Mémorise le groupe de travail actuel de l'enseignant. */
    saveGroupPreference(userId: string, groupId: string): Promise<void>;

    // ==================== ÉLÈVES ====================
    
    /** Liste les élèves d'une classe pour faire l'appel. */
    getStudentsByGroup(groupId: string, userId: string): Promise<Student[]>;

    // ==================== CONFIGURATION DES APPELS (SETUPS) ====================
    
    /** Récupère les différents types d'appels (ex: Matin, Étude, Cantine). */
    getSetups(userId: string): Promise<SetupPresence[]>;
    
    /** Récupère les statuts possibles pour un appel (Présent, Absent, Retard, etc.). */
    getCategories(setupId: string, userId: string): Promise<CategoriePresence[]>;
    
    /** Crée une nouvelle configuration d'appel personnalisée. */
    createSetup(userId: string, name: string, description: string | null): Promise<SetupPresence>;
    
    /** Modifie le nom ou la description d'un type d'appel. */
    updateSetup(id: string, userId: string, name: string, description: string | null): Promise<void>;
    
    /** Supprime un type d'appel. */
    deleteSetup(id: string, userId: string): Promise<void>;

    /** Sauvegarde le nouvel ordre des types d'appels. */
    updateSetupOrders(updates: { id: string; ordre: number }[], userId: string): Promise<void>;
    
    /** Enregistre ou met à jour les catégories (statuts) liées à un appel. */
    upsertCategories(categories: TablesInsert<'CategoriePresence'>[], userId: string): Promise<void>;
    
    /** Supprime un statut (ex: retirer 'Sortie anticipée'). */
    deleteCategory(id: string, userId: string): Promise<void>;
    
    /** Sécurité : s'assure qu'un statut 'Absent' existe toujours pour que l'appel soit valide. */
    ensureAbsentCategory(setupId: string, userId: string): Promise<void>;

    // ==================== L'APPEL (ATTENDANCE) ====================
    
    /** Récupère les présences déjà enregistrées pour une date et une période précise. */
    getAttendances(date: string, period: string, studentIds: string[], setupId: string, userId: string): Promise<Attendance[]>;
    
    /** Vérifie s'il existe déjà un appel pour ce moment afin d'éviter les doublons. */
    checkExistingSetup(date: string, period: string, studentIds: string[], userId: string): Promise<string | undefined>;
    
    /** Enregistre le statut d'un élève (ex: Paul est présent). */
    upsertAttendance(attendanceRecord: Partial<Attendance> & { id?: string }, userId: string): Promise<Attendance>;
    
    /** Annule une ligne d'appel. */
    deleteAttendance(id: string, userId: string): Promise<void>;
    
    /** Enregistre l'appel pour toute la classe d'un seul coup. */
    bulkInsertAttendances(records: TablesInsert<'Attendance'>[], userId: string): Promise<Attendance[]>;

    // ==================== RAPPORTS ET HISTORIQUE ====================
    
    /** Liste les jours où un appel a été effectué (pour le calendrier). */
    getDistinctDates(setupId: string, userId: string): Promise<string[]>;
    
    /** Récupère toutes les présences sur une période (pour l'export PDF). */
    getAttendanceRange(start: string, end: string, userId: string): Promise<AttendanceWithCategory[]>;
    
    /** Utilitaire : copie l'appel du matin vers l'après-midi pour gagner du temps. */
    copyPeriodData(date: string, setupId: string, fromPeriod: string, toPeriod: string, userId: string): Promise<void>;

    // ==================== MOBILITÉ ====================
    
    /** Récupère les données optimisées pour faire l'appel sur smartphone. */
    getMobileData(userId: string, date: string): Promise<{ student: any, attendances: any }[]>;
    
    /** Calcule le nombre de présents/absents pour le résumé du tableau de bord. */
    getDailySummary(userId: string, date: string, period: string): Promise<{ present: number; absent: number; hasEncoding: boolean }>;
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. BESOIN : L'enseignant veut faire l'appel du matin.
 * 2. PRÉPARATION : L'application demande `getStudentsByGroup` et `getCategories`.
 * 3. SAISIE : L'enseignant clique sur "Absent" pour Julie.
 * 4. ACTION : L'application appelle `upsertAttendance` pour Julie.
 * 5. CONTRAT : L'interface garantit que les données seront envoyées avec le bon identifiant d'élève et le bon statut.
 * 6. VÉRIFICATION : À tout moment, `getDailySummary` peut être appelé pour afficher "24 Présents / 1 Absent" en haut de l'écran.
 */
