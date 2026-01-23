# Guide de Contribution

Bienvenue ! Ce guide vous aidera à contribuer efficacement au projet Gestion de Classe.

## 🏗️ Architecture

Le projet suit une **architecture en couches** avec le **Repository Pattern**. Consultez [ARCHITECTURE.md](./ARCHITECTURE.md) pour les détails complets.

## 📋 Conventions de Code

### Structure d'une Feature

Chaque feature suit cette structure :

```
/features/[feature-name]/
├── /types              # Types TypeScript
├── /repositories       # Accès données (Repository Pattern)
├── /services           # Logique métier
├── /hooks              # Hooks React personnalisés
├── /components         # Composants UI
└── /utils              # Utilitaires spécifiques
```

### Nommage

- **Fichiers :** camelCase (`studentService.ts`)
- **Composants :** PascalCase (`StudentList.tsx`)
- **Interfaces :** PascalCase avec préfixe `I` (`IStudentRepository`)
- **Types :** PascalCase (`StudentWithClass`)
- **Constantes :** UPPER_SNAKE_CASE (`MAX_STUDENTS`)

### TypeScript

- ✅ Toujours typer les paramètres et retours de fonction
- ✅ Éviter `any` (utiliser `unknown` si nécessaire)
- ✅ Utiliser les types générés Supabase (`Tables<'TableName'>`)
- ✅ Extraire les types complexes dans `/types`

## 🔧 Ajouter une Nouvelle Feature

### 1. Créer la Structure

```bash
mkdir -p src/features/ma-feature/{types,repositories,services,hooks,components}
```

### 2. Définir les Types

```typescript
// src/features/ma-feature/types/ma-feature.types.ts
import { Tables } from '../../../types/supabase';

export type MyEntity = Tables<'MyTable'>;
export interface MyEntityWithRelations extends MyEntity {
  // Relations...
}
```

### 3. Créer le Repository

```typescript
// src/features/ma-feature/repositories/IMyFeatureRepository.ts
export interface IMyFeatureRepository {
  getAll(): Promise<MyEntity[]>;
  findById(id: string): Promise<MyEntity | null>;
  create(data: MyEntityInsert): Promise<MyEntity>;
  update(id: string, data: MyEntityUpdate): Promise<MyEntity>;
  delete(id: string): Promise<void>;
}
```

```typescript
// src/features/ma-feature/repositories/SupabaseMyFeatureRepository.ts
import { supabase } from '../../../lib/database';

export class SupabaseMyFeatureRepository implements IMyFeatureRepository {
  async getAll() {
    const { data, error } = await supabase
      .from('MyTable')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return data || [];
  }
  // ... autres méthodes
}
```

### 4. Créer le Service

```typescript
// src/features/ma-feature/services/myFeatureService.ts
export class MyFeatureService {
  constructor(private repository: IMyFeatureRepository) {}

  async fetchAll() {
    return await this.repository.getAll();
  }

  async create(data: Omit<MyEntityInsert, 'user_id'>, userId: string) {
    // Validation métier
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Le nom est requis');
    }

    return await this.repository.create({
      ...data,
      name: data.name.trim(),
      user_id: userId
    });
  }
}

// Export singleton
export const myFeatureService = new MyFeatureService(
  new SupabaseMyFeatureRepository()
);
```

### 5. Écrire les Tests

```typescript
// src/features/ma-feature/services/myFeatureService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let mockRepository: IMyFeatureRepository;

  beforeEach(() => {
    mockRepository = {
      getAll: vi.fn(),
      create: vi.fn(),
      // ... autres méthodes mockées
    } as any;

    service = new MyFeatureService(mockRepository);
  });

  describe('create', () => {
    it('should create with valid data', async () => {
      const mockData = { /* ... */ };
      vi.mocked(mockRepository.create).mockResolvedValue(mockData);

      const result = await service.create({ name: 'Test' }, 'user1');

      expect(result).toEqual(mockData);
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'Test',
        user_id: 'user1'
      });
    });

    it('should throw error if name is empty', async () => {
      await expect(service.create({ name: '' }, 'user1'))
        .rejects.toThrow('Le nom est requis');
    });
  });
});
```

