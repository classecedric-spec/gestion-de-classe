import { supabase } from './supabaseClient';
import type { Database } from '../types/supabase';

export type TableName = keyof Database['public']['Tables'];
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * FilterBuilder type that is compatible with Supabase's PostgrestFilterBuilder
 * We use 'any' for the schema mapping to avoid complex internal type mismatches
 * while maintaining the ability to use the builder in our utility functions.
 */
export type FilterBuilder<_T extends TableName> = any;

export interface FetchOptions {
    select?: string;
    filters?: [string, string, any][]; // simplified operator typing
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    single?: boolean;
}

/**
 * Generic fetch with error handling
 */
export async function fetchWithErrorHandling<T>(
    promise: Promise<{ data: T | null; error: any }>
): Promise<T> {
    const { data, error } = await promise;
    if (error) {
        console.error('Database error:', error);
        throw error;
    }
    return data as T;
}

/**
 * Generic table data fetching
 */
export async function fetchTableData<T extends TableName>(
    table: T,
    options: FetchOptions = {}
): Promise<Row<T>[]> {
    let query = (supabase.from(table as any) as any).select(options.select || '*');

    if (options.filters) {
        options.filters.forEach(([column, operator, value]) => {
            if (operator in query) {
                (query as any)[operator](column, value);
            }
        });
    }

    if (options.orderBy) {
        query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? true,
        });
    }

    if (options.limit) {
        query = query.limit(options.limit);
    }

    return fetchWithErrorHandling<Row<T>[]>(query as any);
}

/**
 * Generic data insertion
 */
export async function insertData<T extends TableName>(
    table: T,
    data: Insert<T>
): Promise<Row<T>> {
    const promise = (supabase.from(table as any) as any).insert(data as any).select().single();
    return fetchWithErrorHandling<Row<T>>(promise as any);
}

/**
 * Generic data update
 */
export async function updateData<T extends TableName>(
    table: T,
    id: string | number,
    updates: Update<T>
): Promise<Row<T>> {
    const promise = (supabase.from(table as any) as any)
        .update(updates as any)
        .eq('id', id as any)
        .select()
        .single();
    return fetchWithErrorHandling<Row<T>>(promise as any);
}

/**
 * Generic data deletion
 */
export async function deleteData<T extends TableName>(
    table: T,
    id: string | number
): Promise<void> {
    const { error } = await (supabase.from(table as any) as any).delete().eq('id', id as any);
    if (error) throw error;
}
