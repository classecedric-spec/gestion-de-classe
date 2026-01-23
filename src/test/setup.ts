import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock Supabase client
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(),
                    single: vi.fn(),
                    order: vi.fn(),
                })),
                order: vi.fn(() => ({
                    eq: vi.fn(),
                })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(),
                    })),
                })),
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(),
                })),
            })),
            upsert: vi.fn(),
        })),
        auth: {
            getUser: vi.fn(() =>
                Promise.resolve({
                    data: {
                        user: { id: 'test-user-id', email: 'test@example.com' },
                    },
                })
            ),
        },
    },
}));

// Mock sonner toasts
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));
