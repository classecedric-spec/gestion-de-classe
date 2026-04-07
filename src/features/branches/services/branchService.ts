/**
 * Nom du module/fichier : branchService.ts
 * 
 * Données en entrée : 
 *   - Les informations brutes d'une branche ou sous-branche (nom, photo, ordre).
 *   - Les fichiers images au format base64.
 * 
 * Données en sortie : 
 *   - Les objets "Branche" ou "SousBranche" tels qu'enregistrés en base de données.
 *   - Les URL publiques des photos téléchargées.
 * 
 * Objectif principal : Agir comme le "secrétariat technique" des matières scolaires. Ce service gère les tâches lourdes : parler à la base de données (Supabase), valider que les noms ne sont pas vides, classer les matières par ordre numérique, et envoyer les logos dans le coffre-fort de stockage Cloud.
 * 
 * Ce que ça affiche : Rien (c'est un service de données invisible).
 */

import { supabase } from '../../../lib/database';
import { storageService } from '../../../lib/storage';
import { validateWith, BranchSchema, SubBranchSchema } from '../../../lib/helpers';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type BrancheInsert = Database['public']['Tables']['Branche']['Insert'];
type BrancheUpdate = Database['public']['Tables']['Branche']['Update'];

type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];
type SousBrancheInsert = Database['public']['Tables']['SousBranche']['Insert'];
type SousBrancheUpdate = Database['public']['Tables']['SousBranche']['Update'];

