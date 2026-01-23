import { TablesUpdate } from '../../../types/supabase';
import { ClassWithAdults, StudentWithRelations } from '../services/classService';

export interface IClassRepository {
    getClasses(): Promise<ClassWithAdults[]>;
    getStudentsByClass(classId: string): Promise<StudentWithRelations[]>;
    deleteClass(classId: string): Promise<void>;
    removeStudentFromClass(studentId: string): Promise<void>;
    updateStudentField(studentId: string, field: keyof TablesUpdate<'Eleve'>, value: any): Promise<void>;

    // Write operations
    createClass(data: any): Promise<{ id: string }>;
    updateClass(classId: string, data: any): Promise<void>;
    linkAdult(classId: string, adultId: string, role: string): Promise<void>;
    unlinkAllAdults(classId: string): Promise<void>;
    uploadLogo(classId: string, photoBlob: Blob): Promise<string | null>;
}
