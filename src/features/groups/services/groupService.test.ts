import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from './groupService';
import { IGroupRepository } from '../repositories/IGroupRepository';
import { Tables } from '../../../types/supabase';

const mockRepository = {
    getGroups: vi.fn(),
    getGroup: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
} as unknown as IGroupRepository;

describe('GroupService', () => {
    let groupService: GroupService;

    beforeEach(() => {
        vi.clearAllMocks();
        groupService = new GroupService(mockRepository);
    });

    describe('getGroups', () => {
        it('should return groups list', async () => {
            const mockGroups = [{ id: 'g1', nom: 'Groupe 1' }] as Tables<'Groupe'>[];
            vi.mocked(mockRepository.getGroups).mockResolvedValue(mockGroups);

            const result = await groupService.getGroups();

            expect(mockRepository.getGroups).toHaveBeenCalled();
            expect(result).toEqual(mockGroups);
        });
    });

    describe('createGroup', () => {
        it('should create group successfully', async () => {
            const newGroup = { id: 'g_new', nom: 'New Group' } as Tables<'Groupe'>;
            vi.mocked(mockRepository.createGroup).mockResolvedValue(newGroup);

            const result = await groupService.createGroup({ nom: 'New Group' } as any);

            expect(mockRepository.createGroup).toHaveBeenCalledWith(expect.objectContaining({ nom: 'New Group' }));
            expect(result).toEqual(newGroup);
        });
    });
});
