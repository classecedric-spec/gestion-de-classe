/**
 * Database utilities - Centralized exports
 * Handles Supabase client, queries, cleanup, and database setup
 */

export { supabase, getCurrentUser, isAuthenticated } from './supabaseClient';
export * from './supabaseQueries';
export { cleanupOrphanProgressions } from './cleanupUtils';
export { checkDatabaseSetup, SETUP_SQL } from './databaseSetup';
