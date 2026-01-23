import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export interface IStudentRepository {
    findById(id: string): Promise<Tables<'Eleve'> | null>;
    findAll(): Promise<Tables<'Eleve'>[]>;
    create(student: TablesInsert<'Eleve'>): Promise<Tables<'Eleve'>>;
    update(id: string, student: TablesUpdate<'Eleve'>): Promise<Tables<'Eleve'>>;
    delete(id: string): Promise<void>;

    // Relations
    getLinkedGroupIds(studentId: string): Promise<string[]>;
    linkToGroup(studentId: string, groupId: string, userId: string): Promise<void>;
    unlinkFromGroup(linkId: string): Promise<void>;
    unlinkMultiFromGroup(linkIds: string[]): Promise<void>;
    getStudentGroupLinks(studentId: string): Promise<{ id: string, groupe_id: string }[]>;

    // Specific queries that might be needed
    findByClass(classId: string): Promise<Tables<'Eleve'>[]>;
    findByGroup(groupId: string): Promise<any[]>;
    findByGroups(groupIds: string[]): Promise<any[]>;
    findAllForTeacher(teacherId: string): Promise<any[]>;
    updateImportance(id: string, importance: number | null): Promise<void>;
    getStudentsDelta(teacherId: string): Promise<{ delta: any[], isFirstSync: boolean }>;
}
