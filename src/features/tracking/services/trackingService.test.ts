import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingService } from './trackingService';
import { ITrackingRepository, ProgressionWithDetails, StudentBasicInfo } from '../repositories/ITrackingRepository';
import { TablesInsert } from '../../../types/supabase';

describe('TrackingService', () => {
    let service: TrackingService;
    let mockRepository: ITrackingRepository;

    beforeEach(() => {
        mockRepository = {
            fetchProgressions: vi.fn(),
            updateProgressionStatus: vi.fn(),
            deleteProgression: vi.fn(),
            createProgressions: vi.fn(),
            findStudentsByActivityStatus: vi.fn(),
            getGroupInfo: vi.fn(),
            getStudentsInGroup: vi.fn(),
            saveUserPreference: vi.fn(),
            loadUserPreference: vi.fn(),
        } as any;

        service = new TrackingService(mockRepository);
    });

    // ==================== HELP REQUESTS ====================

    describe('fetchHelpRequests', () => {
        it('should fetch and filter help requests', async () => {
            const mockProgressions: ProgressionWithDetails[] = [
                {
                    id: 'prog1',
                    eleve_id: 'student1',
                    activite_id: 'act1',
                    etat: 'besoin_d_aide',
                    is_suivi: false,
                    user_id: 'user1',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                    nombre_exercices: 0,
                    nombre_erreurs: 0,
                    eleve: { id: 'student1', prenom: 'Jean', nom: 'Dupont' },
                    activite: {
                        id: 'act1',
                        titre: 'Activity 1',
                        user_id: 'user1',
                        created_at: '2024-01-01',
                        module_id: 'mod1',
                        photo_url: null,
                        Module: {
                            id: 'mod1',
                            nom: 'Module 1',
                            statut: 'en_cours',
                            user_id: 'user1',
                            created_at: '2024-01-01',
                            sous_branche_id: 'sb1',
                            date_fin: null,
                            branche_id: null,
                            SousBranche: { branche_id: 'branch1' }
                        }
                    }
                }
            ];

            vi.mocked(mockRepository.fetchProgressions).mockResolvedValue(mockProgressions);

            const result = await service.fetchHelpRequests(['student1']);

            expect(result).toEqual(mockProgressions);
            expect(mockRepository.fetchProgressions).toHaveBeenCalledWith(
                ['student1'],
                ['besoin_d_aide', 'a_verifier', 'ajustement']
            );
        });

        it('should include progressions marked as is_suivi regardless of module status', async () => {
            const mockProgressions: ProgressionWithDetails[] = [
                {
                    id: 'prog1',
                    eleve_id: 'student1',
                    activite_id: 'act1',
                    etat: 'besoin_d_aide',
                    is_suivi: true, // Marked for tracking
                    user_id: 'user1',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                    nombre_exercices: 0,
                    nombre_erreurs: 0,
                    eleve: { id: 'student1', prenom: 'Jean', nom: 'Dupont' },
                    activite: {
                        id: 'act1',
                        titre: 'Activity 1',
                        user_id: 'user1',
                        created_at: '2024-01-01',
                        module_id: 'mod1',
                        photo_url: null,
                        Module: {
                            id: 'mod1',
                            nom: 'Module 1',
                            statut: 'termine', // Module finished
                            user_id: 'user1',
                            created_at: '2024-01-01',
                            sous_branche_id: 'sb1',
                            date_fin: null,
                            branche_id: null,
                            SousBranche: { branche_id: 'branch1' }
                        }
                    }
                }
            ];

            vi.mocked(mockRepository.fetchProgressions).mockResolvedValue(mockProgressions);

            const result = await service.fetchHelpRequests(['student1']);

            expect(result).toHaveLength(1);
            expect(result[0].is_suivi).toBe(true);
        });

        it('should filter out progressions with inactive modules', async () => {
            const mockProgressions: ProgressionWithDetails[] = [
                {
                    id: 'prog1',
                    eleve_id: 'student1',
                    activite_id: 'act1',
                    etat: 'besoin_d_aide',
                    is_suivi: false,
                    user_id: 'user1',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                    nombre_exercices: 0,
                    nombre_erreurs: 0,
                    eleve: { id: 'student1', prenom: 'Jean', nom: 'Dupont' },
                    activite: {
                        id: 'act1',
                        titre: 'Activity 1',
                        user_id: 'user1',
                        created_at: '2024-01-01',
                        module_id: 'mod1',
                        photo_url: null,
                        Module: {
                            id: 'mod1',
                            nom: 'Module 1',
                            statut: 'termine', // Inactive module
                            user_id: 'user1',
                            created_at: '2024-01-01',
                            sous_branche_id: 'sb1',
                            date_fin: null,
                            branche_id: null,
                            SousBranche: { branche_id: 'branch1' }
                        }
                    }
                }
            ];

            vi.mocked(mockRepository.fetchProgressions).mockResolvedValue(mockProgressions);

            const result = await service.fetchHelpRequests(['student1']);

            expect(result).toHaveLength(0);
        });
    });

    // ==================== HELPERS ====================

    describe('findHelpers', () => {
        it('should find students who finished an activity', async () => {
            const mockHelpers: StudentBasicInfo[] = [
                { id: 'student2', prenom: 'Marie', nom: 'Martin' },
                { id: 'student3', prenom: 'Paul', nom: 'Durand' }
            ];

            vi.mocked(mockRepository.findStudentsByActivityStatus).mockResolvedValue(mockHelpers);

            const result = await service.findHelpers('act1', ['student1', 'student2', 'student3']);

            expect(result).toEqual(mockHelpers);
            expect(mockRepository.findStudentsByActivityStatus).toHaveBeenCalledWith(
                'act1',
                ['student1', 'student2', 'student3'],
                'termine'
            );
        });
    });

    // ==================== PROGRESSION MANAGEMENT ====================

    describe('updateProgressionStatus', () => {
        it('should update progression status', async () => {
            vi.mocked(mockRepository.updateProgressionStatus).mockResolvedValue();

            const result = await service.updateProgressionStatus('prog1', 'termine', false);

            expect(result).toBe(true);
            expect(mockRepository.updateProgressionStatus).toHaveBeenCalledWith('prog1', 'termine', false);
        });

        it('should handle is_suivi flag', async () => {
            vi.mocked(mockRepository.updateProgressionStatus).mockResolvedValue();

            await service.updateProgressionStatus('prog1', 'termine', true);

            expect(mockRepository.updateProgressionStatus).toHaveBeenCalledWith('prog1', 'termine', true);
        });
    });

    describe('deleteProgression', () => {
        it('should delete a progression', async () => {
            vi.mocked(mockRepository.deleteProgression).mockResolvedValue();

            const result = await service.deleteProgression('prog1');

            expect(result).toBe(true);
            expect(mockRepository.deleteProgression).toHaveBeenCalledWith('prog1');
        });
    });

    describe('createProgressions', () => {
        it('should create multiple progressions', async () => {
            const mockProgressions: TablesInsert<'Progression'>[] = [
                {
                    eleve_id: 'student1',
                    activite_id: 'act1',
                    etat: 'en_cours',
                    user_id: 'user1'
                }
            ];

            vi.mocked(mockRepository.createProgressions).mockResolvedValue();

            const result = await service.createProgressions(mockProgressions);

            expect(result).toBe(true);
            expect(mockRepository.createProgressions).toHaveBeenCalledWith(mockProgressions);
        });

        it('should throw error if progressions array is empty', async () => {
            await expect(service.createProgressions([])).rejects.toThrow(
                'Au moins une progression doit être fournie'
            );

            expect(mockRepository.createProgressions).not.toHaveBeenCalled();
        });
    });

    // ==================== GROUPS ====================

    describe('fetchGroupInfo', () => {
        it('should fetch group information', async () => {
            const mockGroupInfo = { nom: 'Groupe A' };
            vi.mocked(mockRepository.getGroupInfo).mockResolvedValue(mockGroupInfo);

            const result = await service.fetchGroupInfo('group1');

            expect(result).toEqual(mockGroupInfo);
            expect(mockRepository.getGroupInfo).toHaveBeenCalledWith('group1');
        });
    });

    describe('fetchStudentsInGroup', () => {
        it('should fetch students in a group', async () => {
            const mockData = {
                ids: ['student1', 'student2'],
                full: [
                    { id: 'student1', nom: 'Dupont', prenom: 'Jean', user_id: 'user1', created_at: '2024-01-01', classe_id: null, niveau_id: null, photo_url: null },
                    { id: 'student2', nom: 'Martin', prenom: 'Marie', user_id: 'user1', created_at: '2024-01-01', classe_id: null, niveau_id: null, photo_url: null }
                ]
            };

            vi.mocked(mockRepository.getStudentsInGroup).mockResolvedValue(mockData);

            const result = await service.fetchStudentsInGroup('group1');

            expect(result).toEqual(mockData);
            expect(mockRepository.getStudentsInGroup).toHaveBeenCalledWith('group1');
        });
    });

    // ==================== USER PREFERENCES ====================

    describe('saveUserPreference', () => {
        it('should save user preference', async () => {
            vi.mocked(mockRepository.saveUserPreference).mockResolvedValue();

            await service.saveUserPreference('user1', 'test_key', { value: 'test' });

            expect(mockRepository.saveUserPreference).toHaveBeenCalledWith('user1', 'test_key', { value: 'test' });
        });
    });

    describe('loadUserPreference', () => {
        it('should load user preference', async () => {
            const mockValue = { selectedIndex: 5 };
            vi.mocked(mockRepository.loadUserPreference).mockResolvedValue(mockValue);

            const result = await service.loadUserPreference('user1', 'test_key');

            expect(result).toEqual(mockValue);
            expect(mockRepository.loadUserPreference).toHaveBeenCalledWith('user1', 'test_key');
        });

        it('should return null if preference not found', async () => {
            vi.mocked(mockRepository.loadUserPreference).mockResolvedValue(null);

            const result = await service.loadUserPreference('user1', 'nonexistent_key');

            expect(result).toBeNull();
        });
    });
});
