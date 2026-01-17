import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../../lib/supabaseClient';
import { subBranchService } from './subBranchService';
import { createMockQueryBuilder } from '../../../test/utils';

describe('subBranchService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchAll', () => {
        it('should fetch all sub-branches ordered by name', async () => {
            const mockData = [
                { id: '1', nom: 'Algèbre', Branche: { nom: 'Maths' } }
            ];
            const mockBuilder = createMockQueryBuilder(mockData);
            supabase.from.mockReturnValue(mockBuilder);

            const result = await subBranchService.fetchAll();

            expect(supabase.from).toHaveBeenCalledWith('SousBranche');
            expect(result).toEqual(mockData);
        });
    });

    describe('create', () => {
        it('should create sub-branch attached to user', async () => {
            const input = { nom: 'Géométrie', branche_id: 'b1' };
            const output = { id: 's1', ...input, user_id: 'test-user-id' };

            const mockBuilder = createMockQueryBuilder(output);
            supabase.from.mockReturnValue(mockBuilder);

            const result = await subBranchService.create(input);

            expect(supabase.from).toHaveBeenCalledWith('SousBranche');
            // Supabase auth getUser is mocked globally in setup.js to return { user: { id: 'test-user-id' } }
            // So we can assume user_id is injected by logic using that ID.
            expect(result).toEqual(output);
        });
    });

    describe('update', () => {
        it('should update and return data', async () => {
            const input = { nom: 'Géométrie Avancée' };
            const output = { id: 's1', ...input };

            const mockBuilder = createMockQueryBuilder(output);
            supabase.from.mockReturnValue(mockBuilder);

            const result = await subBranchService.update('s1', input);

            expect(supabase.from).toHaveBeenCalledWith('SousBranche');
            expect(result).toEqual(output);
        });
    });

    describe('delete', () => {
        it('should delete and check for data return', async () => {
            // Service throws if data is null/empty
            const mockBuilder = createMockQueryBuilder([{ id: 's1' }]);
            supabase.from.mockReturnValue(mockBuilder);

            await expect(subBranchService.delete('s1')).resolves.not.toThrow();

            expect(supabase.from).toHaveBeenCalledWith('SousBranche');
        });

        it('should throw if delete returns empty data (RLS check)', async () => {
            const mockBuilder = createMockQueryBuilder([]);
            supabase.from.mockReturnValue(mockBuilder);

            await expect(subBranchService.delete('s1')).rejects.toThrow("Suppression échouée");
        });
    });
});
