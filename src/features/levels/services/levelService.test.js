import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../../lib/supabaseClient';
import { levelService } from './levelService';
import { createMockQueryBuilder } from '../../../test/utils';

// Note: supabase is already mocked in setup.js, but we can override implementations here

describe('levelService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchLevels', () => {
        it('should fetch all levels ordered by ordre', async () => {
            const mockLevels = [
                { id: '1', nom: 'CM1', ordre: 1 },
                { id: '2', nom: 'CM2', ordre: 2 },
            ];

            // Mock the chain: from -> select -> order -> [data]
            const mockBuilder = createMockQueryBuilder(mockLevels);
            supabase.from.mockReturnValue(mockBuilder);

            const levels = await levelService.fetchLevels();

            expect(supabase.from).toHaveBeenCalledWith('Niveau');
            expect(levels).toEqual(mockLevels);
        });

        it('should throw error when fetch fails', async () => {
            const mockError = { message: 'Database error' }; // Supabase errors are objects

            const mockBuilder = createMockQueryBuilder(null, mockError);
            supabase.from.mockReturnValue(mockBuilder);

            await expect(levelService.fetchLevels()).rejects.toThrow('Database error');
        });
    });

    describe('createLevel', () => {
        it('should create a new level with auto-generated ordre', async () => {
            const newLevel = { nom: 'CE2' };
            const mockCreatedLevel = { id: '3', nom: 'CE2', ordre: 3, user_id: 'test-user-id' };

            // mocking max order fetch (First call to supabase.from)
            // returns [{ ordre: 2 }]
            const maxOrderBuilder = createMockQueryBuilder([{ ordre: 2 }]);

            // mocking insert (Second call to supabase.from)
            // returns inserted data
            const insertBuilder = createMockQueryBuilder(mockCreatedLevel);

            supabase.from
                .mockReturnValueOnce(maxOrderBuilder) // For max order check
                .mockReturnValueOnce(insertBuilder);  // For insert

            const result = await levelService.createLevel(newLevel);

            expect(result).toEqual(mockCreatedLevel);
            // Verify calls? 
            expect(supabase.from).toHaveBeenCalledTimes(2);
        });
    });

    describe('deleteLevel', () => {
        it('should delete a level successfully', async () => {
            const mockBuilder = createMockQueryBuilder(null);
            supabase.from.mockReturnValue(mockBuilder);

            await expect(levelService.deleteLevel('1')).resolves.not.toThrow();
        });
    });
});
