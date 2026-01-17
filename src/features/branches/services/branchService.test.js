import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../../lib/supabaseClient';
import { branchService } from './branchService';
import { createMockQueryBuilder } from '../../../test/utils';

describe('branchService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchBranches', () => {
        it('should fetch all branches ordered by ordre', async () => {
            const mockBranches = [
                { id: '1', nom: 'Mathématiques', ordre: 1 },
                { id: '2', nom: 'Français', ordre: 2 },
            ];

            const mockBuilder = createMockQueryBuilder(mockBranches);
            supabase.from.mockReturnValue(mockBuilder);

            const branches = await branchService.fetchBranches();

            expect(supabase.from).toHaveBeenCalledWith('Branche');
            expect(branches).toEqual(mockBranches);
        });
    });

    describe('fetchSubBranches', () => {
        it('should fetch sub-branches for a specific branch', async () => {
            const branchId = '1';
            const mockSubBranches = [
                { id: 's1', nom: 'Algèbre', branche_id: '1', ordre: 1 },
                { id: 's2', nom: 'Géométrie', branche_id: '1', ordre: 2 },
            ];

            const mockBuilder = createMockQueryBuilder(mockSubBranches);
            supabase.from.mockReturnValue(mockBuilder);

            const subBranches = await branchService.fetchSubBranches(branchId);

            expect(supabase.from).toHaveBeenCalledWith('SousBranche');
            expect(subBranches).toEqual(mockSubBranches);
        });
    });

    describe('createBranch', () => {
        it('should create a new branch with auto-generated ordre', async () => {
            const newBranch = { nom: 'Sciences', photo_base64: null };
            const mockCreatedBranch = {
                id: '3',
                nom: 'Sciences',
                ordre: 3,
                user_id: 'test-user-id',
                photo_base64: null,
            };

            // Mock getting max order (1st call)
            const maxOrderBuilder = createMockQueryBuilder([{ ordre: 2 }]);

            // Mock insert (2nd call)
            const insertBuilder = createMockQueryBuilder(mockCreatedBranch);

            supabase.from
                .mockReturnValueOnce(maxOrderBuilder)
                .mockReturnValueOnce(insertBuilder);

            const result = await branchService.createBranch(newBranch);

            expect(result).toEqual(mockCreatedBranch);
        });
    });

    describe('deleteBranch', () => {
        it('should delete a branch successfully', async () => {
            const mockBuilder = createMockQueryBuilder(null);
            supabase.from.mockReturnValue(mockBuilder);

            await expect(branchService.deleteBranch('1')).resolves.not.toThrow();
        });
    });

    describe('updateOrder', () => {
        it('should update multiple branches order', async () => {
            const updates = [
                { id: '1', nom: 'Français', ordre: 1 },
                { id: '2', nom: 'Mathématiques', ordre: 2 },
            ];

            const mockBuilder = createMockQueryBuilder(null);
            supabase.from.mockReturnValue(mockBuilder);

            await branchService.updateOrder(updates);

            expect(supabase.from).toHaveBeenCalledWith('Branche');
        });
    });
});
