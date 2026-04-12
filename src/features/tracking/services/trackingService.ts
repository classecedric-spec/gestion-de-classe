/**
 * Nom du module/fichier : trackingService.ts
 * 
 * Données en entrée : 
 *   - Diverses informations selon les méthodes : Identifiants d'élèves, de groupes, d'activités, ou nouveaux statuts de progression.
 *   - Utilise une passerelle de données (`ITrackingRepository`) pour communiquer avec la base de données.
 * 
 * Données en sortie : 
 *   - Des listes d'objets (élèves, modules, progressions) formatées pour être affichées.
 *   - Des confirmations de réussite (Vrai/Faux) pour les enregistrements.
 * 
 * Objectif principal : C'est le "Cœur Logique" du suivi pédagogique. Ce service ne s'occupe pas de l'aspect visuel, mais de la cohérence des données. Il répond à des questions comme : "Quels élèves ont fini cet exercice ?", "Quelles sont les demandes d'aide prioritaires ?", ou "Comment mettre à jour le score de confiance d'un élève ?". Il fait le pont entre les clics de l'enseignant et la mémoire du logiciel (la base de données).
 * 
 * Ce que ça contient : 
 *   - La logique pour filtrer les demandes d'aide (ex: ne montrer que celles des modules actifs).
 *   - La recherche automatique de "tuteurs" (élèves experts).
 *   - La mise à jour des scores et des préférences utilisateur.
 */

import { TablesInsert } from '../../../types/supabase';
import { ITrackingRepository, ProgressionWithDetails, StudentBasicInfo } from '../repositories/ITrackingRepository';
import { SupabaseTrackingRepository } from '../repositories/SupabaseTrackingRepository';

// Ré-exportation des types pour que les autres fichiers sachent à quoi ressemblent les données.
export type { ProgressionWithDetails, StudentBasicInfo };

/**
 * Service de Suivi Pédagogique (Dashboard & Tablettes)
 * Gère les règles métier et délègue l'accès aux données au "Repository".
 */
export class TrackingService {
    constructor(private repository: ITrackingRepository) { }

    /**
     * RÉCUPÉRATION DES ALERTES : 
     * Cherche tous les élèves qui ont levé la main (aide), envoyé un travail (à vérifier) 
     * ou qui stagnent (ajustement).
     */
    async fetchHelpRequests(studentIds: string[], userId: string): Promise<ProgressionWithDetails[]> {
        if (!userId) throw new Error("userId is required in fetchHelpRequests");
        const states = ['besoin_d_aide', 'a_verifier', 'ajustement'];
        // On demande au dépôt de chercher ces statuts précis.
        const progressions = await this.repository.fetchProgressions(studentIds, states, userId);

        // RÈGLE MÉTIER : On ne montre que les demandes liées à des modules actuelement "En cours".
        // Si un enseignant a clôturé un module, les demandes d'aide liées n'apparaissent plus pour ne pas polluer l'écran.
        return progressions.filter(req => {
            if (req.is_suivi) return true; // Sauf si le suivi est forcé manuellement.
            if (!req.activite?.Module) return true;
            return req.activite.Module.statut === 'en_cours';
        });
    }

    /**
     * RECHERCHE DE TUTEURS : 
     * Trouve les élèves qui ont déjà validé l'exercice (statut 'termine') 
     * pour qu'ils puissent aider leurs camarades en difficulté.
     */
    async findHelpers(activityId: string, studentIds: string[], userId: string): Promise<StudentBasicInfo[]> {
        if (!userId) throw new Error("userId is required in findHelpers");
        return await this.repository.findStudentsByActivityStatus(activityId, studentIds, 'termine', userId);
    }

    /**
     * MISE À JOUR DU STATUT : 
     * Change l'état d'un exercice pour un élève (ex: de 'À vérifier' vers 'Terminé').
     */
    async updateProgressionStatus(id: string, newState: string, userId: string, isSuivi: boolean = false): Promise<boolean> {
        if (!userId) throw new Error("userId is required in updateProgressionStatus");
        await this.repository.updateProgressionStatus(id, newState, isSuivi, userId);
        return true;
    }