### 6. Créer un Hook

```typescript
// src/features/ma-feature/hooks/useMyFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { myFeatureService } from '../services/myFeatureService';

export function useMyFeature() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['myFeature'],
    queryFn: () => myFeatureService.fetchAll()
  });

  const createMutation = useMutation({
    mutationFn: (data: MyEntityInsert) => 
      myFeatureService.create(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFeature'] });
    }
  });

  return {
    data,
    isLoading,
    create: createMutation.mutate
  };
}
```

## 🧪 Tests

### Lancer les Tests

```bash
# Tous les tests
npm test

# Tests d'un fichier spécifique
npm test src/features/ma-feature/services/myFeatureService.test.ts

# Mode watch
npm test -- --watch

# Avec UI
npm run test:ui

# Avec couverture
npm run test:coverage
```

### Bonnes Pratiques

- ✅ Tester la logique métier, pas les détails d'implémentation
- ✅ Mocker les repositories, pas Supabase directement
- ✅ Tester les cas d'erreur
- ✅ Tester la validation des données
- ✅ Viser >80% de couverture

## 🎨 Composants

### Créer un Composant

```typescript
// src/features/ma-feature/components/MyComponent.tsx
import React from 'react';
import { useMyFeature } from '../hooks/useMyFeature';

export function MyComponent() {
  const { data, isLoading } = useMyFeature();

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div className="p-4">
      {data?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Styling

- Utiliser **Tailwind CSS**
- Classes utilitaires uniquement
- Éviter le CSS inline sauf pour les styles dynamiques
- Utiliser `clsx` pour les classes conditionnelles

## 📦 Imports

### Organisation des Imports

```typescript
// 1. Imports externes
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Imports internes (lib)
import { supabase } from '@/lib/database';
import { validateWith } from '@/lib/helpers';

// 3. Imports de features
import { studentService } from '@/features/students/services/studentService';

// 4. Imports relatifs
import { MyComponent } from './MyComponent';
import type { MyType } from '../types';
```

### Chemins d'Accès

Utiliser les imports depuis les index files :

```typescript
// ✅ Bon
import { supabase, cleanupOrphanProgressions } from '@/lib/database';
import { storageService, compressImage } from '@/lib/storage';

// ❌ Éviter
import { supabase } from '@/lib/database/supabaseClient';
import { storageService } from '@/lib/storage/storageService';
```

## 🔍 Debugging

### Logs

```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### Supabase Errors

```typescript
try {
  const data = await repository.method();
} catch (error) {
  console.error('[ServiceName] Error:', error);
  throw error; // Re-throw pour que le composant puisse gérer
}
```

## 🚀 Déploiement

### Build

```bash
npm run build
```

### Vérifications Avant Commit

```bash
# Linter
npm run lint

# Tests
npm test

# Build
npm run build
```

## 📝 Documentation

### Commenter le Code

```typescript
/**
 * Crée un nouvel élément
 * @param data - Données de l'élément (sans user_id)
 * @param userId - ID de l'utilisateur
 * @returns L'élément créé
 * @throws {Error} Si le nom est vide
 */
async create(data: Omit<EntityInsert, 'user_id'>, userId: string) {
  // Validation métier
  if (!data.name?.trim()) {
    throw new Error('Le nom est requis');
  }

  return await this.repository.create({
    ...data,
    user_id: userId
  });
}
```

### README des Features

Créer un `README.md` pour les features complexes :

```markdown
# Feature Name

## Description
Brève description de la feature.

## Services
- `myFeatureService` - Gestion principale

## Hooks
- `useMyFeature()` - Hook principal

## Composants
- `MyComponent` - Composant principal
```

## ❓ Questions ?

- Consultez [ARCHITECTURE.md](./ARCHITECTURE.md)
- Consultez [TESTING.md](./TESTING.md)
- Ouvrez une issue sur GitHub

---

**Merci de contribuer ! 🎉**
