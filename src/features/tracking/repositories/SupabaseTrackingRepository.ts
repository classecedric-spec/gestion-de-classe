/**
 * Nom du module/fichier : SupabaseTrackingRepository.ts
 * 
 * Données en entrée : 
 *   - Utilise l'objet `supabase` (lib/database) pour communiquer avec le serveur.
 *   - Reçoit des identifiants d'élèves, de groupes ou d'activités.
 * 
 * Données en sortie : 
 *   - Promesses (Promises) contenant les données brutes de la base de données, formatées selon les besoins de l'application.
 * 
 * Objectif principal : Être le "Bras Armé" du module de suivi. C'est ici que sont écrites les requêtes SQL (via Supabase) pour aller chercher ou enregistrer les progrès des élèves. Il implémente toutes les méthodes définies dans l'interface `ITrackingRepository`.
 */

import { supabase } from '../../../lib/database';
import { TablesInsert, TablesUpdate, Tables } from '../../../types/supabase';
import { ITrackingRepository, ProgressionWithDetails, StudentBasicInfo } from './ITrackingRepository';

/**
 * Implémentation concrète du magasin de données utilisant Supabase (PostgreSQL).
 */
export class SupabaseTrackingRepository implements ITrackingRepository {

    // ==================== LES AVANCEMENTS (PROGRESSIONS) ====================

    /**
     * Récupère les exercices en cours pour une liste d'élèves.
     * Inclut les jointures pour avoir les noms des activités et des modules en une seule fois.
     */
    async fetchProgressions(studentIds: string[], states: string[]): Promise<ProgressionWithDetails[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select(`
        *,
        eleve:Eleve(id, prenom, nom, importance_suivi, Niveau(nom, ordre)),
        activite:Activite(
          *,
          Module(
            *,
            SousBranche(
              branche_id
            )
          )
        )
      `)
            .in('etat', states)
            .in('eleve_id', studentIds)
            .order('updated_at', { ascending: true });

        if (error) throw error;
        return (data as unknown) as ProgressionWithDetails[];
    }

    /**
     * Met à jour le statut d'un exercice dans la base.
     */
    async updateProgressionStatus(id: string, newState: string, isSuivi: boolean): Promise<void> {
        const payload: TablesUpdate<'Progression'> = {
            etat: newState,
            updated_at: new Date().toISOString()
        };

        // Si c'était un suivi manuel, on retire le drapeau une fois validé.
        if (isSuivi) {
            (payload as any).is_suivi = false;
        }

        const { error } = await supabase
            .from('Progression')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
    }

    /** Supprime une ligne de progression. */
    async deleteProgression(id: string): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /** Insertion multiple (bulk insert). */
    async createProgressions(progressions: TablesInsert<'Progression'>[]): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .insert(progressions);

