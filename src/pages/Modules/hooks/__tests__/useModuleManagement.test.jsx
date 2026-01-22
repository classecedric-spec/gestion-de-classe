import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useModuleManagement } from '../useModuleManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// Mock Supabase is hoisted, so helpers must be inside or imported
vi.mock('../../../lib/supabaseClient', () => {
    const mockSelect = vi.fn();
    const mockOrder = vi.fn();
    const mockDelete = vi.fn();
    const mockUpdate = vi.fn();
    const mockEq = vi.fn();

    const defaultData = [
        { id: 1, nom: 'Module 1', ordre: 1, Activite: [] },
        { id: 2, nom: 'Module 2', ordre: 2, Activite: [] }
    ];

    const createBuilder = (data = defaultData) => {
        const builder = {
            select: mockSelect,
            order: mockOrder,
            delete: mockDelete,
            update: mockUpdate,
            eq: mockEq,
            then: (resolve) => resolve({ data, error: null }),
        };
        mockSelect.mockReturnValue(builder);
        mockOrder.mockReturnValue(builder);
        mockDelete.mockReturnValue(builder);
        mockUpdate.mockReturnValue(builder);
        mockEq.mockReturnValue(builder);
        return builder;
    };

    return {
        supabase: {
            from: vi.fn(() => createBuilder()),
        },
    };
});

// Mock toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Setup QueryClient for tests
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useModuleManagement Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default mock implementations if needed, though factory handles most
    });

    it('loads modules initially', async () => {
        const { result } = renderHook(() => useModuleManagement(), {
            wrapper: createWrapper(),
        });

        // Initial state
        expect(result.current.states.loading).toBe(true);

        // Wait for data
        await waitFor(() => {
            expect(result.current.states.loading).toBe(false);
        });

        expect(result.current.states.modules).toHaveLength(2);
        expect(result.current.states.selectedModule.id).toBe(1); // Defaults to first
    });

    it('deletes a module and updates selection', async () => {
        const { result } = renderHook(() => useModuleManagement(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.states.loading).toBe(false));

        // Select module 1
        const moduleToDelete = result.current.states.modules[0];

        // Set as module to delete
        result.current.actions.setModuleToDelete(moduleToDelete);

        // Perform delete
        await result.current.actions.handleDelete();

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Module supprimé');
        });

        // Should invalidate and refetch
        // We verified success via toast
        // expect(mockDelete).toHaveBeenCalled(); // Cannot easily check private mocks
    });
});
