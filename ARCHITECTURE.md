# Architecture du Projet Gestion de Classe

Ce document décrit l'architecture technique de l'application de Gestion de Classe.

## Vue d'ensemble

Le projet est une Single Page Application (SPA) construite avec React et Vite, utilisant Supabase comme Backend-as-a-Service (BaaS).

```mermaid
graph TD
    User((Enseignant))
    
    subgraph "Frontend (Client)"
        UI[Interface React]
        Router[React Router]
        State[Gestion d'État Local]
        AuthLib[Client Auth Supabase]
    end
    
    subgraph "Backend (Supabase)"
        Auth[Authentification]
        DB[(PostgreSQL)]
        Realtime[Realtime Subscriptions]
        Storage[Stockage Fichiers]
    end

    User -->|Interagit| UI
    UI -->|Navigation| Router
    UI -->|Données| State
    
    UI -->|Requêtes API| AuthLib
    AuthLib -->|JWT| Auth
    AuthLib -->|CRUD| DB
    AuthLib -->|Synchro| Realtime
    
    subgraph "Composants Clés"
        Layout --> Sidebar
        Layout --> Header
        Dashboard --> Modules
        Dashboard --> Suivi
        Dashboard --> Élèves
    end
    
    Router --> Layout
    Layout --> Dashboard
```

## Technologies

- **Frontend**:
  - [React](https://react.dev/) (UI)
  - [Vite](https://vitejs.dev/) (Build tool)
  - [Tailwind CSS](https://tailwindcss.com/) (Styling)
  - [React Router](https://reactrouter.com/) (Navigation)
  - [Lucide React](https://lucide.dev/) (Icônes)
  - [DnD Kit](https://dndkit.com/) (Drag & Drop)

- **Backend**:
  - [Supabase](https://supabase.com/)
    - PostgreSQL Database
    - Authentication (Email-based)
    - Row Level Security (RLS) pour la protection des données

## Structure des Dossiers

- `/src`
  - `/components`: Composants réutilisables (Layout, Boutons, Modales...)
  - `/pages`: Vues principales correspondantes aux routes (Dashboard, Auth, Landing...)
  - `/hooks`: Custom hooks pour la logique métier (ex: `useModuleManagement`)
  - `/lib`: Utilitaires et configuration (client Supabase, helpers...)
  - `/config`: Constantes globales (navigation...)
