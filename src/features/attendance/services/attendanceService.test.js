import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../../lib/supabaseClient';
import { attendanceService } from './attendanceService';
import { createMockQueryBuilder } from '../../../test/utils';

describe('attendanceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchGroups', () => {
        it('should fetch all groups ordered by name', async () => {
            const mockGroups = [{ id: 'g1', nom: 'Group A' }];
            const mockBuilder = createMockQueryBuilder(mockGroups);
            supabase.from.mockReturnValue(mockBuilder);

            const result = await attendanceService.fetchGroups();

            expect(supabase.from).toHaveBeenCalledWith('Groupe');
            expect(result).toEqual(mockGroups);
        });
    });

    describe('fetchStudentsByGroup', () => {
        it('should return empty array if no links found', async () => {
            // Mock empty EleveGroupe
            const linksBuilder = createMockQueryBuilder([]);
            supabase.from.mockReturnValue(linksBuilder);

            const result = await attendanceService.fetchStudentsByGroup('g1');

            expect(result).toEqual([]);
            expect(supabase.from).toHaveBeenCalledWith('EleveGroupe');
            expect(supabase.from).not.toHaveBeenCalledWith('Eleve');
            expect(supabase.from).toHaveBeenCalledTimes(1);
        });

        it('should fetch students when links exist', async () => {
            // 1. Links
            const mockLinks = [{ eleve_id: 'e1' }, { eleve_id: 'e2' }];
            const linksBuilder = createMockQueryBuilder(mockLinks);

            // 2. Students
            const mockStudents = [
                { id: 'e1', nom: 'Doe', Classe: { nom: 'CP' } },
                { id: 'e2', nom: 'Smith', Classe: { nom: 'CE1' } }
            ];
            const studentsBuilder = createMockQueryBuilder(mockStudents);

            supabase.from
                .mockReturnValueOnce(linksBuilder)
                .mockReturnValueOnce(studentsBuilder);

            const result = await attendanceService.fetchStudentsByGroup('g1');

            expect(supabase.from).toHaveBeenCalledWith('EleveGroupe');
            expect(supabase.from).toHaveBeenCalledWith('Eleve');
            expect(result).toEqual(mockStudents);
        });
    });

    describe('createSetup', () => {
        it('should insert and return new setup', async () => {
            const newSetup = { id: 1, nom: 'Setup 1', user_id: 'u1' };
            const mockBuilder = createMockQueryBuilder(newSetup);
            supabase.from.mockReturnValue(mockBuilder);

            const result = await attendanceService.createSetup('u1', 'Setup 1', 'Desc');

            expect(supabase.from).toHaveBeenCalledWith('SetupPresence');
            expect(result).toEqual(newSetup);
        });
    });

    describe('ensureAbsentCategory', () => {
        it('should create absent category if count is 0', async () => {
            // 1. Check count (mocking .select({count: 'exact'}) response logic is tricky with generic mock, 
            // but our createsMockQueryBuilder doesn't deeply simulate 'count' property on response object usually.
            // Let's check implementation: 
            // const { count } = await supabase...
            // createMockQueryBuilder returns { data, error, count: null } by default unless we tweak it.
            // We probably need to hack the return of `resolve` in builder for specific calls?
            // Actually createMockSupabaseResponse in utils does not set count.

            // LET'S IMPROVE createMockQueryBuilder response in test or assume we patch utils later.
            // For now, let's override the `promise` return of the builder methods.

            // Actually, `createMockQueryBuilder` has `then` which calls `resolve`.
            // We can spy on the builder methods or just mock return value of the chain?
            // `supabase.from().select().eq().eq()` returns a builder.
            // We await `builder`.

            // To simulate `{ count: 0 }`, we need the promise to resolve to `{ count: 0, data: [], error: null }`.

            // We can create a custom object that mimics builder but has custom resolution.
            // Or we can modify createMockSupabaseResponse in utils.js? 
            // Let's do it locally here.

            const countBuilder = createMockQueryBuilder([]);
            // Override the `then` or `maybeSingle` behavior?
            // The service calls `await supabase...`. It invokes `then`.
            countBuilder.then = vi.fn((resolve) => resolve({ count: 0, data: [], error: null }));

            const insertBuilder = createMockQueryBuilder(null);

            supabase.from
                .mockReturnValueOnce(countBuilder)  // Check
                .mockReturnValueOnce(insertBuilder); // Insert

            await attendanceService.ensureAbsentCategory('s1', 'u1');

            expect(supabase.from).toHaveBeenCalledWith('CategoriePresence');
            // Should be called twice
            expect(supabase.from).toHaveBeenCalledTimes(2);
        });

        it('should NOT create absent category if count > 0', async () => {
            const countBuilder = createMockQueryBuilder([]);
            countBuilder.then = vi.fn((resolve) => resolve({ count: 1, data: [], error: null }));

            supabase.from.mockReturnValueOnce(countBuilder);

            await attendanceService.ensureAbsentCategory('s1', 'u1');

            expect(supabase.from).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetchDistinctDates', () => {
        it('should return unique sorted dates desc', async () => {
            const mockData = [
                { date: '2023-01-01' },
                { date: '2023-01-02' },
                { date: '2023-01-01' } // Duplicate
            ];
            const mockBuilder = createMockQueryBuilder(mockData);
            supabase.from.mockReturnValue(mockBuilder);

            const result = await attendanceService.fetchDistinctDates('s1');

            expect(result).toEqual(['2023-01-02', '2023-01-01']);
        });
    });
});
