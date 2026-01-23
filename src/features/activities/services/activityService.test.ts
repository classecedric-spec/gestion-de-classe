import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityService } from './activityService';
import { IActivityRepository } from '../repositories/IActivityRepository';
import { storageService } from '../../../lib/storage';

// Mock storageService
vi.mock('../../../lib/storageService', () => ({
    storageService: {
        uploadImage: vi.fn()
    }
}));

const mockRepository = {
    getModule: vi.fn(),
    getMaterialTypes: vi.fn(),
    getActivityMaterials: vi.fn(),
    createMaterialType: vi.fn(),
    updateMaterialType: vi.fn(),
    deleteMaterialType: vi.fn(),
    getLevels: vi.fn(),
    getActivityLevels: vi.fn(),
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
    getActivities: vi.fn(),
    clearActivityMaterials: vi.fn(),
    addActivityMaterials: vi.fn(),
    clearActivityLevels: vi.fn(),
    addActivityLevels: vi.fn(),
    updateActivityField: vi.fn(),
    updateActivityLevelField: vi.fn()
} as unknown as IActivityRepository;

describe('ActivityService', () => {
    let activityService: ActivityService;

    beforeEach(() => {
        vi.clearAllMocks();
        activityService = new ActivityService(mockRepository);
    });

    describe('getModule', () => {
        it('should return module details', async () => {
            const moduleData = { titre: 'Math' };
            (mockRepository.getModule as any).mockResolvedValue(moduleData);

            const result = await activityService.getModule('1');
            expect(result).toEqual(moduleData);
            expect(mockRepository.getModule).toHaveBeenCalledWith('1');
        });
    });

    describe('saveActivity', () => {
        const activityData = {
            titre: 'Activity 1',
            module_id: '123e4567-e89b-12d3-a456-426614174000',
            user_id: 'user1',
            type: 'fiche',
            photo_base64: 'data:image/png;base64,abc'
        };
        const materialIds = ['mat1', 'mat2'];
        const levels = [
            { niveau_id: 'niv1', nombre_exercices: 5, nombre_erreurs: 1, statut_exigence: 'active' }
        ];

        it('should create activity, upload photo, and save relations', async () => {
            const createdActivity = { id: 'act1', ...activityData };
            (mockRepository.createActivity as any).mockResolvedValue(createdActivity);
            (storageService.uploadImage as any).mockResolvedValue({ publicUrl: 'http://url.com/img.png' });

            const result = await activityService.saveActivity(activityData as any, materialIds, levels as any, false);

            expect(mockRepository.createActivity).toHaveBeenCalled();
            expect(storageService.uploadImage).toHaveBeenCalled();
            // Expect updateActivity called for photo_url update
            expect(mockRepository.updateActivity).toHaveBeenCalledWith('act1', expect.objectContaining({ photo_url: 'http://url.com/img.png' }));

            // Relations
            expect(mockRepository.clearActivityMaterials).toHaveBeenCalledWith('act1');
            expect(mockRepository.addActivityMaterials).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ activite_id: 'act1', type_materiel_id: 'mat1' })
            ]));

            expect(mockRepository.clearActivityLevels).toHaveBeenCalledWith('act1');
            expect(mockRepository.addActivityLevels).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ activite_id: 'act1', niveau_id: 'niv1' })
            ]));

            expect(result).toBe('act1');
        });

        it('should update activity if isEdit is true', async () => {
            const updateData = { id: 'act1', titre: 'Updated', user_id: 'user1' };

            await activityService.saveActivity(updateData as any, [], [], true);

            expect(mockRepository.updateActivity).toHaveBeenCalledWith('act1', expect.objectContaining({ titre: 'Updated' }));
            expect(mockRepository.createActivity).not.toHaveBeenCalled();

            // Even with empty list, clear should be called
            expect(mockRepository.clearActivityMaterials).toHaveBeenCalledWith('act1');
            expect(mockRepository.clearActivityLevels).toHaveBeenCalledWith('act1');
        });
    });

    describe('fetchActivities', () => {
        it('should return activities', async () => {
            const activities = [{ id: 'act1', titre: 'A1' }];
            (mockRepository.getActivities as any).mockResolvedValue(activities);

            const result = await activityService.fetchActivities();
            expect(result).toEqual(activities);
            expect(mockRepository.getActivities).toHaveBeenCalled();
        });
    });

    describe('deleteActivity', () => {
        it('should delete activity', async () => {
            await activityService.deleteActivity('act1');
            expect(mockRepository.deleteActivity).toHaveBeenCalledWith('act1');
        });
    });
});
