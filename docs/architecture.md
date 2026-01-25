# Architecture Système - Gestion de Classe

## Résumé Exécutif

L'application suit une architecture **Single Page Application (SPA)** monolithique modulaire. Le client React gère l'interface et la logique de présentation, tandis que Supabase fournit l'infrastructure backend (Base de données, Auth, API, Stockage) en mode "Backend-as-a-Service".

## Diagramme d'Architecture (Conceptuel)

```mermaid
graph TD
    Client[Client React (Vite)]
    Supabase[Supabase Platform]
    
    Client -->|REST/Realtime| Supabase
    
    subgraph "Frontend (src)"
        Features[Fonctionnalités (Features)]
        Components[Composants UI]
        Router[React Router]
        State[React Query / Context]
        
        Router --> Features
        Features --> Components
        Features --> State
    end
    
    subgraph "Supabase Backend"
        Auth[Authentication]
        DB[(PostgreSQL)]
        API[Auto-generated API]
        Storage[Storage Buckets]
        
        API --> DB
        Client --> API
        Client --> Auth
    end
```

## Pattern d'Architecture

### Frontend : Feature-based Architecture

Le code est organisé par domaine métier (Features) plutôt que par rôle technique. Chaque fonctionnalité (ex: `students`, `activities`) est autonome et contient ses propres composants, hooks et logique.

Structure type d'une feature :

```
src/features/feature-name/
├── components/   # Composants spécifiques à la feature
├── hooks/        # Logique métier et data-fetching
├── services/     # Appels API (si séparés)
└── utils/        # Utilitaires locaux
```

### Données & État

- **Server State :** Géré par `React Query` (caching, synchronisation, états de chargement).
- **Client State :** Géré par `React Context` pour les états globaux (ex: auth, préférences).
- **Local State :** `useState` pour les interactions UI locales.

## Points d'Intégration

L'application s'intègre principalement avec l'écosystème Supabase :

- **Authentification :** Gestion des utilisateurs (Enseignants, Parents, Admin).
- **Base de Données :** PostgreSQL avec Row Level Security (RLS) pour la sécurisation des données.
- **Stockage :** Gestion des fichiers (photos élèves, ressources activités).

## Considérations Techniques Spécifiques

- **Langue :** Discrépance notée entre le code frontend (Anglais - ex: `students`) et le schéma de base de données (Français - ex: `eleve`). Une attention particulière est requise lors du mapping des données.
- **Performance :** Utilisation de Vite pour le développement rapide. Le chargement des données doit être optimisé via React Query pour éviter les requêtes redondantes.
