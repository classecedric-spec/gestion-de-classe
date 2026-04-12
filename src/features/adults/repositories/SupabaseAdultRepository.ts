/**
 * Nom du module/fichier : SupabaseAdultRepository.ts
 * 
 * Données en entrée : 
 *   - Données de profil d'adultes (noms, rôles).
 *   - IDs d'adultes et d'activités pour le suivi.
 * 
 * Données en sortie : 
 *   - Listes d'adultes (Tables<'Adulte'>).
 *   - Données de suivi quotidiennes fusionnées (avec noms et libellés).
 * 
 * Objectif principal : Cette classe gère la persistence des données relatives aux adultes via Supabase. Elle s'occupe de deux aspects majeurs : le carnet d'adresses des intervenants (CRUD sur la table 'Adulte') et le journal de bord quotidien (Suivi des présences et activités dans la table 'SuiviAdulte').
 */

import { supabase } from '../../../lib/database';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { IAdultRepository } from './IAdultRepository';

/**
 * Implémentation du dépôt Adults utilisant Supabase.
 */
export class SupabaseAdultRepository implements IAdultRepository {
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseAdultRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }

    /**
     * Récupère tous les intervenants enregistrés, classés par ordre alphabétique.
     */
    async getAll(userId: string): Promise<Tables<'Adulte'>[]> {
        if (!this.validateUserId(userId)) return [];
        const { data, error } = await supabase
            .from('Adulte')
            .select('*, ClasseAdulte!inner(Classe!inner(titulaire_id))')
            .eq('ClasseAdulte.Classe.titulaire_id', userId)
            .order('nom');

        if (error) throw error;
        return data || [];
    }

    /**
     * Crée une nouvelle fiche pour un intervenant ou un personnel.
     */
    async create(adultData: TablesInsert<'Adulte'>): Promise<Tables<'Adulte'>> {
        const { data, error } = await supabase
            .from('Adulte')
            .insert([adultData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Met à jour les informations d'un adulte (ex: changement de téléphone ou de rôle).
     */
    async update(id: string, adultData: TablesUpdate<'Adulte'>): Promise<Tables<'Adulte'>> {
        const { data, error } = await supabase
            .from('Adulte')
            .update(adultData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Supprime un adulte de la base de données.
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('Adulte')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Récupère le "journal de bord" de la journée pour tous les adultes.
     * Cette requête fait un "join" pour récupérer aussi les noms des adultes et les labels de leurs activités.
     */
    async fetchTrackingToday(userId: string): Promise<any[]> {
        if (!this.validateUserId(userId)) return [];
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('SuiviAdulte')
            .select(`
                *,
                Adulte (id, nom, prenom),
                TypeActiviteAdulte (id, label)
            `)
            .eq('user_id', userId)
            .gte('created_at', today)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Enregistre le fait qu'un adulte effectue une activité précise en ce moment.
     */
    async addActivity(adulteId: string, activiteId: string, userId: string): Promise<void> {
        if (!this.validateUserId(userId)) return;
        const { error } = await supabase
            .from('SuiviAdulte')
            .insert([{
                adulte_id: adulteId,
                activite_id: activiteId,
                user_id: userId
            }]);

        if (error) throw error;
    }

    /**
     * Efface une ligne du journal de bord (suivi).
     */
    async deleteSuivi(id: string): Promise<void> {
        const { error } = await supabase
            .from('SuiviAdulte')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. APPEL : La couche Service demande par exemple "Qui est présent aujourd'hui ?".
 * 2. REQUÊTE : Le repository formule une requête Supabase complexe (liaison entre 3 tables).
 * 3. NETTOYAGE : Les données brutes sont vérifiées et formatées.
 * 4. TRANSMISSION : La liste finale des activités récentes est renvoyée au Dashboard pour affichage.
 */
