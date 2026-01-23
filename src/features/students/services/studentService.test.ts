import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from './studentService';
import { IStudentRepository } from '../repositories/IStudentRepository';
import { Tables } from '../../../types/supabase';

// Mock Repository
const mockRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getLinkedGroupIds: vi.fn(),
    getStudentGroupLinks: vi.fn(),
    linkToGroup: vi.fn(),
    unlinkFromGroup: vi.fn(),
    unlinkMultiFromGroup: vi.fn(),
    findByClass: vi.fn(),
} as unknown as IStudentRepository;

describe('StudentService', () => {
    let studentService: StudentService;

    beforeEach(() => {
        vi.clearAllMocks();
        studentService = new StudentService(mockRepository);
    });

    describe('getStudent', () => {
        it('should return a student when found', async () => {
            const mockStudent = { id: '123', nom: 'Doe', prenom: 'John' } as Tables<'Eleve'>;
            vi.mocked(mockRepository.findById).mockResolvedValue(mockStudent);

            const result = await studentService.getStudent('123');

            expect(mockRepository.findById).toHaveBeenCalledWith('123');
            expect(result).toEqual(mockStudent);
        });

        it('should return null when not found', async () => {
            vi.mocked(mockRepository.findById).mockResolvedValue(null);

            const result = await studentService.getStudent('999');

            expect(mockRepository.findById).toHaveBeenCalledWith('999');
            expect(result).toBeNull();
        });
    });

    describe('saveStudent', () => {
        it('should create a new student successfully', async () => {
            // Use valid UUID for classe_id
            const validUUID = '123e4567-e89b-12d3-a456-426614174000';
            const newStudentData = { nom: 'Doe', prenom: 'Jane', classe_id: validUUID };
            const createdStudent = { id: 'new-id', ...newStudentData } as Tables<'Eleve'>;

            vi.mocked(mockRepository.create).mockResolvedValue(createdStudent);
            vi.mocked(mockRepository.getStudentGroupLinks).mockResolvedValue([]);

            const resultId = await studentService.saveStudent(newStudentData, [], 'user-1', false);

            expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining(newStudentData));
            expect(resultId).toBe('new-id');
        });

        it('should update an existing student successfully', async () => {
            const updateData = { nom: 'Doe Updated' };

            vi.mocked(mockRepository.update).mockResolvedValue({ id: 'existing-id', ...updateData } as Tables<'Eleve'>);
            vi.mocked(mockRepository.getStudentGroupLinks).mockResolvedValue([]);

            const resultId = await studentService.saveStudent(updateData, [], 'user-1', true, 'existing-id');

            expect(mockRepository.update).toHaveBeenCalledWith('existing-id', expect.objectContaining(updateData));
            expect(resultId).toBe('existing-id');
        });
    });
});
