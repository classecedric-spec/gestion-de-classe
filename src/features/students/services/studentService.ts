/**
 * Nom du module/fichier : studentService.ts
 * 
 * Données en entrée : 
 *   - Les informations brutes d'un élève (nom, prénom, date de naissance, parents).
 *   - Une photo au format image (base64) si fournie.
 *   - La liste des groupes auxquels l'enfant doit appartenir.
 * 
 * Données en sortie : 
 *   - L'identifiant (ID) de l'élève créé ou mis à jour.
 *   - Les données synchronisées entre le profil de l'élève et ses appartenances aux groupes.
 * 
 * Objectif principal : Centraliser toute "l'intelligence métier" liée aux élèves. Ce service fait le pont entre l'interface utilisateur et la base de données. Il s'occupe de valider que les informations sont correctes, de ranger la photo de l'élève dans le cloud, et de gérer les étiquettes de groupes (ex: si on ajoute un élève dans le groupe "Soutien", il s'occupe de créer le lien technique).
 * 
 * Ce que ça affiche : Rien (c'est un moteur invisible de services).
 */

import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { storageService } from '../../../lib/storage';
import { validateWith, StudentSchema } from '../../../lib/helpers';
import { SupabaseStudentRepository } from '../repositories/SupabaseStudentRepository';
import { IStudentRepository } from '../repositories/IStudentRepository';

/**
 * Service orchestrant les opérations sur les élèves.
 */
export class StudentService {
    constructor(private repository: IStudentRepository) { }

    /**
     * Récupère la fiche complète d'un élève par son identifiant unique.
     */
    getStudent = async (id: string, userId: string): Promise<Tables<'Eleve'> | null> => {
        return await this.repository.findById(id, userId);
    }

    /**
     * Liste les identifiants techniques des groupes auxquels l'élève est rattaché.
     */
    getStudentGroupIds = async (studentId: string, userId: string): Promise<string[]> => {
        return await this.repository.getLinkedGroupIds(studentId, userId);
    }

    /**
     * Envoie la photo d'identité de l'élève vers le serveur de stockage.
     * Renvoie l'adresse (URL) publique de l'image.
     */
    uploadStudentPhoto = async (studentId: string, base64Data: string): Promise<string | null> => {
        // On délègue l'envoi physique au service de stockage global
        const result = await storageService.uploadImage('eleve', studentId, base64Data);
        return result.publicUrl;
    }


    /**
     * SAUVEGARDE GLOBALE : Crée ou met à jour un dossier élève complet.
     * Cette fonction est complexe car elle gère à la fois le profil, la photo et les groupes.
     */
    saveStudent = async (
        studentData: TablesInsert<'Eleve'> | TablesUpdate<'Eleve'>,
        groupIds: string[],
        userId: string,
        isEdit = false,
        editId: string | null = null,
        photoBase64Arg: string | null = null
    ): Promise<string> => {
        
        // PROTECTION DOUBLONS : On s'assure que la liste des groupes ne contient pas de doublons techniques.
        const uniqueGroupIds = Array.from(new Set(groupIds));

        // VALIDATION : On vérifie que les données respectent les règles (ex: pas de nom vide).
        const validation = validateWith(StudentSchema.partial(), studentData);

        if (!validation.success) {
            throw new Error(`Données invalides : ${validation.errors.join(', ')}`);
        }

        let studentId = editId;
        const dataToSave = { ...studentData };

        // SECURITÉ : On attache toujours l'ID de l'enseignant titulaire au dossier.
        (dataToSave as any).titulaire_id = userId;

        // GESTION DU PROFIL (CRÉATION OU MODIFICATION)
        if (isEdit && editId) {
            /**
             * Cas de la MODIFICATION :
             * Si une nouvelle photo est fournie, on l'écrase dans le stockage avant de mettre à jour le profil.
             */
            if (photoBase64Arg && photoBase64Arg.startsWith('data:image')) {
                const photoUrl = await this.uploadStudentPhoto(editId, photoBase64Arg);
                if (photoUrl) {
                    (dataToSave as any).photo_url = photoUrl;
                }
            }
            await this.repository.update(editId, dataToSave as TablesUpdate<'Eleve'>, userId);
        } else {
            /**
             * Cas de la CRÉATION :
             * 1. On crée d'abord le dossier vide pour obtenir un ID.
             * 2. Si une photo est fournie, on utilise cet ID pour la nommer correctement dans le stockage.
             * 3. On met enfin à jour le dossier avec l'adresse de la photo.
             */
            const createdStudent = await this.repository.create(dataToSave as TablesInsert<'Eleve'>, userId);
            studentId = createdStudent.id;
 
            if (photoBase64Arg && photoBase64Arg.startsWith('data:image')) {
                const photoUrl = await this.uploadStudentPhoto(studentId, photoBase64Arg);
                if (photoUrl) {
                    await this.repository.update(studentId, { photo_url: photoUrl } as TablesUpdate<'Eleve'>, userId);
                }
            }
        }

        if (!studentId) throw new Error("Impossible de déterminer l'identifiant de l'élève.");

        // SYNCHRONISATION DES GROUPES :
        // L'objectif est de comparer les groupes actuels de l'élève avec la nouvelle liste cochée par le prof.
        const currentLinks = await this.repository.getStudentGroupLinks(studentId, userId);
        const currentLinkedGroupIds = currentLinks.map(l => l.groupe_id);
        
        // Groupes que l'élève vient de rejoindre
        const groupsToAdd = uniqueGroupIds.filter(id => !currentLinkedGroupIds.includes(id));
        // Groupes que l'élève doit quitter
        const groupsToRemove = currentLinkedGroupIds.filter(id => !uniqueGroupIds.includes(id));

        // Application des ajouts
        for (const gid of groupsToAdd) {
            await this.repository.linkToGroup(studentId, gid, userId);
        }

        // Application des suppressions
        if (groupsToRemove.length > 0) {
            const linkIdsToRemove = currentLinks
                .filter(link => groupsToRemove.includes(link.groupe_id))
                .map(link => link.id);

            if (linkIdsToRemove.length > 0) {
                await this.repository.unlinkMultiFromGroup(linkIdsToRemove, userId);
            }
        }

        return studentId;
    }

