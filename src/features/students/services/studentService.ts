import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';
import { storageService } from '../../../lib/storage';
import { validateWith, StudentSchema } from '../../../lib/helpers';
import { SupabaseStudentRepository } from '../repositories/SupabaseStudentRepository';
import { IStudentRepository } from '../repositories/IStudentRepository';

export class StudentService {
    constructor(private repository: IStudentRepository) { }

    /**
     * Récupère un élève par son ID
     * @param {string} id - ID de l'élève
     * @returns {Promise<Tables<'Eleve'> | null>} L'élève trouvé ou null
     * @throws {PostgrestError} Si la requête échoue
     */
    getStudent = async (id: string): Promise<Tables<'Eleve'> | null> => {
        return await this.repository.findById(id);
    }

    /**
     * Récupère les IDs des groupes liés à un élève
     * @param {string} studentId - ID de l'élève
     * @returns {Promise<string[]>} Liste des IDs de groupes
     * @throws {PostgrestError} Si la requête échoue
     */
    getStudentGroupIds = async (studentId: string): Promise<string[]> => {
        return await this.repository.getLinkedGroupIds(studentId);
    }

    /**
     * Upload une photo d'élève vers Supabase Storage
     * @param {string} studentId - ID de l'élève
     * @param {string} base64Data - Données base64 de l'image
     * @returns {Promise<string | null>} URL publique de la photo ou null en cas d'erreur
     */
    uploadStudentPhoto = async (studentId: string, base64Data: string): Promise<string | null> => {
        const result = await storageService.uploadImage('eleve', studentId, base64Data);
        return result.publicUrl;
    }


    /**
     * Sauvegarde (Création ou Mise à jour) d'un élève et de ses groupes
     * @param {TablesInsert<'Eleve'> | TablesUpdate<'Eleve'>} studentData - Données de l'élève
     * @param {string[]} groupIds - IDs des groupes auxquels l'élève doit appartenir
     * @param {string} userId - ID de l'utilisateur courant (professeur)
     * @param {boolean} [isEdit=false] - Mode édition (true) ou création (false)
     * @param {string | null} [editId=null] - ID de l'élève en cas d'édition
     * @param {string | null} [photoBase64Arg=null] - Nouvelle photo en base64 si uploadée
     * @returns {Promise<string>} ID de l'élève créé ou mis à jour
     * @throws {Error} Si validation échoue ou erreur DB
     */
    saveStudent = async (
        studentData: TablesInsert<'Eleve'> | TablesUpdate<'Eleve'>,
        groupIds: string[],
        userId: string,
        isEdit = false,
        editId: string | null = null,
        photoBase64Arg: string | null = null
    ): Promise<string> => {
        // Validation des données
        const validation = validateWith(StudentSchema.partial(), studentData);

        if (!validation.success) {
            throw new Error(`Erreur de validation: ${validation.errors.join(', ')}`);
        }

        let studentId = editId;

        // Prepare data for save
        const dataToSave = { ...studentData };

        // Handle Photo Upload if base64 is present
        let photoUrl: string | null = null;
        const photoBase64 = photoBase64Arg;

        // 1. Insert or Update Student Core Data
        if (isEdit && editId) {
            // Upload photo if new one provided
            if (photoBase64 && photoBase64.startsWith('data:image')) {
                photoUrl = await this.uploadStudentPhoto(editId, photoBase64);
                if (photoUrl) {
                    (dataToSave as any).photo_url = photoUrl;
                }
            }

            // REPOSITORY UPDATE
            await this.repository.update(editId, dataToSave as TablesUpdate<'Eleve'>);
        } else {
            // Create first (REPOSITORY CREATE)
            const createdStudent = await this.repository.create(dataToSave as TablesInsert<'Eleve'>);
            studentId = createdStudent.id;

            // Upload photo if provided
            if (photoBase64 && photoBase64.startsWith('data:image')) {
                photoUrl = await this.uploadStudentPhoto(studentId, photoBase64);
                if (photoUrl) {
                    // Update the student with the photo URL (REPOSITORY UPDATE)
                    await this.repository.update(studentId, { photo_url: photoUrl } as TablesUpdate<'Eleve'>);
                }
            }
        }

        if (!studentId) throw new Error("Student ID could not be determined");

        // 2. Manage Groups (Sync)
        const currentLinks = await this.repository.getStudentGroupLinks(studentId);

        const currentLinkedGroupIds = currentLinks.map(l => l.groupe_id);
        const groupsToAdd = groupIds.filter(id => !currentLinkedGroupIds.includes(id));
        const groupsToRemove = currentLinkedGroupIds.filter(id => !groupIds.includes(id));

        // Add new links
        for (const gid of groupsToAdd) {
            await this.repository.linkToGroup(studentId, gid, userId);
        }

        // Remove old links
        if (groupsToRemove.length > 0) {
            const linkIdsToRemove = currentLinks
                .filter(link => groupsToRemove.includes(link.groupe_id))
                .map(link => link.id);

            if (linkIdsToRemove.length > 0) {
                await this.repository.unlinkMultiFromGroup(linkIdsToRemove);
            }
        }

        return studentId;
    }

    /**
         * Supprime un élève
         * @param {string} id - ID de l'élève
         */
    deleteStudent = async (id: string): Promise<void> => {
        return await this.repository.delete(id);
    }

    /**
     * Récupère la liste complète des élèves pour un enseignant (avec joins)
     * @param {string} teacherId - ID de l'enseignant
     */
    getStudentsForTeacher = async (teacherId: string): Promise<any[]> => {
        return await this.repository.findAllForTeacher(teacherId);
    }

    /**
     * Récupère les élèves d'un groupe avec niveau
     * @param {string} groupId - ID du groupe
     */
    getStudentsByGroup = async (groupId: string): Promise<any[]> => {
        return await this.repository.findByGroup(groupId);
    }

    getStudentsByGroups = async (groupIds: string[]): Promise<any[]> => {
        return await this.repository.findByGroups(groupIds);
    }


    /**
     * Met à jour l'importance de suivi d'un élève
     * @param {string} id - ID de l'élève
     * @param {number | null} importance - Valeur d'importance (0-100 ou null)
     */
    updateStudentImportance = async (id: string, importance: number | null): Promise<void> => {
        return await this.repository.updateImportance(id, importance);
    }

    updateStudent = async (id: string, updates: TablesUpdate<'Eleve'>): Promise<void> => {
        await this.repository.update(id, updates);
    }

    getStudentsDelta = async (teacherId: string): Promise<{ delta: any[], isFirstSync: boolean }> => {
        return await this.repository.getStudentsDelta(teacherId);
    }
}

export const studentService = new StudentService(new SupabaseStudentRepository());
