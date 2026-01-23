import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityTypeService } from './activityTypeService';
import { IActivityTypeRepository, ActivityType } from '../repositories/IActivityTypeRepository';

describe('ActivityTypeService', () => {
    let service: ActivityTypeService;
    let mockRepository: IActivityTypeRepository;

    beforeEach(() => {
        mockRepository = {
            getAll: vi.fn(),
            create: vi.fn(),
            bulkCreate: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as any;

        service = new ActivityTypeService(mockRepository);
    });

    describe('fetchAll', () => {
        it('should fetch all activity types from repository', async () => {
            const mockTypes: ActivityType[] = [
                { id: 'type1', label: 'Observation', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'type2', label: 'Présentation', user_id: 'user1', created_at: '2024-01-01' }
            ];

            vi.mocked(mockRepository.getAll).mockResolvedValue(mockTypes);

            const result = await service.fetchAll();

            expect(result).toEqual(mockTypes);
            expect(mockRepository.getAll).toHaveBeenCalledOnce();
        });
    });

    describe('seedDefaults', () => {
        it('should return existing types if any exist', async () => {
            const existingTypes: ActivityType[] = [
                { id: 'type1', label: 'Existing', user_id: 'user1', created_at: '2024-01-01' }
            ];

            vi.mocked(mockRepository.getAll).mockResolvedValue(existingTypes);

            const result = await service.seedDefaults('user1');

            expect(result).toEqual(existingTypes);
            expect(mockRepository.bulkCreate).not.toHaveBeenCalled();
        });

        it('should create default types if none exist', async () => {
            const defaultTypes: ActivityType[] = [
                { id: 'type1', label: 'Observation de la classe', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'type2', label: 'Présentation', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'type3', label: 'Accompagnement individualisé', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'type4', label: 'Entretien famille', user_id: 'user1', created_at: '2024-01-01' },
                { id: 'type5', label: 'Autre', user_id: 'user1', created_at: '2024-01-01' }
            ];

            vi.mocked(mockRepository.getAll).mockResolvedValue([]);
            vi.mocked(mockRepository.bulkCreate).mockResolvedValue(defaultTypes);

            const result = await service.seedDefaults('user1');

            expect(result).toEqual(defaultTypes);
            expect(mockRepository.bulkCreate).toHaveBeenCalledWith(
                [
                    "Observation de la classe",
                    "Présentation",
                    "Accompagnement individualisé",
                    "Entretien famille",
                    "Autre"
                ],
                'user1'
            );
        });
    });

    describe('create', () => {
        it('should create an activity type with valid label', async () => {
            const mockType: ActivityType = {
                id: 'type1',
                label: 'New Type',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.create).mockResolvedValue(mockType);

            const result = await service.create('New Type', 'user1');

            expect(result).toEqual(mockType);
            expect(mockRepository.create).toHaveBeenCalledWith('New Type', 'user1');
        });

        it('should trim whitespace from label', async () => {
            const mockType: ActivityType = {
                id: 'type1',
                label: 'New Type',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.create).mockResolvedValue(mockType);

            await service.create('  New Type  ', 'user1');

            expect(mockRepository.create).toHaveBeenCalledWith('New Type', 'user1');
        });

        it('should throw error if label is empty', async () => {
            await expect(service.create('', 'user1')).rejects.toThrow(
                'Le libellé du type d\'activité est requis'
            );
            await expect(service.create('   ', 'user1')).rejects.toThrow(
                'Le libellé du type d\'activité est requis'
            );
        });
    });

    describe('update', () => {
        it('should update an activity type with valid label', async () => {
            const mockType: ActivityType = {
                id: 'type1',
                label: 'Updated Type',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.update).mockResolvedValue(mockType);

            const result = await service.update('type1', 'Updated Type');

            expect(result).toEqual(mockType);
            expect(mockRepository.update).toHaveBeenCalledWith('type1', 'Updated Type');
        });

        it('should trim whitespace from label', async () => {
            const mockType: ActivityType = {
                id: 'type1',
                label: 'Updated Type',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.update).mockResolvedValue(mockType);

            await service.update('type1', '  Updated Type  ');

            expect(mockRepository.update).toHaveBeenCalledWith('type1', 'Updated Type');
        });

        it('should throw error if label is empty', async () => {
            await expect(service.update('type1', '')).rejects.toThrow(
                'Le libellé du type d\'activité est requis'
            );
        });
    });

    describe('delete', () => {
        it('should delete an activity type', async () => {
            vi.mocked(mockRepository.delete).mockResolvedValue();

            await service.delete('type1');

            expect(mockRepository.delete).toHaveBeenCalledWith('type1');
        });
    });
});
