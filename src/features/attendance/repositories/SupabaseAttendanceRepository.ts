/**
 * Nom du module/fichier : SupabaseAttendanceRepository.ts
 * 
 * Données en entrée : 
 *   - Requêtes SQL via le client `supabase`.
 *   - Identifiants (IDs) d'enseignants, d'élèves, de groupes et de dates.
 * 
 * Données en sortie : 
 *   - Objets JavaScript typés (Groupes, Élèves, Présences) issus de la base de données.
 * 
 * Objectif principal : Être le moteur technique de la gestion des présences. Ce dépôt réalise concrètement les opérations en base de données : charger la liste des élèves d'un groupe, enregistrer un appel, vérifier les doublons, et générer les données nécessaires aux rapports PDF mensuels.
 */

import { supabase } from '../../../lib/database';
import { TablesInsert } from '../../../types/supabase';
import {
    IAttendanceRepository,
    Group,
    Student,
    SetupPresence,
    CategoriePresence,
    Attendance,
    AttendanceWithCategory
} from './IAttendanceRepository';

/**
 * Implémentation concrète de IAttendanceRepository utilisant Supabase (PostgreSQL).
 */
export class SupabaseAttendanceRepository implements IAttendanceRepository {
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseAttendanceRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }

    // ==================== GESTION DES GROUPES ====================

    /** Récupère tous les groupes d'élèves triés par nom. */
    async getGroups(userId: string): Promise<Group[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Groupe')
            .select('*')
            .eq('user_id', userId)
            .order('nom');
        if (error) throw error;
        return data || [];
    }

    /** Lit une préférence utilisateur (ex: dernier groupe utilisé). */
    async getUserPreferences(userId: string, key: string): Promise<any> {
        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('key', key)
            .eq('user_id', userId)
            .maybeSingle();
        return data?.value;
    }

    /** Mémorise quel groupe l'enseignant utilisait en dernier pour l'appel. */
    async saveGroupPreference(userId: string, groupId: string): Promise<void> {
        const { error } = await supabase
            .from('UserPreference')
            .upsert({
                user_id: userId,
                key: 'presence_last_group_id',
                value: groupId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,key'
            });
        if (error) throw error;
    }

    // ==================== GESTION DES ÉLÈVES ====================

    /** 
     * Récupère la liste des élèves d'un groupe précis.
     * Cette fonction fait une double lecture : d'abord le lien élève<->groupe, puis les fiches élèves détaillées.
     */
    async getStudentsByGroup(groupId: string, userId: string): Promise<Student[]> {
        if (!this.validateUserId(userId)) return [];

        // Une seule requête JOIN au lieu de 2 requêtes séquentielles (-50% latence réseau)
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('Eleve!inner(*, Classe(nom), Niveau(nom, ordre))')
            .eq('groupe_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;

        // Extraction des objets Eleve, filtre titulaire_id (sécurité), tri par nom
        const students = (data || [])
            .map(row => (row as any).Eleve)
            .filter((e: any) => e && e.titulaire_id === userId)
            .sort((a: any, b: any) => a.nom.localeCompare(b.nom));

        return students as Student[];
    }

    // ==================== CONFIGURATION (SETUPS & CATÉGORIES) ====================

    /** Liste les types d'appels configurés, triés par l'ordre choisi par l'enseignant. */
    async getSetups(userId: string): Promise<SetupPresence[]> {
        const { data, error } = await supabase
            .from('SetupPresence')
            .select('*')
            .eq('user_id', userId)
            .order('ordre', { ascending: true, nullsFirst: false })
            .order('nom');
        if (error) throw error;
        return data || [];
    }

    /** Met à jour l'ordre de tous les sets en une seule passe. */
    async updateSetupOrders(updates: { id: string; ordre: number }[], userId: string): Promise<void> {
        for (const { id, ordre } of updates) {
            const { error } = await supabase
                .from('SetupPresence')
                .update({ ordre })
                .eq('id', id)
                .eq('user_id', userId);
            if (error) throw error;
        }
    }

    /** Liste les statuts (ex: Présent, Absent) liés à un type d'appel. */
    async getCategories(setupId: string, userId: string): Promise<CategoriePresence[]> {
        const { data, error } = await supabase
            .from('CategoriePresence')
            .select('*')
            .eq('setup_id', setupId)
            .eq('user_id', userId)
            .order('created_at');
        if (error) throw error;
        return data || [];
    }

    /** Crée une nouvelle configuration d'appel (ex: 'Étude du soir'). */
    async createSetup(userId: string, name: string, description: string | null): Promise<SetupPresence> {
        const { data, error } = await supabase
            .from('SetupPresence')
            .insert([{ nom: name, description, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateSetup(id: string, userId: string, name: string, description: string | null): Promise<void> {
        const { error } = await supabase
            .from('SetupPresence')
            .update({ nom: name, description })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    }

    async deleteSetup(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('SetupPresence')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    }

    /** Met à jour plusieurs statuts d'un coup (ex: changer les couleurs des badges). */
    async upsertCategories(categories: TablesInsert<'CategoriePresence'>[], userId: string): Promise<void> {
        for (const cat of categories) {
            const { error } = await supabase
                .from('CategoriePresence')
                .upsert({ ...cat, user_id: userId });
            if (error) throw error;
        }
    }

    async deleteCategory(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('CategoriePresence')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    }

    /** 
     * Sécurité métier : Vérifie qu'un statut 'Absent' existe. 
     * S'il manque (ex: après une suppression), il est recréé automatiquement en rouge.
     */
    async ensureAbsentCategory(setupId: string, userId: string): Promise<void> {
        const { count } = await supabase
            .from('CategoriePresence')
            .select('*', { count: 'exact', head: true })
            .eq('setup_id', setupId)
            .eq('nom', 'Absent');

        if (count === 0) {
            await supabase.from('CategoriePresence').insert({
                setup_id: setupId,
                nom: 'Absent',
                couleur: '#EF4444',
                user_id: userId
            });
        }
    }

    // ==================== L'APPEL (ATTENDANCE) ====================

    /** Récupère les lignes d'appel déjà enregistrées pour éviter d'écraser des données. */
    async getAttendances(date: string, period: string, studentIds: string[], setupId: string, userId: string): Promise<Attendance[]> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('*')
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', period)
            .eq('user_id', userId)
            .in('eleve_id', studentIds);

        if (error) throw error;
        return data || [];
    }

    /** Vérifie si un appel a déjà commencé pour ce moment de la journée. */
    async checkExistingSetup(date: string, period: string, studentIds: string[], userId: string): Promise<string | undefined> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('setup_id')
            .eq('date', date)
            .eq('periode', period)
            .eq('user_id', userId)
            .in('eleve_id', studentIds)
            .limit(1);

        if (error) throw error;
        return data?.[0]?.setup_id;
    }

    /** 
     * Enregistre ou modifie la présence d'un élève. 
     * Gère les identifiants temporaires pour une interface réactive.
     */
    async upsertAttendance(attendanceRecord: Partial<Attendance> & { id?: string }, userId: string): Promise<Attendance> {
        const { id, ...rest } = attendanceRecord;
        const payload = { ...rest, user_id: userId };
        
        // Si l'id est temporaire, on ne l'envoie pas à Supabase pour qu'il génère un vrai UUID
        const idToUse = id?.toString().startsWith('temp-') ? undefined : id;
        
        const { data, error } = await supabase
            .from('Attendance')
            .upsert(
                { ...(idToUse ? { id: idToUse } : {}), ...payload },
                { onConflict: 'eleve_id,date,periode,setup_id' }
            )
            .select()
            .single();

        if (error) throw error;
        return data || (attendanceRecord as Attendance);
    }

    async deleteAttendance(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('Attendance')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
    }

    /** Enregistre l'appel pour toute une classe en une seule requête (plus rapide). */
    async bulkInsertAttendances(records: TablesInsert<'Attendance'>[], userId: string): Promise<Attendance[]> {
        const recordsWithUser = records.map(r => ({ ...r, user_id: userId }));
        const { data, error } = await supabase
            .from('Attendance')
            .upsert(recordsWithUser, { onConflict: 'eleve_id,date,periode,setup_id' })
            .select();
        if (error) throw error;
        return data || [];
    }

    // ==================== RAPPORTS ET EXPORTS ====================

    /** Liste les jours où l'enseignant a fait l'appel (pour naviguer dans l'historique). */
    async getDistinctDates(setupId: string, userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('Attendance')
            .select('date')
            .eq('setup_id', setupId)
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (error) throw error;
        const dates = data?.map(item => item.date) || [];
        return [...new Set(dates)].sort().reverse();
    }

    /** 
     * Récupère TOUTES les données de présence pour une période (ex: un mois entier).
     * Utilise une boucle de chargement par pages (Pagination) pour ne pas saturer le réseau 
     * si l'école a des milliers de données.
     */
    async getAttendanceRange(start: string, end: string, userId: string): Promise<AttendanceWithCategory[]> {
        if (!this.validateUserId(userId)) return [];
        let allData: any[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        try {
            while (hasMore) {
                const { data, error } = await supabase
                    .from('Attendance')
                    .select('*, CategoriePresence(nom)')
                    .eq('user_id', userId)
                    .gte('date', start)
                    .lte('date', end)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
        } catch (err) {
            console.error('[Repository] Erreur lors de la lecture de la période :', err);
            throw err;
        }

        return allData as AttendanceWithCategory[];
    }

    /**
     * Gain de temps : Recopie l'appel du matin vers l'après-midi.
     * Très utile si les élèves ne changent presque jamais entre les deux demi-journées.
     */
    async copyPeriodData(date: string, setupId: string, fromPeriod: string, toPeriod: string, userId: string): Promise<void> {
        // 1. Lire les données sources
        const { data: sourceData, error: fetchError } = await supabase
            .from('Attendance')
            .select('*')
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', fromPeriod);

        if (fetchError) throw fetchError;
        if (!sourceData || sourceData.length === 0) {
            throw new Error(`Aucune donnée trouvée pour la période ${fromPeriod}`);
        }

        // 2. Supprimer les données cibles si elles existent déjà (nettoyage)
        const { error: deleteError } = await supabase
            .from('Attendance')
            .delete()
            .eq('date', date)
            .eq('setup_id', setupId)
            .eq('periode', toPeriod);

        if (deleteError) throw deleteError;

        // 3. Préparer les nouvelles lignes et les insérer
        const newRecords: TablesInsert<'Attendance'>[] = sourceData.map(record => ({
            eleve_id: record.eleve_id,
            date: record.date,
            periode: toPeriod,
            setup_id: record.setup_id,
            categorie_id: record.categorie_id,
            status: record.status,
            user_id: userId
        }));

        const { error: insertError } = await supabase
            .from('Attendance')
            .insert(newRecords);

        if (insertError) throw insertError;
    }

    // ==================== INTERFACE MOBILE ====================

    /** Récupère les données d'appel optimisées pour l'affichage en liste sur mobile. */
    async getMobileData(userId: string, date: string): Promise<{ student: any, attendances: any }[]> {
        if (!this.validateUserId(userId)) return [];
        const { data: groups } = await supabase.from('Groupe').select('id').eq('user_id', userId);
        const groupIds = groups?.map(g => g.id) || [];
        if (groupIds.length === 0) return [];

        const { data: students } = await supabase
            .from('Eleve')
            .select('id, prenom, nom, photo_url, EleveGroupe!inner(groupe_id)')
            .in('EleveGroupe.groupe_id', groupIds)
            .eq('titulaire_id', userId)
            .order('nom');

        if (!students || students.length === 0) return [];

        const studentIds = students.map(s => s.id);

        const { data: attendances } = await supabase
            .from('Attendance')
            .select('eleve_id, status, periode')
            .eq('date', date)
            .in('eleve_id', studentIds);

        return students.map(student => {
            const matinRecord = attendances?.find(a => a.eleve_id === student.id && a.periode === 'matin');
            const apresMidiRecord = attendances?.find(a => a.eleve_id === student.id && a.periode === 'apres_midi');

            return {
                ...student,
                matin: matinRecord?.status || 'present',
                apres_midi: apresMidiRecord?.status || 'present'
            };
        });
    }

    /** Calcule en temps réel le décompte des présents/absents pour le résumé d'accueil. */
    async getDailySummary(userId: string, date: string, period: string): Promise<{ present: number; absent: number; hasEncoding: boolean }> {
        if (!this.validateUserId(userId)) return { present: 0, absent: 0, hasEncoding: false };
        const { data: groups } = await supabase.from('Groupe').select('id').eq('user_id', userId);
        const groupIds = groups?.map(g => g.id) || [];
        if (groupIds.length === 0) return { present: 0, absent: 0, hasEncoding: false };

        const { data: students } = await supabase
            .from('Eleve')
            .select('id, EleveGroupe!inner(groupe_id)')
            .in('EleveGroupe.groupe_id', groupIds)
            .eq('titulaire_id', userId);

        if (!students) return { present: 0, absent: 0, hasEncoding: false };
        const studentIds = students.map(s => s.id);
        if (studentIds.length === 0) return { present: 0, absent: 0, hasEncoding: false };

        const { data: attendances } = await supabase
            .from('Attendance')
            .select('status, eleve_id')
            .eq('date', date)
            .eq('periode', period)
            .in('eleve_id', studentIds);

        const hasData = attendances && attendances.length > 0;

        if (!hasData) {
            return { present: 0, absent: 0, hasEncoding: false };
        } else {
            const totalStudents = studentIds.length;
            const absentCount = attendances.filter(a => a.status === 'absent').length;
            const presentCount = totalStudents - absentCount;

            return { present: presentCount, absent: absentCount, hasEncoding: true };
        }
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant appuie sur "Matin" pour faire l'appel.
 * 2. LECTURE : Le dépôt charge la liste des élèves (`getStudentsByGroup`) et l'appel s'il existe déjà (`getAttendances`).
 * 3. SAISIE : L'enseignant change le statut d'un élève.
 * 4. SAUVEGARDE : Le dépôt envoie une requête `upsert` à Supabase.
 * 5. RÉHABILITATION : Si l'enseignant demande l'appel de l'après-midi, le dépôt offre de copier les données du matin (`copyPeriodData`).
 * 6. SYNCHRONISATION : Toutes les données sont renvoyées à l'interface pour mettre à jour les jauges de présence en temps réel.
 */
