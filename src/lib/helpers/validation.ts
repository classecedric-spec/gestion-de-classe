/**
 * Validation Schemas using Zod
 * 
 * This module provides type-safe validation for all entity inputs.
 * Use these schemas in services before saving to the database.
 * 
 * @module validation
 */

import { z } from 'zod';

// =============================================================================
// Common Schemas
// =============================================================================

/** UUID validation */
const uuidSchema = z.string().uuid('ID invalide');

/** Optional UUID */
const optionalUuid = z.string().uuid().optional().nullable();

/** Non-empty string with max length */
const requiredString = (max: number = 255, fieldName: string = 'Ce champ') =>
    z.string()
        .min(1, `${fieldName} est requis`)
        .max(max, `${fieldName} ne peut pas dépasser ${max} caractères`);

/** Optional string with max length */
const optionalString = (max: number = 255) =>
    z.string().max(max).optional().nullable();

/** Email validation */
const emailSchema = z.union([
    z.string().email('Email invalide'),
    z.literal(''),
    z.null(),
    z.undefined()
]);

/** Phone validation (French format) */
const phoneSchema = z.union([
    z.string().regex(/^(\+33|0)[1-9](\d{2}){4}$/, 'Numéro de téléphone invalide'),
    z.literal(''),
    z.null(),
    z.undefined()
]);

/** Date string (YYYY-MM-DD) */
const dateSchema = z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (format: AAAA-MM-JJ)'),
    z.literal(''),
    z.null(),
    z.undefined()
]);

/** Photo URL validation */
const photoUrlSchema = z.union([
    z.string().url('URL de photo invalide'),
    z.literal(''),
    z.null(),
    z.undefined()
]);

// =============================================================================
// Entity Schemas
// =============================================================================

/**
 * Schema for Student (Eleve) creation/update
 */
export const StudentSchema = z.object({
    nom: requiredString(100, 'Le nom'),
    prenom: requiredString(100, 'Le prénom'),
    date_naissance: dateSchema,
    annee_inscription: z.number().int().min(2000).max(2100).optional().nullable(),
    sex: z.union([
        z.enum(['M', 'F', 'Autre']),
        z.literal(''),
        z.null(),
        z.undefined()
    ]).optional(),
    photo_url: photoUrlSchema,

    // Parents
    parent1_nom: optionalString(100),
    parent1_prenom: optionalString(100),
    parent1_email: emailSchema,
    parent1_telephone: phoneSchema,
    parent2_nom: optionalString(100),
    parent2_prenom: optionalString(100),
    parent2_email: emailSchema,
    parent2_telephone: phoneSchema,

    // Foreign Keys
    classe_id: optionalUuid,
    niveau_id: optionalUuid,
    user_id: optionalUuid
});

export type StudentInput = z.infer<typeof StudentSchema>;

/**
 * Schema for Class (Classe) creation/update
 */
export const ClassSchema = z.object({
    nom: requiredString(100, 'Le nom de la classe'),
    acronyme: optionalString(10),
    logo_url: photoUrlSchema
});

export type ClassInput = z.infer<typeof ClassSchema>;

/**
 * Schema for Group (Groupe) creation/update
 */
export const GroupSchema = z.object({
    nom: requiredString(100, 'Le nom du groupe'),
    acronyme: optionalString(10),
    photo_url: photoUrlSchema,
    ordre: z.number().int().min(0).optional(),
    classe_id: optionalUuid
});

export type GroupInput = z.infer<typeof GroupSchema>;

/**
 * Schema for Branch (Branche) creation/update
 */
export const BranchSchema = z.object({
    nom: requiredString(100, 'Le nom de la branche'),
    ordre: z.number().int().min(0).optional(),
    couleur: optionalString(20),
    photo_url: photoUrlSchema
});

export type BranchInput = z.infer<typeof BranchSchema>;

/**
 * Schema for Sub-Branch (SousBranche) creation/update
 */
export const SubBranchSchema = z.object({
    nom: requiredString(100, 'Le nom de la sous-branche'),
    ordre: z.number().int().min(0).optional(),
    photo_url: photoUrlSchema,
    branche_id: uuidSchema
});

export type SubBranchInput = z.infer<typeof SubBranchSchema>;

/**
 * Schema for Module creation/update
 */
export const ModuleSchema = z.object({
    titre: requiredString(200, 'Le titre du module'),
    ordre: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    photo_url: photoUrlSchema,
    sous_branche_id: optionalUuid
});

export type ModuleInput = z.infer<typeof ModuleSchema>;

/**
 * Schema for Activity (Activite) creation/update
 */
export const ActivitySchema = z.object({
    titre: requiredString(200, 'Le titre de l\'activité'),
    description: optionalString(2000),
    ordre: z.number().int().min(0).optional(),
    nombre_exercices: z.number().int().min(1).max(100).optional(),
    nombre_erreurs: z.number().int().min(0).max(100).optional(),
    statut_exigence: z.enum(['non_requis', 'recommande', 'obligatoire']).optional().nullable(),
    photo_url: photoUrlSchema,
    module_id: optionalUuid
});

export type ActivityInput = z.infer<typeof ActivitySchema>;

/**
 * Schema for Adult (Adulte) creation/update
 */
export const AdultSchema = z.object({
    nom: requiredString(100, 'Le nom'),
    prenom: requiredString(100, 'Le prénom'),
    email: emailSchema
});

export type AdultInput = z.infer<typeof AdultSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Result type for validation
 */
export interface ValidationResult<T> {
    success: boolean;
    data: T | null;
    errors: string[];
}

/**
 * Validate data against a schema and return a structured result
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with parsed data or errors
 * 
 * @example
 * ```typescript
 * const result = validateWith(StudentSchema, formData);
 * if (result.success) {
 *   await saveStudent(result.data);
 * } else {
 *   showErrors(result.errors);
 * }
 * ```
 */
export function validateWith<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): ValidationResult<T> {
    try {
        const parsed = schema.parse(data);
        return {
            success: true,
            data: parsed,
            errors: []
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Zod 4.x uses 'issues' instead of 'errors'
            const issues = (error as any).issues || (error as any).errors || [];
            const messages = issues.map((e: { path: (string | number)[]; message: string }) =>
                `${e.path.join('.')}: ${e.message}`
            );
            return {
                success: false,
                data: null,
                errors: messages
            };
        }
        return {
            success: false,
            data: null,
            errors: ['Erreur de validation inconnue']
        };
    }
}

/**
 * Safely parse data, returning null on failure (no throw)
 */
export function safeParse<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): T | null {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
}

export default {
    StudentSchema,
    ClassSchema,
    GroupSchema,
    BranchSchema,
    SubBranchSchema,
    ModuleSchema,
    ActivitySchema,
    AdultSchema,
    validateWith,
    safeParse
};
