import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdultService } from './adultService';
import { IAdultRepository } from '../repositories/IAdultRepository';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

describe('AdultService', () => {
    let service: AdultService;
    let mockRepository: IAdultRepository;

    beforeEach(() => {
        mockRepository = {
            getAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as any;

        service = new AdultService(mockRepository);
    });

    describe('fetchAll', () => {
        it('should fetch all adults from repository', async () => {
            const mockAdults: Tables<'Adulte'>[] = [
                { id: 'adult1', nom: 'Dupont', prenom: 'Marie', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'adult2', nom: 'Martin', prenom: 'Jean', user_id: 'user1', created_at: '2024-01-01' }
            ];

            vi.mocked(mockRepository.getAll).mockResolvedValue(mockAdults);

            const result = await service.fetchAll();

            expect(result).toEqual(mockAdults);
            expect(mockRepository.getAll).toHaveBeenCalledOnce();
        });
    });

    describe('create', () => {
        it('should create an adult with user_id', async () => {
            const adultData = { nom: 'Dupont', prenom: 'Marie' };
            const mockCreated: Tables<'Adulte'> = {
                id: 'adult1',
                nom: 'Dupont',
                prenom: 'Marie',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.create).mockResolvedValue(mockCreated);

            const result = await service.create(adultData, 'user1');

            expect(result).toEqual(mockCreated);
            expect(mockRepository.create).toHaveBeenCalledWith({
                ...adultData,
                user_id: 'user1'
            });
        });
    });

    describe('update', () => {
        it('should update an adult', async () => {
            const updates: TablesUpdate<'Adulte'> = { nom: 'Durand' };
            const mockUpdated: Tables<'Adulte'> = {
                id: 'adult1',
                nom: 'Durand',
                prenom: 'Marie',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated);

            const result = await service.update('adult1', updates);

            expect(result).toEqual(mockUpdated);
            expect(mockRepository.update).toHaveBeenCalledWith('adult1', updates);
        });
    });

    describe('delete', () => {
        it('should delete an adult', async () => {
            vi.mocked(mockRepository.delete).mockResolvedValue();

            await service.delete('adult1');

            expect(mockRepository.delete).toHaveBeenCalledWith('adult1');
        });
    });
});
