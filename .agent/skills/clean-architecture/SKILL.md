---
name: clean-architecture
description: Guidelines for Clean Architecture, Service/Repository patterns, and Supabase best practices in the Gestion De Classe project.
---

# Clean Architecture & Supabase Best Practices

This guide outlines the architectural patterns and coding standards established for the **Gestion De Classe** project. Adhering to these rules ensures maintainability, testability, and a clear separation of concerns.

## 1. Project Structure (Feature-Based)

The project follows a feature-based organization. Each major functionality is encapsulated within its own directory under `src/features/`.

```text
src/features/[feature-name]/
├── components/      # Feature-specific UI components
├── hooks/           # Business logic hooks for this feature
├── repositories/    # Data access layer (Supabase implementation)
│   ├── I[Feature]Repository.ts
│   └── Supabase[Feature]Repository.ts
├── services/        # Business logic layer
│   └── [feature]Service.ts
└── types/           # Feature-specific typescript definitions
```

## 2. Layer Responsibilities

### Repositories (Data Access Layer)

- **Only** layer allowed to import `supabase` from `lib/database` for data fetching/mutations.
- Implementation must follow an interface (`IRepository`) to allow for easy mocking/testing.
- Should return raw data or simple objects, avoiding complex UI-specific transformations.

### Services (Business Logic Layer)

- Orchestrates data flow between repositories and UI.
- Responsible for complex business logic, validations, and mapping data to specific models.
- Consumer of one or more repositories.
- Exported as a singleton instance.

### Hooks (Logic Orchestration Layer)

- Connects Services to the React UI.
- Manages state, loading flags, and error state.
- Handles interactions like `onSuccess` or `onError` notifications (Toasts).
- Uses `useCallback` for fetch functions to avoid unnecessary re-renders.

### Components (UI Layer)

- Purely presentational or used to bind hooks to the UI.
- **NEVER** calls Supabase or Repositories directly.

## 3. Database & Supabase Rules

- **Authentication**: Always use `getCurrentUser()` from `../../../lib/database` instead of `supabase.auth.getUser()`.
- **Typing**: Use `Tables<'TableName'>`, `TablesInsert<'TableName'>`, and `TablesUpdate<'TableName'>` from `src/types/supabase.ts` for all database interactions.
- **Direct Access**: No direct `supabase.from()` calls in UI components. All data access must go through a Service.

## 4. Error Handling & User Feedback

- **Repositories**: Throw errors if database operations fail.
- **Services**: Catch and potentially wrap errors with business context.
- **Hooks**: Catch errors and provide user feedback via `toast.error` or `alert`.

## 5. Offline & Sync Logic

- For operations requiring offline support, use the `useOfflineSync` context.
- Add operations to the queue using `addToQueue` when the user is offline.
- Always provide a `contextDescription` for queued operations to help with debugging.

## 6. Code Style & Naming

- **Interfaces**: Always prefix with `I` (e.g., `IStudentRepository`).
- **Implementations**: Prefix with the provider (e.g., `SupabaseStudentRepository`).
- **Singletons**: Service instances should be exported as camelCase (e.g., `studentService`).
- **Async/Await**: Preferred over `.then()`.

## 7. UI Aesthetics & Icons

- **Icons**: Use the `lucide-react` library.
- **Styling**: Favor CSS variables for colors (defined in `index.css`). Use modern patterns: gradients, glassy backgrounds (`backdrop-blur`), and subtle hover animations.
- **Premium Feel**: Avoid browser defaults. Use curated spacing and typography.

## 8. Utilities & Storage

- **Image Processing**: Use `resizeAndConvertToBase64` from `lib/storage` for client-side resizing before upload.
- **Database Helpers**: Use `getCurrentUser()` for all auth-related user ID retrieval.
- **Storage**: Prefer using specialized service methods for storage uploads (e.g., `studentService.uploadStudentPhoto`).

---

## Example: Proper Service/Repository Pattern

### Repository Interface

```typescript
export interface IStudentRepository {
    getStudent(id: string): Promise<Tables<'Eleve'> | null>;
}
```

### Supabase Implementation

```typescript
import { supabase } from '../../../lib/database';

export class SupabaseStudentRepository implements IStudentRepository {
    async getStudent(id: string) {
        const { data, error } = await supabase.from('Eleve').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }
}
```

### Service

```typescript
export class StudentService {
    constructor(private repository: IStudentRepository) {}
    
    async getStudentDetails(id: string) {
        return await this.repository.getStudent(id);
    }
}

export const studentService = new StudentService(new SupabaseStudentRepository());
```
