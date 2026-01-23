import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from './attendanceService';
import { IAttendanceRepository } from '../repositories/IAttendanceRepository';
import type { Group, Student, SetupPresence, Attendance } from '../repositories/IAttendanceRepository';

describe('AttendanceService', () => {
    let service: AttendanceService;
    let mockRepository: IAttendanceRepository;

    beforeEach(() => {
        mockRepository = {
            getGroups: vi.fn(),
            getUserPreferences: vi.fn(),
            saveGroupPreference: vi.fn(),
            getStudentsByGroup: vi.fn(),
            getSetups: vi.fn(),
            getCategories: vi.fn(),
            createSetup: vi.fn(),
            updateSetup: vi.fn(),
            deleteSetup: vi.fn(),
            upsertCategories: vi.fn(),
            deleteCategory: vi.fn(),
            ensureAbsentCategory: vi.fn(),
            getAttendances: vi.fn(),
            checkExistingSetup: vi.fn(),
            upsertAttendance: vi.fn(),
            deleteAttendance: vi.fn(),
            bulkInsertAttendances: vi.fn(),
            getDistinctDates: vi.fn(),
            getAttendanceRange: vi.fn(),
            copyPeriodData: vi.fn(),
        } as any;

        service = new AttendanceService(mockRepository);
    });

    // ==================== GROUPS ====================

    describe('fetchGroups', () => {
        it('should fetch all groups from repository', async () => {
            const mockGroups: Group[] = [
                { id: '1', nom: 'Groupe A', user_id: 'user1', created_at: '2024-01-01' },
                { id: '2', nom: 'Groupe B', user_id: 'user1', created_at: '2024-01-01' }
            ];

            vi.mocked(mockRepository.getGroups).mockResolvedValue(mockGroups);

            const result = await service.fetchGroups();

            expect(result).toEqual(mockGroups);
            expect(mockRepository.getGroups).toHaveBeenCalledOnce();
        });

        it('should handle errors from repository', async () => {
            const error = new Error('Database error');
            vi.mocked(mockRepository.getGroups).mockRejectedValue(error);

            await expect(service.fetchGroups()).rejects.toThrow('Database error');
        });
    });

    describe('getUserPreferences', () => {
        it('should get user preferences for a specific key', async () => {
            const mockValue = { selectedGroupId: 'group-123' };
            vi.mocked(mockRepository.getUserPreferences).mockResolvedValue(mockValue);

            const result = await service.getUserPreferences('user1', 'presence_last_group_id');

            expect(result).toEqual(mockValue);
            expect(mockRepository.getUserPreferences).toHaveBeenCalledWith('user1', 'presence_last_group_id');
        });
    });

    describe('saveGroupPreference', () => {
        it('should save group preference', async () => {
            vi.mocked(mockRepository.saveGroupPreference).mockResolvedValue();

            await service.saveGroupPreference('user1', 'group-123');

            expect(mockRepository.saveGroupPreference).toHaveBeenCalledWith('user1', 'group-123');
        });
    });

    // ==================== STUDENTS ====================

    describe('fetchStudentsByGroup', () => {
        it('should fetch students with class and level info', async () => {
            const mockStudents: Student[] = [
                {
                    id: 'student1',
                    nom: 'Dupont',
                    prenom: 'Jean',
                    user_id: 'user1',
                    created_at: '2024-01-01',
                    classe_id: 'class1',
                    niveau_id: 'level1',
                    photo_url: null,
                    Classe: { nom: 'CP' },
                    Niveau: { nom: 'Niveau 1', ordre: 1 }
                }
            ];

            vi.mocked(mockRepository.getStudentsByGroup).mockResolvedValue(mockStudents);

            const result = await service.fetchStudentsByGroup('group1');

            expect(result).toEqual(mockStudents);
            expect(mockRepository.getStudentsByGroup).toHaveBeenCalledWith('group1');
        });
    });

    // ==================== SETUPS & CATEGORIES ====================

    describe('createSetup', () => {
        it('should create a setup with valid name', async () => {
            const mockSetup: SetupPresence = {
                id: 'setup1',
                nom: 'Setup Test',
                description: 'Description',
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.createSetup).mockResolvedValue(mockSetup);

            const result = await service.createSetup('user1', 'Setup Test', 'Description');

            expect(result).toEqual(mockSetup);
            expect(mockRepository.createSetup).toHaveBeenCalledWith('user1', 'Setup Test', 'Description');
        });

        it('should trim whitespace from setup name', async () => {
            const mockSetup: SetupPresence = {
                id: 'setup1',
                nom: 'Setup Test',
                description: null,
                user_id: 'user1',
                created_at: '2024-01-01'
            };

            vi.mocked(mockRepository.createSetup).mockResolvedValue(mockSetup);

            await service.createSetup('user1', '  Setup Test  ', null);

            expect(mockRepository.createSetup).toHaveBeenCalledWith('user1', 'Setup Test', null);
        });

        it('should throw error if name is empty', async () => {
            await expect(service.createSetup('user1', '', null)).rejects.toThrow('Le nom du setup est requis');
            await expect(service.createSetup('user1', '   ', null)).rejects.toThrow('Le nom du setup est requis');
        });
    });

    describe('updateSetup', () => {
        it('should update setup with valid name', async () => {
            vi.mocked(mockRepository.updateSetup).mockResolvedValue();

            await service.updateSetup('setup1', 'Updated Name', 'New description');

            expect(mockRepository.updateSetup).toHaveBeenCalledWith('setup1', 'Updated Name', 'New description');
        });

        it('should throw error if name is empty', async () => {
            await expect(service.updateSetup('setup1', '', null)).rejects.toThrow('Le nom du setup est requis');
        });
    });

    // ==================== ATTENDANCE ====================

    describe('fetchAttendances', () => {
        it('should fetch attendance records', async () => {
            const mockAttendances: Attendance[] = [
                {
                    id: 'att1',
                    eleve_id: 'student1',
                    date: '2024-01-15',
                    periode: 'matin',
                    setup_id: 'setup1',
                    categorie_id: 'cat1',
                    status: 'present',
                    user_id: 'user1',
                    created_at: '2024-01-15'
                }
            ];

            vi.mocked(mockRepository.getAttendances).mockResolvedValue(mockAttendances);

            const result = await service.fetchAttendances('2024-01-15', 'matin', ['student1'], 'setup1');

            expect(result).toEqual(mockAttendances);
            expect(mockRepository.getAttendances).toHaveBeenCalledWith('2024-01-15', 'matin', ['student1'], 'setup1');
        });
    });

    describe('copyPeriodData', () => {
        it('should throw error if periods are the same', async () => {
            await expect(
                service.copyPeriodData('2024-01-01', 'setup1', 'matin', 'matin', 'user1')
            ).rejects.toThrow('Les périodes source et destination doivent être différentes');

            expect(mockRepository.copyPeriodData).not.toHaveBeenCalled();
        });

        it('should call repository with correct parameters for different periods', async () => {
            vi.mocked(mockRepository.copyPeriodData).mockResolvedValue();

            await service.copyPeriodData('2024-01-01', 'setup1', 'matin', 'soir', 'user1');

            expect(mockRepository.copyPeriodData).toHaveBeenCalledWith(
                '2024-01-01', 'setup1', 'matin', 'soir', 'user1'
            );
        });
    });

    describe('upsertAttendance', () => {
        it('should upsert attendance record', async () => {
            const mockRecord: Attendance = {
                id: 'att1',
                eleve_id: 'student1',
                date: '2024-01-15',
                periode: 'matin',
                setup_id: 'setup1',
                categorie_id: 'cat1',
                status: 'present',
                user_id: 'user1',
                created_at: '2024-01-15'
            };

            vi.mocked(mockRepository.upsertAttendance).mockResolvedValue(mockRecord);

            const result = await service.upsertAttendance({
                eleve_id: 'student1',
                date: '2024-01-15',
                periode: 'matin',
                setup_id: 'setup1',
                categorie_id: 'cat1',
                status: 'present',
                user_id: 'user1'
            });

            expect(result).toEqual(mockRecord);
            expect(mockRepository.upsertAttendance).toHaveBeenCalled();
        });
    });

    // ==================== REPORTING ====================

    describe('fetchDistinctDates', () => {
        it('should fetch distinct dates for a setup', async () => {
            const mockDates = ['2024-01-15', '2024-01-14', '2024-01-13'];
            vi.mocked(mockRepository.getDistinctDates).mockResolvedValue(mockDates);

            const result = await service.fetchDistinctDates('setup1');

            expect(result).toEqual(mockDates);
            expect(mockRepository.getDistinctDates).toHaveBeenCalledWith('setup1');
        });
    });

    describe('fetchAttendanceRange', () => {
        it('should fetch attendance records within date range', async () => {
            const mockData = [
                {
                    id: 'att1',
                    eleve_id: 'student1',
                    date: '2024-01-15',
                    periode: 'matin',
                    setup_id: 'setup1',
                    categorie_id: 'cat1',
                    status: 'present',
                    user_id: 'user1',
                    created_at: '2024-01-15',
                    CategoriePresence: { nom: 'Présent' }
                }
            ];

            vi.mocked(mockRepository.getAttendanceRange).mockResolvedValue(mockData);

            const result = await service.fetchAttendanceRange('2024-01-01', '2024-01-31');

            expect(result).toEqual(mockData);
            expect(mockRepository.getAttendanceRange).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
        });
    });
});
