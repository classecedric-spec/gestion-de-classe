import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassService } from './classService';
import { IClassRepository } from '../repositories/IClassRepository';
import { ClassWithAdults } from './classService';

// Mock Repository
const mockRepository = {
    getClasses: vi.fn(),
    getStudentsByClass: vi.fn(),
    deleteClass: vi.fn(),
    removeStudentFromClass: vi.fn(),
    updateStudentField: vi.fn(),
} as unknown as IClassRepository;

describe('ClassService', () => {
    let classService: ClassService;

    beforeEach(() => {
        vi.clearAllMocks();
        classService = new ClassService(mockRepository);
    });

    describe('getClasses', () => {
        it('should return classes list', async () => {
            const mockClasses = [{ id: 'c1', nom: 'CP' }] as ClassWithAdults[];
            vi.mocked(mockRepository.getClasses).mockResolvedValue(mockClasses);

            const result = await classService.getClasses();

            expect(mockRepository.getClasses).toHaveBeenCalled();
            expect(result).toEqual(mockClasses);
        });
    });

    describe('deleteClass', () => {
        it('should call delete on repository', async () => {
            vi.mocked(mockRepository.deleteClass).mockResolvedValue(undefined);

            await classService.deleteClass('c1');

            expect(mockRepository.deleteClass).toHaveBeenCalledWith('c1');
        });
    });
});
