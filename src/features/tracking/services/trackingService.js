import { supabase } from '../../../lib/supabaseClient';

/**
 * Service for Pedagogical Tracking (Suivi & Mobile)
 */
export const trackingService = {

    /**
     * Fetch help requests for a list of students
     * @param {string[]} studentIds 
     * @returns {Promise<Array>} 
     */
    async fetchHelpRequests(studentIds) {
        const { data, error } = await supabase
            .from('Progression')
            .select(`
                id,
                etat,
                is_suivi,
                eleve_id,
                eleve:Eleve(id, prenom, nom),
                updated_at,
                activite:Activite(
                    id,
                    titre,
                    Module(
                        id,
                        nom,
                        date_fin,
                        statut,
                        SousBranche(
                            branche_id
                        )
                    )
                )
            `)
            .in('etat', ['besoin_d_aide', 'a_verifier', 'ajustement'])
            .in('eleve_id', studentIds)
            .order('updated_at', { ascending: true });

        if (error) throw error;

        // Filter logic common to both platforms
        return (data || []).filter(req => {
            if (req.is_suivi) return true;
            if (!req.activite?.Module) return true; // Safety check
            return req.activite.Module.statut === 'en_cours';
        });
    },

    /**
     * Find students who have finished an activity (potential helpers)
     * @param {string} activityId 
     * @param {string[]} studentIds Pool of potential helpers
     */
    async findHelpers(activityId, studentIds) {
        const { data, error } = await supabase
            .from('Progression')
            .select('eleve:Eleve(id, prenom, nom)')
            .eq('activite_id', activityId)
            .eq('etat', 'termine')
            .in('eleve_id', studentIds);

        if (error) throw error;
        return data?.map(p => p.eleve).filter(Boolean) || [];
    },

    /**
     * Update the status of a progression (validation, rejection, etc.)
     * @param {string} id Progression ID
     * @param {string} newState New state ('termine', 'a_commencer', etc.)
     * @param {boolean} isSuivi Was this a 'suivi' request?
     */
    async updateProgressionStatus(id, newState, isSuivi = false) {
        const payload = {
            etat: newState,
            updated_at: new Date().toISOString()
        };

        if (isSuivi) {
            payload.is_suivi = false;
        }

        const { error } = await supabase
            .from('Progression')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Delete a progression (e.g. removing a manual follow-up)
     * @param {string} id 
     */
    async deleteProgression(id) {
        const { error } = await supabase
            .from('Progression')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Create multiple new progressions (e.g. for auto-suivi)
     * @param {Array} progressions Array of objects to insert
     */
    async createProgressions(progressions) {
        const { error } = await supabase
            .from('Progression')
            .insert(progressions);

        if (error) throw error;
        return true;
    },

    /**
     * Fetch group info by ID
     */
    async fetchGroupInfo(groupId) {
        const { data, error } = await supabase
            .from('Groupe')
            .select('nom')
            .eq('id', groupId)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Fetch students in a group
     */
    async fetchStudentsInGroup(groupId) {
        const { data, error } = await supabase
            .from('EleveGroupe')
            .select('eleve_id, Eleve(*)')
            .eq('groupe_id', groupId);

        if (error) throw error;

        return {
            ids: data.map(d => d.eleve_id),
            full: data.map(d => d.Eleve).filter(Boolean)
        };
    },

    /**
     * Save user preferences (manual indices or skips)
     */
    async saveUserPreference(userId, key, value) {
        const { error } = await supabase
            .from('UserPreference')
            .upsert({
                user_id: userId,
                key,
                value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, key' });

        if (error) throw error;
    },

    /**
     * Load user preference
     */
    async loadUserPreference(userId, key) {
        const { data, error } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', userId)
            .eq('key', key)
            .maybeSingle();

        if (error) throw error;
        return data?.value || null;
    }
};