    /**
     * Supprime définitivement le dossier d'un élève.
     */
    deleteStudent = async (id: string, userId: string): Promise<void> => {
        return await this.repository.delete(id, userId);
    }

    /**
     * Récupère la totalité des élèves d'un enseignant (pour le trombinoscope principal).
     */
    getStudentsForTeacher = async (teacherId: string): Promise<any[]> => {
        return await this.repository.findAllForTeacher(teacherId);
    }

    /**
     * Récupère les élèves appartenant à un groupe spécifique.
     */
    getStudentsByGroup = async (groupId: string, userId: string): Promise<any[]> => {
        return await this.repository.findByGroup(groupId, userId);
    }

    /**
     * Récupère les élèves appartenant à une liste de groupes (ex: tous les groupes de soutien).
     */
    getStudentsByGroups = async (groupIds: string[], userId: string): Promise<any[]> => {
        return await this.repository.findByGroups(groupIds, userId);
    }


    /**
     * Met à jour le niveau "d'importance de suivi" (couleur visuelle sur la fiche élève).
     */
    updateStudentImportance = async (id: string, importance: number | null, userId: string): Promise<void> => {
        return await this.repository.updateImportance(id, importance, userId);
    }

    /**
     * Met à jour n'importe quel champ simple de l'élève (ex: changer le prénom).
     */
    updateStudent = async (id: string, updates: TablesUpdate<'Eleve'>, userId: string): Promise<void> => {
        await this.repository.update(id, updates, userId);
    }

    /**
     * Récupère uniquement les changements effectués depuis la dernière synchronisation 
     * pour économiser de la batterie et des données mobiles.
     */
    getStudentsDelta = async (teacherId: string): Promise<{ delta: any[], isFirstSync: boolean }> => {
        return await this.repository.getStudentsDelta(teacherId);
    }
}

// Instance unique du service prête à l'emploi dans toute l'application.
export const studentService = new StudentService(new SupabaseStudentRepository());

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant valide le formulaire d'un nouvel élève "Julie Martin" avec sa photo.
 * 2. Le `studentService` reçoit cette demande massive.
 * 3. ÉTAPE VALIDATION : Il vérifie que le nom n'est pas vide par exemple.
 * 4. ÉTAPE PROFIL : 
 *    - Il crée la ligne brute de Julie en base de données pour avoir son ID.
 *    - Il envoie la photo sur le serveur Cloud en la nommant "id_julie.jpg".
 *    - Il récupère l'adresse web de cette photo et l'enregistre dans le profil de Julie.
 * 5. ÉTAPE GROUPES : 
 *    - Si l'enseignant a coché "Groupe Rouge", le service crée le lien entre Julie et ce groupe.
 * 6. FIN : Il renvoie le signal "Succès" à l'interface qui ferme alors la fenêtre.
 */