    /**
     * SCORE DE CONFIANCE : 
     * Ajuste discrètement le "poids" de la parole d'un élève. 
     * Si un élève valide ses exercices avec succès plusieurs fois de suite sans aide, sa "tendance" monte.
     */
    async updateStudentTrust(eleveId: string, branchId: string, adjustment: number, trend: 'up' | 'down' | 'stable', userId: string): Promise<void> {
        if (!userId) throw new Error("userId is required in updateStudentTrust");
        return await this.repository.updateStudentTrust(eleveId, branchId, adjustment, trend, userId);
    }

    /**
     * SUPPRESSION : 
     * Retire une ligne de progression (utilisé pour faire le ménage ou annuler une erreur).
     */
    async deleteProgression(id: string, userId: string): Promise<boolean> {
        if (!userId) throw new Error("userId is required in deleteProgression");
        await this.repository.deleteProgression(id, userId);
        return true;
    }

    /**
     * CRÉATION EN MASSE : 
     * Permet d'injecter plusieurs lignes de suivi d'un coup (ex: début de séance).
     */
    async createProgressions(progressions: TablesInsert<'Progression'>[], userId: string): Promise<boolean> {
        if (!userId) throw new Error("userId is required in createProgressions");
        if (!progressions || progressions.length === 0) {
            throw new Error('Au moins une progression doit être fournie');
        }
        await this.repository.createProgressions(progressions, userId);
        return true;
    }

    /**
     * MISE À JOUR OU CRÉATION (UPSERT) : 
     * Enregistre une progression. Si elle existait déjà, elle est mise à jour, sinon elle est créée.
     */
    async upsertProgression(progression: TablesInsert<'Progression'>, userId: string): Promise<void> {
        if (!userId) throw new Error("userId is required in upsertProgression");
        return await this.repository.upsertProgression(progression, userId);
    }

    /**
     * RÉCUPÉRATION DU NOM DU GROUPE : (ex: CM1-A)
     */
    async fetchGroupInfo(groupId: string, userId: string): Promise<{ nom: string } | null> {
        if (!userId) throw new Error("userId is required in fetchGroupInfo");
        return await this.repository.getGroupInfo(groupId, userId);
    }

    /**
     * LISTE DES ÉLÈVES D'UN GROUPE
     */
    async fetchStudentsInGroup(groupId: string, userId: string) {
        if (!userId) throw new Error("userId is required in fetchStudentsInGroup");
        return await this.repository.getStudentsInGroup(groupId, userId);
    }

    /**
     * PRÉFÉRENCES UTILISATEUR : 
     * Sauvegarde les réglages personnalisés de l'enseignant (ex: largeur des colonnes, thèmes).
     */
    async saveUserPreference(userId: string, key: string, value: any): Promise<void> {
        if (!userId) throw new Error("userId is required in saveUserPreference");
        await this.repository.saveUserPreference(userId, key, value);
    }

    async loadUserPreference(userId: string, key: string): Promise<any | null> {
        if (!userId) throw new Error("userId is required in loadUserPreference");
        return await this.repository.loadUserPreference(userId, key);
    }

    // ==================== MÉTHODES SPÉCIFIQUES POUR L'EXPÉRIENCE ÉLÈVE (MOBILE) ====================

    /** 
     * Récupère tout ce dont un élève a besoin pour son parcours pédagogique.
     */
    async getStudentsForPedago(groupId: string, userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getStudentsForPedago");
        return await this.repository.getStudentsForPedago(groupId, userId);
    }

    async fetchModulesForStudent(levelId: string | null, userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in fetchModulesForStudent");
        return await this.repository.fetchModulesForStudent(levelId, userId);
    }