export const branchService = {
    /**
     * RÉCUPÉRATION DES BRANCHES :
     * Demande à la base de données la liste de toutes les matières, 
     * triée selon l'ordre défini par l'enseignant.
     */
    fetchBranches: async (): Promise<BrancheRow[]> => {
        const { data, error } = await supabase
            .from('Branche')
            .select('id, nom, ordre, photo_url, couleur, user_id, created_at, updated_at')
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * RÉCUPÉRATION DES SOUS-BRANCHES :
     * Va chercher les spécialités rattachées à une matière précise (ex: tout ce qui est sous "Maths").
     */
    fetchSubBranches: async (branchId: string): Promise<SousBrancheRow[]> => {
        const { data, error } = await supabase
            .from('SousBranche')
            .select('id, nom, ordre, branche_id, photo_url, user_id, created_at, updated_at')
            .eq('branche_id', branchId)
            .order('ordre', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * TÉLÉCHARGEMENT DE PHOTO :
     * Envoie une image sur le serveur et récupère son adresse internet (URL).
     */
    uploadPhoto: async (folder: string, entityId: string, base64: string): Promise<string | null> => {
        const result = await storageService.uploadImage(folder, entityId, base64);
        return result.publicUrl;
    },

    /**
     * CRÉATION D'UNE MATIÈRE :
     * 1. Vérifie la validité des données.
     * 2. Calcule le numéro d'ordre pour la mettre à la fin de la liste.
     * 3. Enregistre le profil.
     * 4. Si une photo est fournie, elle l'envoie et met à jour le profil avec l'URL finale.
     */
    createBranch: async (branchData: BrancheInsert): Promise<BrancheRow> => {
        const validation = validateWith(BranchSchema.partial(), branchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Calcul automatique de la position (ordre)
        const { data: maxOrderData } = await supabase
            .from('Branche')
            .select('ordre')
            .order('ordre', { ascending: false })
            .limit(1);

        const nextOrder = (maxOrderData && maxOrderData.length > 0) ? (maxOrderData[0].ordre || 0) + 1 : 1;

        const photoBase64 = (branchData as any).photo_base64;
        const dataToInsert = { ...branchData, user_id: user.id, ordre: nextOrder };

        // On nettoie la donnée temporaire base64 avant l'envoi en base
        // @ts-ignore
        delete dataToInsert.photo_base64;

        const { data, error } = await supabase
            .from('Branche')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw error;

        // Si l'utilisateur a mis un logo, on l'envoie maintenant qu'on a l'ID de la branche
        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('branche', data.id, photoBase64);
            if (publicUrl) {
                await supabase.from('Branche').update({ photo_url: publicUrl }).eq('id', data.id);
                data.photo_url = publicUrl;
            }
        }

        return data;
    },

    /**
     * MODIFICATION D'UNE MATIÈRE :
     * Similaire à la création, mais met à jour une ligne déjà existante.
     */
    updateBranch: async (id: string, branchData: BrancheUpdate): Promise<BrancheRow> => {
        const validation = validateWith(BranchSchema.partial(), branchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        const photoBase64 = (branchData as any).photo_base64;
        const dataToUpdate = { ...branchData };

        // @ts-ignore
        delete dataToUpdate.photo_base64;

        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('branche', id, photoBase64);
            if (publicUrl) {
                dataToUpdate.photo_url = publicUrl;
            }
        }

        const { data, error } = await supabase
            .from('Branche')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * SUPPRESSION :
     * Retire définitivement la matière de la base de données.
     */
    deleteBranch: async (id: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vous devez être connecté pour supprimer.");

        const { error } = await supabase
            .from('Branche')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * MISE À JOUR DE L'ORDRE (Branche) :
     * Permet d'enregistrer massivement les nouvelles positions des matières (1, 2, 3...)
     */
    updateOrder: async (updates: BrancheUpdate[]): Promise<void> => {
        const { error } = await supabase
            .from('Branche')
            .upsert(updates as any, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * MISE À JOUR DE L'ORDRE (SousBranche) :
     * Permet d'enregistrer massivement les nouvelles positions des spécialités.
     */
    updateSubBranchOrder: async (updates: SousBrancheUpdate[]): Promise<void> => {
        const { error } = await supabase
            .from('SousBranche')
            .upsert(updates as any, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * CRÉATION D'UNE SOUS-MATIÈRE :
     * Fonctionne exactement comme la création d'une branche, mais rattachée à une parente.
     */
    createSubBranch: async (subBranchData: SousBrancheInsert): Promise<SousBrancheRow> => {
        const validation = validateWith(SubBranchSchema.partial(), subBranchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const photoBase64 = (subBranchData as any).photo_base64;
        const dataToInsert = { ...subBranchData, user_id: user.id };

        // @ts-ignore
        delete dataToInsert.photo_base64;

        const { data, error } = await supabase
            .from('SousBranche')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw error;

        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('sousbranche', data.id, photoBase64);
            if (publicUrl) {
                await supabase.from('SousBranche').update({ photo_url: publicUrl }).eq('id', data.id);
                data.photo_url = publicUrl;
            }
        }

        return data;
    },

    /**
     * MODIFICATION D'UNE SOUS-MATIÈRE :
     * Met à jour le nom, la branche parente ou la photo d'une spécialité.
     */
    updateSubBranch: async (id: string, subBranchData: SousBrancheUpdate): Promise<SousBrancheRow> => {
        const validation = validateWith(SubBranchSchema.partial(), subBranchData);
        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        const photoBase64 = (subBranchData as any).photo_base64;
        const dataToUpdate = { ...subBranchData };

        // @ts-ignore
        delete dataToUpdate.photo_base64;

        if (photoBase64 && photoBase64.startsWith('data:image')) {
            const publicUrl = await branchService.uploadPhoto('sousbranche', id, photoBase64);
            if (publicUrl) {
                dataToUpdate.photo_url = publicUrl;
            }
        }

        const { data, error } = await supabase
            .from('SousBranche')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Une demande de création de matière arrive (ex: "Art").
 * 2. ÉTAPE VALIDATION : Le service vérifie que les données respectent les règles de sécurité.
 * 3. ÉTAPE RANGEMENT : Il calcule que si vous avez déjà 3 matières, celle-ci portera le numéro 4.
 * 4. ÉTAPE BASE DE DONNÉES : Il envoie l'ordre d'écriture au serveur Supabase.
 * 5. ÉTAPE IMAGE (Si présente) : Il envoie la photo au stockage Cloud et récupère son "adresse web".
 * 6. ÉTAPE MISE À JOUR : Il complète le dossier de la matière avec l'adresse de la photo pour que tout soit prêt.
 */
