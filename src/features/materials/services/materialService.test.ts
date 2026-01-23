import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaterialService } from './materialService';
import { IMaterialRepository, TypeMateriel, MaterialActivity } from '../repositories/IMaterialRepository';
import { TablesUpdate } from '../../../types/supabase';

describe('MaterialService', () => {
    let service: MaterialService;
    let mockRepository: IMaterialRepository;

    beforeEach(() => {
        mockRepository = {
            getAll: vi.fn(),
            getLinkedActivities: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as any;

        service = new MaterialService(mockRepository);
    });

    describe('fetchAll', () => {
        it('should fetch all materials from repository', async () => {
            const mockMaterials: TypeMateriel[] = [
                { id: 'mat1', nom: 'Matériel A', acronyme: 'MA', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'mat2', nom: 'Matériel B', acronyme: 'MB', user_id: 'user1', created_at: '2024-01-01' }
            ];

            vi.mocked(mockRepository.getAll).mockResolvedValue(mockMaterials);

            const result = await service.fetchAll();

            expect(result).toEqual(mockMaterials);
            expect(mockRepository.getAll).toHaveBeenCalledOnce();
        });
    });

    describe('fetchLinkedActivities', () => {
        it('should fetch and sort linked activities alphabetically', async () => {
            const mockActivities: MaterialActivity[] = [
                {
                    id: 'act2',
                    titre: 'Zebra Activity',
                    Module: { nom: 'Module 1' },
                    ActiviteMateriel: []
                },
                {
                    id: 'act1',
                    titre: 'Alpha Activity',
                    Module: { nom: 'Module 2' },
                    ActiviteMateriel: []
                }
            ];

            vi.mocked(mockRepository.getLinkedActivities).mockResolvedValue(mockActivities);

            const result = await service.fetchLinkedActivities('mat1');

            expect(result).toHaveLength(2);
            expect(result[0].titre).toBe('Alpha Activity');
            expect(result[1].titre).toBe('Zebra Activity');
            expect(mockRepository.getLinkedActivities).toHaveBeenCalledWith('mat1');
        });

        it('should handle activities with null titles', async () => {
            const mockActivities: MaterialActivity[] = [
                {
                    id: 'act1',
                    titre: 'Activity B',
                    Module: null,
                    ActiviteMateriel: []
                },
                {
                    id: 'act2',
                    titre: '',
                    Module: null,
                    ActiviteMateriel: []
                }
            ];

            vi.mocked(mockRepository.getLinkedActivities).mockResolvedValue(mockActivities);

            const result = await service.fetchLinkedActivities('mat1');

            expect(result).toHaveLength(2);
            // Empty string should come before 'Activity B'
            expect(result[0].titre).toBe('');
            expect(result[1].titre).toBe('Activity B');
        });
    });

    describe('create', () => {
        it('should create a material with user_id and trimmed name', async () => {
            const materialData = { nom: 'New Material', acronyme: 'NM' };
            const mockCreated: TypeMateriel = {
                id: 'mat1',
                nom: 'New Material',
                acronyme: 'NM',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.create).mockResolvedValue(mockCreated);

            const result = await service.create(materialData, 'user1');

            expect(result).toEqual(mockCreated);
            expect(mockRepository.create).toHaveBeenCalledWith({
                nom: 'New Material',
                acronyme: 'NM',
                user_id: 'user1'
            });
        });

        it('should trim whitespace from material name', async () => {
            const materialData = { nom: '  New Material  ', acronyme: 'NM' };
            const mockCreated: TypeMateriel = {
                id: 'mat1',
                nom: 'New Material',
                acronyme: 'NM',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.create).mockResolvedValue(mockCreated);

            await service.create(materialData, 'user1');

            expect(mockRepository.create).toHaveBeenCalledWith({
                nom: 'New Material',
                acronyme: 'NM',
                user_id: 'user1'
            });
        });

        it('should throw error if name is empty', async () => {
            await expect(service.create({ nom: '' }, 'user1')).rejects.toThrow(
                'Le nom du matériel est requis'
            );
            await expect(service.create({ nom: '   ' }, 'user1')).rejects.toThrow(
                'Le nom du matériel est requis'
            );
        });
    });

    describe('update', () => {
        it('should update a material', async () => {
            const updates: TablesUpdate<'TypeMateriel'> = { nom: 'Updated Material' };
            const mockUpdated: TypeMateriel = {
                id: 'mat1',
                nom: 'Updated Material',
                acronyme: 'UM',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated);

            const result = await service.update('mat1', updates);

            expect(result).toEqual(mockUpdated);
            expect(mockRepository.update).toHaveBeenCalledWith('mat1', { nom: 'Updated Material' });
        });

        it('should trim whitespace from name when updating', async () => {
            const updates: TablesUpdate<'TypeMateriel'> = { nom: '  Updated Material  ' };
            const mockUpdated: TypeMateriel = {
                id: 'mat1',
                nom: 'Updated Material',
                acronyme: 'UM',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated);

            await service.update('mat1', updates);

            expect(mockRepository.update).toHaveBeenCalledWith('mat1', { nom: 'Updated Material' });
        });

        it('should throw error if name is empty when updating', async () => {
            await expect(service.update('mat1', { nom: '' })).rejects.toThrow(
                'Le nom du matériel est requis'
            );
        });

        it('should allow updating other fields without name', async () => {
            const updates: TablesUpdate<'TypeMateriel'> = { acronyme: 'NEW' };
            const mockUpdated: TypeMateriel = {
                id: 'mat1',
                nom: 'Material',
                acronyme: 'NEW',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated);

            const result = await service.update('mat1', updates);

            expect(result).toEqual(mockUpdated);
            expect(mockRepository.update).toHaveBeenCalledWith('mat1', { acronyme: 'NEW' });
        });
    });

    describe('delete', () => {
        it('should delete a material and return true', async () => {
            vi.mocked(mockRepository.delete).mockResolvedValue();

            const result = await service.delete('mat1');

            expect(result).toBe(true);
            expect(mockRepository.delete).toHaveBeenCalledWith('mat1');
        });
    });
});