        if (error) throw error;
    }

    /** Création ou Mise à jour (upsert) basée sur le couple (élève, activité). */
    async upsertProgression(progression: TablesInsert<'Progression'>): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .upsert(progression, { onConflict: 'eleve_id,activite_id' });

        if (error) throw error;
    }

    // ==================== L'ENTRAIDE (HELPERS) ====================

    /**
     * Trouve les élèves "Experts" qui ont déjà fini une activité précise.
     */
    async findStudentsByActivityStatus(activityId: string, studentIds: string[], status: string): Promise<StudentBasicInfo[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select('eleve:Eleve(id, prenom, nom, importance_suivi)')
            .eq('activite_id', activityId)
            .eq('etat', status)
            .in('eleve_id', studentIds);

        if (error) throw error;
        return data?.map((p: any) => p.eleve).filter(Boolean) || [];
    }

    // ==================== LES GROUPES / CLASSES ====================

    async getGroupInfo(groupId: string): Promise<{ nom: string } | null> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('nom')
            .eq('id', groupId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Récupère tous les élèves d'un groupe avec leurs informations de niveau scolaire.
     */
    async getStudentsInGroup(groupId: string): Promise<{ ids: string[], full: Tables<'Eleve'>[] }> {
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('eleve_id, Eleve(*, Niveau(*))')
            .eq('groupe_id', groupId);

        if (error) throw error;

        return {
            ids: data.map((d: any) => d.eleve_id),
            full: data.map((d: any) => d.Eleve).filter(Boolean)
        };
    }

    // ==================== PRÉFÉRENCES (RÉGLAGES) ====================

    /** Sauvegarde un réglage (ex: position des colonnes) pour un enseignant précis. */
    async saveUserPreference(userId: string, key: string, value: any): Promise<void> {
        const { error } = await supabase
            .from('UserPreference')
            .upsert({
                user_id: userId,
                key,
                value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });

        if (error) throw error;
    }

    /** Recharge un réglage mémorisé. */
    async loadUserPreference(userId: string, key: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', userId)
            .eq('key', key)
            .maybeSingle();

        if (error) throw error;
        return data?.value || null;
    }

    // ==================== DONNÉES PÉDAGOGIQUES DÉTAILLÉES ====================

    /**
     * Récupère les fiches élèves pour le tableau de bord avec leurs intervenants adultes.
     */
    async getStudentsForPedago(groupId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                importance_suivi,
                Classe (
                    nom,
                    ClasseAdulte (
                        role,
                        Adulte (id, nom, prenom)
                    )
                ),
                Niveau (id, nom),
                EleveGroupe!inner(
                    groupe_id,
                    Groupe(id, nom)
                )
            `)
            .eq('EleveGroupe.groupe_id', groupId)
            .order('prenom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Liste les chapitres actifs (en cours) pour l'affichage de progression.
     */
    async fetchModulesForStudent(_levelId: string | null): Promise<any[]> {
        const { data, error } = await supabase
            .from('Module')
            .select(`
                id, nom, date_fin, sous_branche_id, statut,
                SousBranche:sous_branche_id (
                    nom,
                    ordre,
                    Branche:branche_id (nom, ordre)
                ),
                Activite (
                    id, titre, nombre_exercices, nombre_erreurs, statut_exigence,
                    ActiviteNiveau (niveau_id),
                    Progression (etat, eleve_id)
                )
            `)
            .eq('statut', 'en_cours');

        if (error) throw error;
        return data || [];
    }

    /** Liste tous les modules actifs pour l'interface simplifiée (mobile). */
    async fetchMobileModules(): Promise<any[]> {
        const { data, error } = await supabase
            .from('Module')
            .select(`
                *,
                SousBranche:sous_branche_id (
                    nom,
                    Branche:branche_id (nom)
                ),
                Activite (
                    id,
                    titre,
                    ordre,
                    ActiviteNiveau (niveau_id),
                    ActiviteMateriel (
                        TypeMateriel (acronyme)
                    )
                )
            `)
            .eq('statut', 'en_cours')
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Récupère tous les exercices d'un chapitre avec l'état de réussite de chaque élève.
     */
    async fetchActivitiesForModule(moduleId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                ActiviteNiveau (niveau_id),
                Progression (etat, eleve_id),
                Module (
                    id,
                    SousBranche (
                        id,
                        Branche (
                            id
                        )
                    )
                ),
                ActiviteMateriel (
                    TypeMateriel (
                        acronyme
                    )
                )
            `)
            .eq('module_id', moduleId)
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /** Récupère la liste de tous les avancements d'une liste d'élèves. */
    async fetchGroupProgressions(studentIds: string[]): Promise<any[]> {
        if (studentIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select(`
                eleve_id,
                etat,
                activite_id,
                Activite (
                    Module (
                        SousBranche (
                            branche_id
                        )
                    )
                )
            `)
            .in('eleve_id', studentIds);

        if (error) throw error;
        return data || [];
    }

    /** Construit un dictionnaire (Map) Activité -> État pour un élève précis. */
    async fetchStudentProgressionsMap(studentId: string): Promise<Record<string, string>> {
        const { data, error } = await supabase
            .from('Progression')
            .select('activite_id, etat')
            .eq('eleve_id', studentId);

        if (error) throw error;

        const progMap: Record<string, string> = {};
        data?.forEach(p => {
            if (p.activite_id) {
                progMap[p.activite_id] = p.etat;
            }
        });
        return progMap;
    }

    // ==================== STATISTIQUES DU TABLEAU DE BORD ====================

    /**
     * Calcule les chiffres clés du jour : nombre de mains levées et nombre de réussites.
     */
    async getDashboardStats(filterStudentIds: string[] | null): Promise<{ helpPending: number; validationsToday: number }> {
        if (filterStudentIds !== null && filterStudentIds.length === 0) {
            return { helpPending: 0, validationsToday: 0 };
        }

        // 1. Compte des demandes d'aide et vérifications en attente.
        let queryHelp = supabase
            .from('Progression')
            .select('*, Activite!inner(Module!inner(statut))', { count: 'exact', head: true })
            .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement'])
            .eq('Activite.Module.statut', 'en_cours');

        if (filterStudentIds) {
            queryHelp = queryHelp.in('eleve_id', filterStudentIds);
        }

        const { count: helpCount, error: helpError } = await queryHelp;
        if (helpError) throw helpError;

        // 2. Compte des exercices validés aujourd'hui (depuis minuit).
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let queryVal = supabase
            .from('Progression')
            .select('*, Activite!inner(Module!inner(statut))', { count: 'exact', head: true })
            .eq('etat', 'valide')
            .eq('Activite.Module.statut', 'en_cours')
            .gte('updated_at', today.toISOString());

        if (filterStudentIds) {
            queryVal = queryVal.in('eleve_id', filterStudentIds);
        }

        const { count: valCount, error: valError } = await queryVal;
        if (valError) throw valError;

        return {
            helpPending: helpCount || 0,
            validationsToday: valCount || 0
        };
    }

    /**
     * Récupère tous les modules avec les progressions filtrées pour un seul élève.
     */
    async getModulesWithProgressions(studentId: string, _levelId?: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Module')
            .select(`
                id, nom, date_fin, sous_branche_id, statut,
                SousBranche:sous_branche_id (
                    nom, ordre,
                    Branche:branche_id (nom, ordre)
                ),
                Activite (
                    id, titre, nombre_exercices, nombre_erreurs, statut_exigence,
                    ActiviteNiveau (niveau_id),
                    Progression (etat, eleve_id)
                )
            `)
            .eq('statut', 'en_cours');

        // On nettoie les données pour ne garder que ce qui concerne l'élève demandé.
        if (data) {
            data.forEach((m: any) => {
                if (m.Activite) {
                    m.Activite.forEach((act: any) => {
                        if (act.Progression) {
                            act.Progression = act.Progression.filter((p: any) => p.eleve_id === studentId);
                        }
                    });
                }
            });
        }

        if (error) throw error;
        return data || [];
    }

    /** Récupère les exercices d'un module et l'avancement d'un élève précis. */
    async getModuleActivitiesAndProgressions(moduleId: string, studentId: string): Promise<{ activities: any[], progressions: any[] }> {
        const { data: activities, error: actError } = await supabase
            .from('Activite')
            .select(`
                *,
                ActiviteNiveau (niveau_id)
            `)
            .eq('module_id', moduleId)
            .order('ordre', { ascending: true });

        if (actError) throw actError;

        const { data: progressions, error: progError } = await supabase
            .from('Progression')
            .select('*')
            .eq('eleve_id', studentId)
            .in('activite_id', activities?.map(a => a.id) || []);

        if (progError) throw progError;

        return {
            activities: activities || [],
            progressions: progressions || []
        };
    }

    /**
     * Récupère la liste prioritaire des demandes d'aide pour toute la classe.
     */
    async getHelpRequests(studentIds: string[]): Promise<any[]> {
        if (studentIds.length === 0) return [];

        const { data, error } = await supabase
            .from('Progression')
            .select(`
                *,
                Eleve (id, prenom, nom, photo_url, photo_hash, importance_suivi, Niveau(nom, ordre)),
                Activite (
                    id, titre,
                    Module (id, nom, statut)
                )
            `)
            .in('eleve_id', studentIds)
            .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement'])
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /** Calcule l'état de progression pour une liste d'exercices (utilisé pour les badges). */
    async getProgressionStatsForActivities(activityIds: string[]): Promise<{ activite_id: string, etat: string }[]> {
        if (activityIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select('activite_id, etat')
            .in('activite_id', activityIds);

        if (error) throw error;
        return (data || []) as { activite_id: string, etat: string }[];
    }

    /** Récupère qui travaille sur une activité précise (utilisé dans le détail d'une activité). */
    async fetchProgressionsByActivity(activityId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select('*, Eleve(nom, prenom, photo_url, EleveGroupe(Groupe(nom)))')
            .eq('activite_id', activityId);

        if (error) throw error;
        return data || [];
    }

    /** Historique pédagogique complet d'un élève (utilisé dans son dossier). */
    async fetchStudentProgressDetails(studentId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select(`
                id,
                etat,
                updated_at,
                Activite (
                    id,
                    titre,
                    ordre,
                    ActiviteNiveau ( niveau_id ),
                    Module (
                        id,
                        nom,
                        statut,
                        date_fin,
                        SousBranche (
                            id,
                            nom,
                            ordre,
                            Branche (
                                id,
                                nom,
                                ordre
                            )
                        )
                    )
                )
            `)
            .eq('eleve_id', studentId);

        if (error) throw error;
        return data || [];
    }

    /** Liste tous les exercices appartenant à une série de modules. */
    async getActivitiesByModules(moduleIds: string[]): Promise<any[]> {
        if (moduleIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                Module(
                    id,
                    nom,
                    date_fin,
                    SousBranche(
                        id,
                        nom,
                        ordre,
                        Branche(
                            id,
                            nom,
                            ordre
                        )
                    )
                ),
                ActiviteNiveau(niveau_id)
            `)
            .in('module_id', moduleIds);

        if (error) throw error;
        return data || [];
    }

    /** Récupère les liens d'avancement pour un croisement Élèves / Activités. */
    async getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[]): Promise<any[]> {
        if (studentIds.length === 0 || activityIds.length === 0) return [];

        const CHUNK_SIZE = 50; // On traite par paquets de 50 pour éviter de saturer la connexion.
        let allProgs: any[] = [];

        for (let i = 0; i < activityIds.length; i += CHUNK_SIZE) {
            const chunk = activityIds.slice(i, i + CHUNK_SIZE);
            const { data: chunkProgs, error } = await supabase
                .from('Progression')
                .select('eleve_id, activite_id, etat')
                .in('eleve_id', studentIds)
                .in('activite_id', chunk);

            if (error) throw error;
            if (chunkProgs) {
                allProgs = allProgs.concat(chunkProgs);
            }
        }
        return allProgs;
    }

    /**
     * ALGORITHME DE CONFIANCE :
     * Met à jour le score de maîtrise de l'élève (UserPreference) et sa tendance globale.
     */
    async updateStudentTrust(eleveId: string, branchId: string, adjustment: number, trend: 'up' | 'down' | 'stable'): Promise<void> {
        // 1. Mise à jour de l'indice spécifique à la matière (Français, Maths, etc.)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const currentIndices = await this.loadUserPreference(user.id, 'eleve_profil_competences') || {};
            const studentData = currentIndices[eleveId] || {};
            const currentVal = Number(studentData[branchId] ?? 50);
            const newVal = Math.max(0, Math.min(100, currentVal + adjustment));

            currentIndices[eleveId] = { ...studentData, [branchId]: newVal };
            await this.saveUserPreference(user.id, 'eleve_profil_competences', currentIndices);
        }

        // 2. Mise à jour de l'icône de tendance (flèche qui monte/descend) sur la fiche élève.
        const { error } = await supabase
            .from('Eleve')
            .update({ trust_trend: trend })
            .eq('id', eleveId);

        if (error) throw error;
    }

    /**
     * GESTION DES RELANCES (Avant Mail) :
     * Trouve les exercices qui n'ont pas été terminés et dont la date limite est aujourd'hui.
     */
    async getUnfinishedModulesByDate(studentId: string, date: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Module')
            .select(`
                id, nom, date_fin, sous_branche_id, statut,
                SousBranche:sous_branche_id (
                    nom, ordre,
                    Branche:branche_id (nom, ordre)
                ),
                Activite (
                    id, titre, nombre_exercices, nombre_erreurs, statut_exigence,
                    Progression (etat, eleve_id)
                )
            `)
            .eq('date_fin', date)
            .eq('statut', 'en_cours');

        if (error) throw error;

        if (data) {
            // On filtre manuellement pour ne garder que les modules où l'élève a au moins un exercice non validé.
            const unfinishedModules = data.filter((m: any) => {
                if (m.Activite) {
                    m.Activite.forEach((act: any) => {
                        if (act.Progression) {
                            act.Progression = act.Progression.filter((p: any) => p.eleve_id === studentId);
                        }
                    });
                }

                const hasUnfinishedActivity = m.Activite?.some((activity: any) => {
                    const progression = activity.Progression?.[0];
                    return !progression || progression.etat !== 'valide';
                });

                return hasUnfinishedActivity;
            });

            return unfinishedModules;
        }

        return [];
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant ouvre l'application. Elle demande `getDashboardStats`.
 * 2. REQUÊTE : Le module envoie une requête SQL à Supabase : "Donne moi le nombre de lignes dans Progression où état = 'besoin_d_aide'".
 * 3. RETOUR : Supabase répond "12".
 * 4. TRAITEMENT : Le module transforme ce "12" en un objet propre et le renvoie au Dashboard.
 * 5. AFFICHAGE : L'enseignant voit instantanément le chiffre "12" sur son badge de notification.
 * 6. SÉCURITÉ : Si la base de données renvoie une erreur (ex: coupure réseau), le module "lance" une alerte (throw error) pour que l'application puisse afficher un message d'erreur poli à l'utilisateur.
 */
