import { supabase } from '../../../lib/database';
import { TablesInsert, TablesUpdate, Tables } from '../../../types/supabase';
import { ITrackingRepository, ProgressionWithDetails, StudentBasicInfo } from './ITrackingRepository';

/**
 * Supabase implementation of the Tracking Repository
 * Handles all database operations for pedagogical tracking
 */
export class SupabaseTrackingRepository implements ITrackingRepository {

    // ==================== PROGRESSIONS ====================

    async fetchProgressions(studentIds: string[], states: string[]): Promise<ProgressionWithDetails[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select(`
        *,
        eleve:Eleve(id, prenom, nom),
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

        // Cast to the expected type
        return (data as unknown) as ProgressionWithDetails[];
    }

    async updateProgressionStatus(id: string, newState: string, isSuivi: boolean): Promise<void> {
        const payload: TablesUpdate<'Progression'> = {
            etat: newState,
            updated_at: new Date().toISOString()
        };

        if (isSuivi) {
            (payload as any).is_suivi = false;
        }

        const { error } = await supabase
            .from('Progression')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
    }

    async deleteProgression(id: string): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async createProgressions(progressions: TablesInsert<'Progression'>[]): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .insert(progressions);

        if (error) throw error;
    }

    async upsertProgression(progression: TablesInsert<'Progression'>): Promise<void> {
        const { error } = await supabase
            .from('Progression')
            .upsert(progression, { onConflict: 'eleve_id,activite_id' });

        if (error) throw error;
    }

    // ==================== HELPERS ====================

    async findStudentsByActivityStatus(activityId: string, studentIds: string[], status: string): Promise<StudentBasicInfo[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select('eleve:Eleve(id, prenom, nom)')
            .eq('activite_id', activityId)
            .eq('etat', status)
            .in('eleve_id', studentIds);

        if (error) throw error;

        // Extract student info from the join
        return data?.map((p: any) => p.eleve).filter(Boolean) || [];
    }

    // ==================== GROUPS ====================

    async getGroupInfo(groupId: string): Promise<{ nom: string } | null> {
        const { data, error } = await supabase
            .from('Groupe')
            .select('nom')
            .eq('id', groupId)
            .single();

        if (error) throw error;
        return data;
    }

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

    // ==================== USER PREFERENCES ====================

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

    // ==================== PEDAGOGICAL DATA ====================

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

    async fetchModulesForStudent(_levelId: string | null): Promise<any[]> {
        // We fetch all 'en_cours' modules, filtering by level is often done in memory or can be improved here
        // The original hook filtered active modules.
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


    async fetchActivitiesForModule(moduleId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Activite')
            .select(`
                *,
                ActiviteNiveau (niveau_id),
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

    // ==================== DASHBOARD ====================

    async getDashboardStats(filterStudentIds: string[] | null): Promise<{ helpPending: number; validationsToday: number }> {
        // Optimization: If filtering by group but no students found, return 0 immediately
        if (filterStudentIds !== null && filterStudentIds.length === 0) {
            return { helpPending: 0, validationsToday: 0 };
        }

        // Get help pending count
        let queryHelp = supabase
            .from('Progression')
            .select('*', { count: 'exact', head: true })
            .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement']);

        if (filterStudentIds) {
            queryHelp = queryHelp.in('eleve_id', filterStudentIds);
        }

        const { count: helpCount, error: helpError } = await queryHelp;
        if (helpError) throw helpError;

        // Get validations today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let queryVal = supabase
            .from('Progression')
            .select('*', { count: 'exact', head: true })
            .eq('etat', 'valide')
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

        // Filter progressions for specific student in memory to maintain same structure
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

    async getModuleActivitiesAndProgressions(moduleId: string, studentId: string): Promise<{ activities: any[], progressions: any[] }> {
        // Fetch activities
        const { data: activities, error: actError } = await supabase
            .from('Activite')
            .select(`
                *,
                ActiviteNiveau (niveau_id)
            `)
            .eq('module_id', moduleId)
            .order('ordre', { ascending: true });

        if (actError) throw actError;

        // Fetch progressions for this student
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

    async getHelpRequests(studentIds: string[]): Promise<any[]> {
        if (studentIds.length === 0) return [];

        const { data, error } = await supabase
            .from('Progression')
            .select(`
                *,
                Eleve (id, prenom, nom, photo_url, photo_hash),
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

    async getProgressionStatsForActivities(activityIds: string[]): Promise<{ activite_id: string, etat: string }[]> {
        if (activityIds.length === 0) return [];
        const { data, error } = await supabase
            .from('Progression')
            .select('activite_id, etat')
            .in('activite_id', activityIds);

        if (error) throw error;
        return (data || []) as { activite_id: string, etat: string }[];
    }

    async fetchProgressionsByActivity(activityId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('Progression')
            .select('*, Eleve(nom, prenom, photo_url, EleveGroupe(Groupe(nom)))')
            .eq('activite_id', activityId);

        if (error) throw error;
        return data || [];
    }

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

    async getProgressionsForStudentsAndActivities(studentIds: string[], activityIds: string[]): Promise<any[]> {
        if (studentIds.length === 0 || activityIds.length === 0) return [];

        const CHUNK_SIZE = 50;
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

    async updateStudentTrust(eleveId: string, branchId: string, adjustment: number, trend: 'up' | 'down' | 'stable'): Promise<void> {
        // 1. Update Branch Specific Index (User Preference)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const currentIndices = await this.loadUserPreference(user.id, 'eleve_profil_competences') || {};
            const studentData = currentIndices[eleveId] || {};
            const currentVal = Number(studentData[branchId] ?? 50);
            const newVal = Math.max(0, Math.min(100, currentVal + adjustment));

            currentIndices[eleveId] = { ...studentData, [branchId]: newVal };
            await this.saveUserPreference(user.id, 'eleve_profil_competences', currentIndices);
        }

        // 2. Update Global Student Trend
        const { error } = await supabase
            .from('Eleve')
            .update({ trust_trend: trend })
            .eq('id', eleveId);

        if (error) throw error;
    }
}
