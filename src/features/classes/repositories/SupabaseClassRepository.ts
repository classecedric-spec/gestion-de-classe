/**
 * Nom du module/fichier : SupabaseClassRepository.ts
 * 
 * Données en entrée : Requêtes provenant du service ClassService (identifiants, données d'objets, fichiers images).
 * 
 * Données en sortie : Résultats bruts de la base de données (lignes de tables SQL) ou confirmations d'erreurs.
 * 
 * Objectif principal : Implémenter concrètement l'accès aux données pour les classes en utilisant la technologie Supabase (PostgreSQL). C'est ici que sont écrites les requêtes SQL spécialisées pour récupérer les classes avec leurs relations complexes (élèves, enseignants, logos).
 * 
 * Ce que ça affiche : Rien. C'est la couche technique "moteur" qui discute avec le serveur.
 */

import { supabase } from '../../../lib/database';
import { TablesUpdate } from '../../../types/supabase';
import { IClassRepository } from './IClassRepository';
import { ClassWithAdults, StudentWithRelations } from '../services/classService';

/**
 * Implémentation réelle du dépôt de données utilisant Supabase.
 */
export class SupabaseClassRepository implements IClassRepository {
    private validateUserId(userId: string): boolean {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn('[SupabaseClassRepository] Attempted query with invalid userId');
            return false;
        }
        return true;
    }
    
    /**
     * Récupération globale : extrait toutes les classes triées par nom, 
     * en incluant les professeurs rattachés via une jointure.
     */
    async getClasses(userId: string): Promise<ClassWithAdults[]> {
        if (!this.validateUserId(userId)) return [];
        // On récupère d'abord l'ID adulte de l'utilisateur
        const { data: adulte } = await supabase
            .from('Adulte')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!adulte) return [];

        const { data, error } = await supabase
            .from('Classe')
            .select(`
                *,
                ClasseAdulte (
                    role,
                    Adulte (id, nom, prenom)
                )
            `)
            .eq('titulaire_id', adulte.id)
            .order('nom');

        if (error) throw error;
        return (data as any) || [];
    }

    /**
     * Recherche ciblée : récupère une seule classe par son numéro unique (ID).
     */
    async getClassById(classId: string, userId: string): Promise<ClassWithAdults | null> {
        if (!this.validateUserId(userId)) return null;
        // On récupère l'ID adulte
        const { data: adulte } = await supabase
            .from('Adulte')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!adulte) return null;

        const { data, error } = await supabase
            .from('Classe')
            .select(`
                *,
                ClasseAdulte (
                    role,
                    Adulte (id, nom, prenom)
                )
            `)
            .eq('id', classId)
            .eq('titulaire_id', adulte.id)
            .single();

        if (error) throw error;
        return data as any;
    }

    /**
     * Lien élève-classe : récupère tous les petits écoliers d'une classe spécifique 
     * pour l'affichage de la trombinoscope ou de la liste d'appel.
     */
    async getStudentsByClass(classId: string, userId: string): Promise<StudentWithRelations[]> {
        // On vérifie que la classe appartient bien à l'utilisateur
        const classCheck = await this.getClassById(classId, userId);
        if (!classCheck) return [];

        const { data, error } = await supabase
            .from('Eleve')
            .select(`
                *,
                Classe (nom),
                EleveGroupe (
                    Groupe (id, nom)
                )
            `)
            .eq('classe_id', classId)
            .eq('titulaire_id', userId)
            .order('nom');

        if (error) throw error;
        return (data as any) || [];
    }

    /**
     * Suppression : retire une classe de la base de données.
     */
    async deleteClass(classId: string, userId: string): Promise<void> {
        if (!this.validateUserId(userId)) return;
        const { data: adulte } = await supabase
            .from('Adulte')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!adulte) throw new Error('Unauthorized');

        const { error } = await supabase
            .from('Classe')
            .delete()
            .eq('id', classId)
            .eq('titulaire_id', adulte.id);
        if (error) throw error;
    }

    /**
     * Désinscription : met à jour la fiche de l'élève pour dire qu'il n'appartient plus 
     * à cette classe (sans supprimer le profil de l'élève).
     */
    async removeStudentFromClass(studentId: string, userId: string): Promise<void> {
        if (!this.validateUserId(userId)) return;
        const { error } = await supabase
            .from('Eleve')
            .update({ classe_id: null } as TablesUpdate<'Eleve'>)
            .eq('id', studentId)
            .eq('titulaire_id', userId);
        if (error) throw error;
    }

    /**
     * Mise à jour rapide : permet de modifier une information précise d'un élève.
     */
    async updateStudentField(studentId: string, field: keyof TablesUpdate<'Eleve'>, value: any, userId: string): Promise<void> {
        if (!this.validateUserId(userId)) return;
        const { error } = await supabase
            .from('Eleve')
            .update({ [field]: value } as TablesUpdate<'Eleve'>)
            .eq('id', studentId)
            .eq('titulaire_id', userId);
        if (error) throw error;
    }

    /**
     * Initialisation : crée une nouvelle classe en identifiant automatiquement 
     * l'adulte connecté comme étant le titulaire responsable.
     */
    async createClass(data: any, userId: string): Promise<{ id: string }> {
        if (!this.validateUserId(userId)) throw new Error("userId required");

        // 2. On récupère sa fiche "Adulte" dans la base de données
        const { data: adulte, error: adulteError } = await supabase
            .from('Adulte')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (adulteError || !adulte) {
            throw new Error('No Adulte record found for current user. Please create an adult profile first.');
        }

        // 3. On insère la nouvelle classe en la liant à cet adulte
        const { data: newClass, error } = await supabase
            .from('Classe')
            .insert({
                ...data,
                titulaire_id: adulte.id
            })
            .select()
            .single();
        if (error) throw error;
        return { id: newClass.id };
    }

    /**
     * Modification : enregistre les changements (nom, description) d'une classe existante.
     */
    async updateClass(classId: string, data: any, userId: string): Promise<void> {
        if (!this.validateUserId(userId)) return;
        const { data: adulte } = await supabase
            .from('Adulte')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!adulte) throw new Error('Unauthorized');

        const { error } = await supabase
            .from('Classe')
            .update(data)
            .eq('id', classId)
            .eq('titulaire_id', adulte.id);
        if (error) throw error;
    }

    /**
     * Équipe pédagogique : enregistre quel adulte travaille dans quelle classe (maître, ATSEM, etc.).
     */
    async linkAdult(classId: string, adultId: string, role: string, userId: string): Promise<void> {
        // Vérifier que la classe appartient à l'utilisateur
        const classCheck = await this.getClassById(classId, userId);
        if (!classCheck) throw new Error('Unauthorized');

        const { error } = await supabase
            .from('ClasseAdulte')
            .insert([{ classe_id: classId, adulte_id: adultId, role }]);
        if (error) throw error;
    }

    /**
     * Nettoyage : retire tous les intervenants d'une classe avant une réaffectation.
     */
    async unlinkAllAdults(classId: string, userId: string): Promise<void> {
        // Vérifier que la classe appartient à l'utilisateur
        const classCheck = await this.getClassById(classId, userId);
        if (!classCheck) throw new Error('Unauthorized');

        const { error } = await supabase
            .from('ClasseAdulte')
            .delete()
            .eq('classe_id', classId);
        if (error) throw error;
    }

    /**
     * Stockage Cloud : téléverse l'image du blason de la classe dans l'espace de stockage sécurisé.
     */
    async uploadLogo(classId: string, photoBlob: Blob, userId: string): Promise<string | null> {
        // Vérifier que la classe appartient à l'utilisateur
        const classCheck = await this.getClassById(classId, userId);
        if (!classCheck) return null;

        // On génère un nom de fichier unique basé sur le temps
        const fileName = `classe/${classId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('photos').upload(fileName, photoBlob, { upsert: true });
        
        if (error) {
            console.error("Upload failed", error);
            return null;
        }

        // On récupère le lien public pour l'afficher sur l'écran de l'utilisateur
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        return publicUrl;
    }
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le service envoie un ordre précis (ex: "Ajoute cet élève à la classe GS").
 * 2. SupabaseClassRepository traduit cet ordre en langage SQL compréhensible par le serveur.
 * 3. Il expédie la requête via Internet.
 * 4. Une fois la réponse reçue :
 *    - Si tout va bien : il renvoie les données (ou une confirmation) au service.
 *    - Si un problème survient (ex: nom déjà utilisé) : il remonte le message d'erreur.
 */
