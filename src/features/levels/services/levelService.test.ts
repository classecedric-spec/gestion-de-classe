import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelService } from './levelService';
import { ILevelRepository } from '../repositories/ILevelRepository';
import { LevelWithStudentCount } from '../../../types';
import { supabase } from '../../../lib/database';

const mockRepository = {
    getLevels: vi.fn(),
    getStudentsByLevel: vi.fn(),
    createLevel: vi.fn(),
    updateLevel: vi.fn(),
    deleteLevel: vi.fn(),
    updateOrders: vi.fn(),
    getMaxOrder: vi.fn(),
} as unknown as ILevelRepository;

// Mock Supabase Auth
vi.mock('../../../lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        }
    }
}));

describe('LevelService', () => {
    let levelService: LevelService;

    beforeEach(() => {
        vi.clearAllMocks();
        levelService = new LevelService(mockRepository);
    });

    describe('fetchLevels', () => {
        it('should return levels list', async () => {
            const mockLevels = [{ id: 'l1', nom: 'CE1', ordre: 1 }] as LevelWithStudentCount[];
            vi.mocked(mockRepository.getLevels).mockResolvedValue(mockLevels);

            const result = await levelService.fetchLevels();

            expect(mockRepository.getLevels).toHaveBeenCalled();
            expect(result).toEqual(mockLevels);
        });
    });

    describe('createLevel', () => {
        it('should create level with correct order', async () => {
            // Mock Auth
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: { id: 'user-1' } as any },
                error: null
            });

            // Mock Repo
            vi.mocked(mockRepository.getMaxOrder).mockResolvedValue(5);
            vi.mocked(mockRepository.createLevel).mockResolvedValue({ id: 'l_new', nom: 'New', ordre: 6 } as any);

            const result = await levelService.createLevel({ nom: 'New' } as any);

            expect(mockRepository.getMaxOrder).toHaveBeenCalled();
            expect(mockRepository.createLevel).toHaveBeenCalledWith(expect.objectContaining({
                nom: 'New',
                user_id: 'user-1',
                ordre: 6
            }));
            expect(result).toEqual(expect.objectContaining({ id: 'l_new' }));
        });
    });
});
