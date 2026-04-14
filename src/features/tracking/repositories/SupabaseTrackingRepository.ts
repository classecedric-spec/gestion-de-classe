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
    /**
     * Sécurité : Valide que l'identifiant utilisateur est présent et correct.
     * Empêche les erreurs Supabase 400 (Bad Request) dues à des paramètres 'undefined'.
     */
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseTrackingRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }

    // ==================== LES AVANCEMENTS (PROGRESSIONS) ====================

    /**
     * Récupère les exercices en cours pour une liste d'élèves.
     * Inclut les jointures pour avoir les noms des activités et des modules en une seule fois.
     */
    async fetchProgressions(studentIds: string[], states: string[], userId: string): Promise<ProgressionWithDetails[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select(`
        *,
        eleve:Eleve!inner(id, prenom, nom, importance_suivi, titulaire_id, Niveau(nom, ordre)),
        activite:Activite!inner(
          *,
          ActiviteMateriel(*, TypeMateriel(*)),
          Module!inner(
            *,
            user_id,
            SousBranche(
              branche_id
            )
          )
        )
      `)
            .in('etat', states)
            .in('eleve_id', studentIds)
            .eq('eleve.titulaire_id', userId)
            .eq('activite.Module.user_id', userId)
            .order('updated_at', { ascending: true });

        if (error) throw error;
        return (data as unknown) as ProgressionWithDetails[];
    }

    /**
     * Met à jour le statut d'un exercice dans la base.
     */
    async updateProgressionStatus(id: string, newState: string, isSuivi: boolean, userId: string): Promise<void> {
        const payload: TablesUpdate<'Progression'> = {
            etat: newState,
            updated_at: new Date().toISOString()
        };

        // Si c'était un suivi manuel, on retire le drapeau une fois validé.
        if (isSuivi) {
            (payload as any).is_suivi = false;
        }

        // Pour sécuriser, on s'appuie sur RLS. 
        // On s'assure que l'opération est liée à l'utilisateur via l'ID de progression.
        const { error } = await supabase
            .from('Progression')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
    }

    /** Supprime une ligne de progression. */
    async deleteProgression(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /** Insertion multiple (bulk insert). */
    async createProgressions(progressions: TablesInsert<'Progression'>[], userId: string): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .insert(progressions);

        if (error) throw error;
    }

    /** Création ou Mise à jour (upsert) basée sur le couple (élève, activité). */
    async upsertProgression(progression: TablesInsert<'Progression'>, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .upsert(progression, { onConflict: 'eleve_id,activite_id' });

        if (error) throw error;
    }

    // ==================== L'ENTRAIDE (HELPERS) ====================

    /**
     * Trouve les élèves "Experts" qui ont déjà fini une activité précise.
     */
    async findStudentsByActivityStatus(activityId: string, studentIds: string[], status: string, userId: string): Promise<StudentBasicInfo[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select('eleve:Eleve!inner(id, prenom, nom, importance_suivi, titulaire_id)')
            .eq('activite_id', activityId)
            .eq('etat', status)
            .in('eleve_id', studentIds)
            .eq('eleve.titulaire_id', userId);

        if (error) throw error;
        return data?.map((p: any) => p.eleve).filter(Boolean) || [];
    }

    // ==================== LES GROUPES / CLASSES ====================

    async getGroupInfo(groupId: string, userId: string): Promise<{ nom: string } | null> {
        if (!this.validateUserId(userId)) return null;
        const { data, error } = await supabase
            .from('Groupe')
            .select('nom')
            .eq('id', groupId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Récupère tous les élèves d'un groupe avec leurs informations de niveau scolaire.
     */
    async getStudentsInGroup(groupId: string, userId: string): Promise<{ ids: string[], full: Tables<'Eleve'>[] }> {
        if (!this.validateUserId(userId)) {
            console.warn('[TrackingRepo] getStudentsInGroup aborted: invalid userId', userId);
            return { ids: [], full: [] };
        }
        
        console.log('[TrackingRepo] Fetching students in group:', groupId, 'for teacher:', userId);
        
        // On récupère les liens du groupe. L'RLS s'occupe déjà de filtrer sur auth.uid()
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('eleve_id, Eleve!inner(*, Niveau(*))')
            .eq('groupe_id', groupId);

        if (error) {
            console.error('[TrackingRepo] Supabase query error:', error);
            throw error;
        }
        
        console.log('[TrackingRepo] Raw join result rows:', data?.length);

        if (!data || data.length === 0) {
            console.warn('[TrackingRepo] No students found for group:', groupId);
            return { ids: [], full: [] };
        }

        const full = data.map((d: any) => {
            const student = d.Eleve || d.eleve;
            if (!student) return null;
            // On s'assure que Niveau est accessible via 'niveau' ou 'Niveau'
            student.niveau = student.Niveau || student.niveau;
            return student;
        }).filter(Boolean);

        console.log('[TrackingRepo] Valid students with data:', full.length);

        return {
            ids: full.map((s: any) => s.id),
            full
        };
    }

    async getStudentsInGroups(groupIds: string[], userId: string): Promise<{ ids: string[], full: Tables<'Eleve'>[] }> {
        if (!this.validateUserId(userId) || groupIds.length === 0) {
            return { ids: [], full: [] };
        }
        
        console.log('[TrackingRepo] Fetching students in plural groups:', groupIds.length, 'groups for teacher:', userId);

        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('eleve_id, Eleve!inner(*, Niveau(*))')
            .in('groupe_id', groupIds);

        if (error) {
            console.error('[TrackingRepo] Supabase plural error:', error);
            throw error;
        }

        // Déduplication (au cas où un élève est dans plusieurs groupes)
        const uniqueMap = new Map();
        data.forEach((d: any) => {
            const student = d.Eleve || d.eleve;
            if (student && !uniqueMap.has(d.eleve_id)) {
                student.niveau = student.Niveau || student.niveau;
                uniqueMap.set(d.eleve_id, student);
            }
        });

        console.log('[TrackingRepo] Plural query finished. Unique students:', uniqueMap.size);

        return {
            ids: Array.from(uniqueMap.keys()),
            full: Array.from(uniqueMap.values())
        };
    }

    // ==================== PRÉFÉRENCES (RÉGLAGES) ====================

    /** Sauvegarde un réglage (ex: position des colonnes) pour un enseignant précis. */
    async saveUserPreference(userId: string, key: string, value: any): Promise<void> {
        if (!this.validateUserId(userId)) return;
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
        if (!this.validateUserId(userId)) return null;
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
    async getStudentsForPedago(groupId: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
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
            .eq('titulaire_id', userId)
            .order('prenom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Liste les chapitres actifs (en cours) pour l'affichage de progression.
     */
    async fetchModulesForStudent(_levelId: string | null, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
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
            .eq('statut', 'en_cours')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    }

    /** Liste tous les modules actifs pour l'interface simplifiée (mobile). */
    async fetchMobileModules(userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
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
            .eq('user_id', userId)
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Récupère tous les exercices d'un chapitre avec l'état de réussite de chaque élève.
     */
    async fetchActivitiesForModule(moduleId: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                ActiviteNiveau (niveau_id),
                Progression (etat, eleve_id),
                Module!inner (
                    id,
                    user_id,
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
            .eq('Module.user_id', userId)
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /** Récupère la liste de tous les avancements d'une liste d'élèves. */
    async fetchGroupProgressions(studentIds: string[], userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        if (studentIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select(`
                eleve_id,
                etat,
                activite_id,
                Eleve!inner(titulaire_id),
                Activite!inner (
                    Module!inner (
                        user_id,
                        SousBranche (
                            branche_id
                        )
                    )
                )
            `)
            .in('eleve_id', studentIds)
            .eq('Eleve.titulaire_id', userId)
            .eq('Activite.Module.user_id', userId);

        if (error) throw error;
        return data || [];
    }

    /** Construit un dictionnaire (Map) Activité -> État pour un élève précis. */
    async fetchStudentProgressionsMap(studentId: string, userId: string): Promise<Record<string, string>> {
        if (!this.validateUserId(userId)) return {};
        const { data, error } = await supabase
            .from('Progression')
            .select('activite_id, etat, Eleve!inner(titulaire_id)')
            .eq('eleve_id', studentId)
            .eq('Eleve.titulaire_id', userId);

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
    async getDashboardStats(filterStudentIds: string[] | null, userId: string): Promise<{ helpPending: number; validationsToday: number }> {
        if (!this.validateUserId(userId)) return { helpPending: 0, validationsToday: 0 };
        if (filterStudentIds !== null && filterStudentIds.length === 0) {
            return { helpPending: 0, validationsToday: 0 };
        }

        // 1. Compte des demandes d'aide et vérifications en attente.
        let queryHelp = supabase
            .from('Progression')
            .select('*, Activite!inner(Module!inner(statut, user_id)), Eleve!inner(titulaire_id)', { count: 'exact', head: true })
            .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement'])
            .eq('Activite.Module.statut', 'en_cours')
            .eq('Activite.Module.user_id', userId)
            .eq('Eleve.titulaire_id', userId);

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
            .select('*, Activite!inner(Module!inner(statut, user_id)), Eleve!inner(titulaire_id)', { count: 'exact', head: true })
            .eq('etat', 'valide')
            .eq('Activite.Module.statut', 'en_cours')
            .eq('Activite.Module.user_id', userId)
            .eq('Eleve.titulaire_id', userId)
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
    async getModulesWithProgressions(studentId: string, userId: string, _levelId?: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
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
            .eq('statut', 'en_cours')
            .eq('user_id', userId);

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
    async getModuleActivitiesAndProgressions(moduleId: string, studentId: string, userId: string): Promise<{ activities: any[], progressions: any[] }> {
        if (!this.validateUserId(userId)) return { activities: [], progressions: [] };
        const { data: activities, error: actError } = await supabase
            .from('Activite')
            .select(`
                *,
                ActiviteNiveau (niveau_id),
                Module!inner(user_id)
            `)
            .eq('module_id', moduleId)
            .eq('Module.user_id', userId)
            .order('ordre', { ascending: true });

        if (actError) throw actError;

        const { data: progressions, error: progError } = await supabase
            .from('Progression')
            .select('*, Eleve!inner(titulaire_id)')
            .eq('eleve_id', studentId)
            .eq('Eleve.titulaire_id', userId)
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
    async getHelpRequests(studentIds: string[], userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        if (studentIds.length === 0) return [];

        const { data, error } = await supabase
            .from('Progression')
            .select(`
                *,
                Eleve!inner (id, prenom, nom, photo_url, photo_hash, importance_suivi, titulaire_id, Niveau(nom, ordre)),
                Activite!inner (
                    id, titre,
                    Module!inner (id, nom, statut, user_id)
                )
            `)
            .in('eleve_id', studentIds)
            .eq('Eleve.titulaire_id', userId)
            .eq('Activite.Module.user_id', userId)
            .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement'])
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /** Statistiques d'état pour une liste d'exercices. */
    async getProgressionStatsForActivities(activityIds: string[], userId: string): Promise<{ activite_id: string, etat: string }[]> {
        if (!this.validateUserId(userId)) return [];
        if (activityIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select('activite_id, etat, Eleve!inner(titulaire_id)')
            .in('activite_id', activityIds)
            .eq('Eleve.titulaire_id', userId);

        if (error) throw error;
        return (data || []) as { activite_id: string, etat: string }[];
    }

    /** Récupère qui travaille sur une activité précise (utilisé dans le détail d'une activité). */
    async fetchProgressionsByActivity(activityId: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select('*, Eleve!inner(nom, prenom, photo_url, titulaire_id, EleveGroupe(Groupe(nom)))')
            .eq('activite_id', activityId)
            .eq('Eleve.titulaire_id', userId);

        if (error) throw error;
        return data || [];
    }

    /** Historique pédagogique complet d'un élève (utilisé dans son dossier). */
    async fetchStudentProgressDetails(studentId: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select(`
                id,
                etat,
                updated_at,
                Eleve!inner(titulaire_id),
                Activite!inner (
                    id,
                    titre,
                    ordre,
                    ActiviteNiveau ( niveau_id ),
                    Module!inner (
                        id,
                        nom,
                        statut,
                        user_id,
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
            .eq('eleve_id', studentId)
            .eq('Eleve.titulaire_id', userId)
            .eq('Activite.Module.user_id', userId);

        if (error) throw error;
        return data || [];
    }

    /** Liste tous les exercices appartenant à une série de modules. */
    async getActivitiesByModules(moduleIds: string[], userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        if (moduleIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                Module!inner(
                    id,
                    nom,
                    date_fin,
                    user_id,
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
            .in('module_id', moduleIds)
            .eq('Module.user_id', userId);

        if (error) throw error;
        return data || [];
    }

    /** Récupère les liens d'avancement pour un croisement Élèves / Activités. */
    async getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[], userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        if (studentIds.length === 0 || activityIds.length === 0) return [];

        const CHUNK_SIZE = 50; // On traite par paquets de 50 pour éviter de saturer la connexion.
        let allProgs: any[] = [];

        for (let i = 0; i < activityIds.length; i += CHUNK_SIZE) {
            const chunk = activityIds.slice(i, i + CHUNK_SIZE);
            const { data: chunkProgs, error } = await supabase
                .from('Progression')
                .select('eleve_id, activite_id, etat, Eleve!inner(titulaire_id)')
                .in('eleve_id', studentIds)
                .in('activite_id', chunk)
                .eq('Eleve.titulaire_id', userId);

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
    async updateStudentTrust(eleveId: string, branchId: string, adjustment: number, trend: 'up' | 'down' | 'stable', userId: string): Promise<void> {
        if (!this.validateUserId(userId)) return;
        // 1. Mise à jour de l'indice spécifique à la matière (Français, Maths, etc.)
        const currentIndices = await this.loadUserPreference(userId, 'eleve_profil_competences') || {};
        const studentData = currentIndices[eleveId] || {};
        const currentVal = Number(studentData[branchId] ?? 50);
        const newVal = Math.max(0, Math.min(100, currentVal + adjustment));

        currentIndices[eleveId] = { ...studentData, [branchId]: newVal };
        await this.saveUserPreference(userId, 'eleve_profil_competences', currentIndices);

        // 2. Mise à jour de l'icône de tendance (flèche qui monte/descend) sur la fiche élève.
        const { error } = await supabase
            .from('Eleve')
            .update({ trust_trend: trend })
            .eq('id', eleveId)
            .eq('titulaire_id', userId);

        if (error) throw error;
    }

    /**
     * GESTION DES RELANCES (Avant Mail) :
     * Trouve les exercices qui n'ont pas été terminés et dont la date limite est aujourd'hui.
     */
    async getUnfinishedModulesByDate(studentId: string, date: string, userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Module')
            .select(`
                id, nom, date_fin, sous_branche_id, statut,
                user_id,
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
            .eq('statut', 'en_cours')
            .eq('user_id', userId);

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

    /**
     * Supprime les planifications hebdomadaires pour tous les élèves de l'enseignant pour une semaine donnée.
     */
    async deleteWeeklyPlanning(userId: string, weekStart: string): Promise<void> {
        if (!this.validateUserId(userId)) return;

        // 1. Récupérer les IDs des élèves de cet enseignant
        const { data: students, error: studentError } = await supabase
            .from('Eleve')
            .select('id')
            .eq('titulaire_id', userId);

        if (studentError) throw studentError;
        if (!students || students.length === 0) return;

        const studentIds = students.map(s => s.id);

        // 2. Supprimer les planifications pour ces élèves et cette semaine
        const { error: deleteError } = await supabase
            .from('PlanificationHebdo')
            .delete()
            .eq('semaine_debut', weekStart)
            .in('eleve_id', studentIds);

        if (deleteError) throw deleteError;
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
