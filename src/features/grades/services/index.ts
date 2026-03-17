import { SupabaseGradeRepository } from '../repositories/SupabaseGradeRepository';
import { GradeService } from './gradeService';

const gradeRepository = new SupabaseGradeRepository();
export const gradeService = new GradeService(gradeRepository);
