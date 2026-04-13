/**
 * Nom du module/fichier : ITrackingRepository.ts
 * 
 * Objectif principal : Définir le "Contrat de Service" pour les données du suivi. 
 * Ce fichier est une Interface (un moule). Il liste toutes les actions que le logiciel doit pouvoir faire avec la base de données (enregistrer un progrès, chercher un élève tuteur, charger les préférences de l'enseignant). 
 * Utiliser une interface permet de changer de base de données plus facilement à l'avenir sans casser le reste du code.
 */

import { TablesInsert, Tables } from '../../../types/supabase';
import { ProgressionWithDetails, StudentBasicInfo } from '../types/tracking.types';

/**
 * Interface du "Magasin de données" (Repository) pour le module Suivi.
 */
export interface ITrackingRepository {
    // ==================== LES AVANCEMENTS (PROGRESSIONS) ====================

    /**
     * Récupère l'historique des exercices pour un groupe d'élèves.
     */
    fetchProgressions(studentIds: string[], states: string[], userId: string): Promise<ProgressionWithDetails[]>;

    /**
     * Change l'état d'un exercice (ex: passe de "En cours" à "Terminé").
     */
    updateProgressionStatus(id: string, newState: string, isSuivi: boolean, userId: string): Promise<void>;

    /**
     * Supprime une trace d'avancement.
     */
    deleteProgression(id: string, userId: string): Promise<void>;

    /**
     * Enregistre plusieurs avancements d'un coup (importation massive).
     */
    createProgressions(progressions: TablesInsert<'Progression'>[], userId: string): Promise<void>;

    /**
     * Enregistre ou met à jour un avancement s'il existe déjà.
     */
    upsertProgression(progression: TablesInsert<'Progression'>, userId: string): Promise<void>;

    // ==================== L'ENTRAIDE (HELPERS) ====================

    /**
     * Trouve les élèves qui ont déjà fini un exercice précis (pour suggérer des tuteurs).
     */
    findStudentsByActivityStatus(activityId: string, studentIds: string[], status: string, userId: string): Promise<StudentBasicInfo[]>;

    // ==================== LES GROUPES / CLASSES ====================

    /**
     * Récupère le nom d'une classe par son code.
     */
    getGroupInfo(groupId: string, userId: string): Promise<{ nom: string } | null>;

    /**
     * Récupère la liste complète des élèves d'une classe.
     */
    getStudentsInGroup(groupId: string, userId: string): Promise<{ ids: string[], full: Tables<'Eleve'>[] }>;

    // ==================== PRÉFÉRENCES DE L'UTILISATEUR ====================

    /**
     * Mémorise un réglage choisi par l'enseignant (ex: taille des colonnes).
     */
    saveUserPreference(userId: string, key: string, value: any): Promise<void>;

    /**
     * Relit un réglage mémorisé.
     */
    loadUserPreference(userId: string, key: string): Promise<any | null>;

    // ==================== DONNÉES PÉDAGOGIQUES ====================
    
    /** Récupère les élèves pour l'affichage de la grille de suivi. */
    getStudentsForPedago(groupId: string, userId: string): Promise<any[]>;
    
    /** Liste les chapitres disponibles pour un niveau scolaire donné. */
    fetchModulesForStudent(levelId: string | null, userId: string): Promise<any[]>;
    
    /** Liste les chapitres pour l'interface mobile. */
    fetchMobileModules(userId: string): Promise<any[]>;
    
    /** Liste tous les exercices à l'intérieur d'un chapitre. */
    fetchActivitiesForModule(moduleId: string, userId: string): Promise<any[]>;
    
    /** Récupère les avancées globales de toute la classe. */
    fetchGroupProgressions(studentIds: string[], userId: string): Promise<any[]>;
    
    /** Crée une carte (dictionnaire) des progrès d'un élève pour un accès rapide. */
    fetchStudentProgressionsMap(studentId: string, userId: string): Promise<Record<string, string>>;

    // ==================== TABLEAU DE BORD (STATS) ====================
    
    /** Calcule le nombre de mains levées et de validations faites aujourd'hui. */
    getDashboardStats(filterStudentIds: string[] | null, userId: string): Promise<{ helpPending: number; validationsToday: number }>;

    // ==================== RECHERCHES SPÉCIFIQUES (TBI/Vision) ====================
    
    /** Récupère les chapitres avec leurs pourcentages d'avancement. */
    getModulesWithProgressions(studentId: string, userId: string, levelId?: string): Promise<any[]>;
    
    /** Détaille tous les exercices d'un chapitre pour un élève précis. */
    getModuleActivitiesAndProgressions(moduleId: string, studentId: string, userId: string): Promise<{ activities: any[], progressions: any[] }>;
    
    /** Liste toutes les demandes d'aide en cours pour la classe. */
    getHelpRequests(studentIds: string[], userId: string): Promise<any[]>;
    
    /** Statistiques d'état pour une liste d'exercices. */
    getProgressionStatsForActivities(activityIds: string[], userId: string): Promise<{ activite_id: string, etat: string }[]>;
    
    /** Qui a fait quoi sur un exercice précis. */
    fetchProgressionsByActivity(activityId: string, userId: string): Promise<any[]>;
    
    /** Historique complet et détaillé d'un élève. */
    fetchStudentProgressDetails(studentId: string, userId: string): Promise<any[]>;
    
    /** Liste les exercices appartenant à plusieurs chapitres. */
    getActivitiesByModules(moduleIds: string[], userId: string): Promise<any[]>;
    
    /** Récupère les liens entre élèves et exercices spécifiques. */
    getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[], userId: string): Promise<any[]>;
    
    /** Met à jour le score de confiance algorithmique d'un élève. */
    updateStudentTrust(eleveId: string, branchId: string, adjustment: number, trend: 'up' | 'down' | 'stable', userId: string): Promise<void>;

    // Gestion des envois hebdomadaires
    /** Liste les exercices non terminés après une date limite. */
    getUnfinishedModulesByDate(studentId: string, date: string, userId: string): Promise<any[]>;

    /** Supprime les planifications hebdomadaires pour tous les élèves d'un utilisateur à une date donnée. */
    deleteWeeklyPlanning(userId: string, weekStart: string): Promise<void>;
}

export type { ProgressionWithDetails, StudentBasicInfo };

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. BESOIN : L'application veut afficher la liste des élèves de l'atelier "Maths".
 * 2. APPEL : Elle appelle la méthode `getStudentsInGroup(code_classe)`.
 * 3. CONTRAT : L'interface garantit que cette méthode renverra TOUJOURS une liste d'identifiants et de fiches élèves.
 * 4. RÉALISATION : C'est le fichier "SupabaseTrackingRepository" qui fera le vrai travail de discussion avec la base de données pour remplir ce contrat.
 * 5. AVANTAGE : Si demain on change de serveur, on crée un nouveau fichier mais on garde cette interface identique. Le reste de l'application (le Dashboard) n'y verra que du feu.
 */
