import { vi } from 'vitest';

/**
 * Create a mock Supabase response
 */
export const createMockSupabaseResponse = (data, error = null) => {
    return {
        data,
        error,
        status: error ? 400 : 200,
        statusText: error ? 'Bad Request' : 'OK',
    };
};

/**
 * Create a mock Supabase query builder
 */
export const createMockQueryBuilder = (mockData, mockError = null) => {
    const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        upsert: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        gt: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        lt: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        like: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        is: vi.fn(() => builder),
        in: vi.fn(() => builder),
        contains: vi.fn(() => builder),
        containedBy: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        range: vi.fn(() => builder),
        single: vi.fn(() => Promise.resolve(createMockSupabaseResponse(mockData, mockError))),
        maybeSingle: vi.fn(() => Promise.resolve(createMockSupabaseResponse(mockData, mockError))),
        then: vi.fn((resolve) => resolve(createMockSupabaseResponse(mockData, mockError))),
    };
    return builder;
};

/**
 * Create a mock Supabase client
 */
export const createMockSupabase = (overrides = {}) => {
    return {
        from: vi.fn((table) => overrides[table] || createMockQueryBuilder([])),
        auth: {
            getUser: vi.fn(() =>
                Promise.resolve({
                    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
                    error: null,
                })
            ),
            ...overrides.auth,
        },
    };
};

/**
 * Wait for async operations to complete
 */
export const waitFor = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