    async fetchActivitiesForModule(moduleId: string, userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in fetchActivitiesForModule");
        return await this.repository.fetchActivitiesForModule(moduleId, userId);
    }

    async fetchGroupProgressions(studentIds: string[], userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in fetchGroupProgressions");
        return await this.repository.fetchGroupProgressions(studentIds, userId);
    }

    async fetchStudentProgressionsMap(studentId: string, userId: string): Promise<Record<string, string>> {
        if (!userId) throw new Error("userId is required in fetchStudentProgressionsMap");
        return await this.repository.fetchStudentProgressionsMap(studentId, userId);
    }

    async getMobileModules(userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getMobileModules");
        return await this.repository.fetchMobileModules(userId);
    }

    // ==================== MÉTHODES SPÉCIFIQUES POUR LE TABLEAU DE BORD (TBI) ====================

    async getModulesWithProgressions(studentId: string, userId: string, levelId?: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getModulesWithProgressions");
        return await this.repository.getModulesWithProgressions(studentId, userId, levelId);
    }

    async getModuleActivitiesAndProgressions(moduleId: string, studentId: string, userId: string): Promise<{ activities: any[], progressions: any[] }> {
        if (!userId) throw new Error("userId is required in getModuleActivitiesAndProgressions");
        return await this.repository.getModuleActivitiesAndProgressions(moduleId, studentId, userId);
    }

    /** 
     * Redondance de fetchHelpRequests adaptée au format de données du Dashboard principal.
     */
    async getHelpRequests(studentIds: string[], userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getHelpRequests");
        const data = await this.repository.getHelpRequests(studentIds, userId);
        return data.filter((req: any) => {
            if (req.is_suivi) return true;
            return req.activite?.Module?.statut === 'en_cours';
        });
    }

    async getProgressionStatsForActivities(activityIds: string[], userId: string): Promise<{ activite_id: string, etat: string }[]> {
        if (!userId) throw new Error("userId is required in getProgressionStatsForActivities");
        return await this.repository.getProgressionStatsForActivities(activityIds, userId);
    }

    async fetchProgressionsByActivity(activityId: string, userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in fetchProgressionsByActivity");
        return await this.repository.fetchProgressionsByActivity(activityId, userId);
    }

    async fetchStudentProgressDetails(studentId: string, userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in fetchStudentProgressDetails");
        return await this.repository.fetchStudentProgressDetails(studentId, userId);
    }

    async getActivitiesByModules(moduleIds: string[], userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getActivitiesByModules");
        return await this.repository.getActivitiesByModules(moduleIds, userId);
    }

    async getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[], userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getProgressionsForStudentsAndActivities");
        return await this.repository.getProgressionsForStudentsAndActivities(studentIds, activityIds, userId);
    }

    async getUnfinishedModulesByDate(studentId: string, date: string, userId: string): Promise<any[]> {
        if (!userId) throw new Error("userId is required in getUnfinishedModulesByDate");
        return await this.repository.getUnfinishedModulesByDate(studentId, date, userId);
    }
}

// INSTANCE UNIQUE (Singleton) : On crée une seule version de ce service
// et on lui donne un dépôt Supabase pour travailler concrètement.
export const trackingService = new TrackingService(new SupabaseTrackingRepository());

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. APPEL : Le tableau de bord a besoin d'afficher la liste des demandes d'aide.
 * 2. ACTION : Le dashboard appelle `trackingService.fetchHelpRequests(["id_eleve1", ...])`.
 * 3. ANALYSE : Le service demande au Repository de fouiller dans la base de données.
 * 4. FILTRAGE : Le service reçoit 10 demandes. Il remarque que 2 demandes concernent un module que l'enseignant a fermé hier soir.
 * 5. NETTOYAGE : Le service supprime ces 2 demandes de la liste.
 * 6. RETOUR : Il renvoie les 8 demandes d'aide légitimes au dashboard.
 * 7. RÉSULTAT : L'affichage est propre et pertinent pour l'utilisateur final.
 */
