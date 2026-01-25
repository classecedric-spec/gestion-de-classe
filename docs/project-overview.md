# Aperçu du Projet - Gestion de Classe

**Généré le :** 24/01/2026

## Résumé Exécutif

Gestion de Classe est une application web destinée à aider les enseignants à gérer leur classe, suivre la progression des élèves et communiquer avec les parents. Le projet est actuellement en phase "Brownfield", nécessitant une restructuration et une extension des fonctionnalités existantes.

**Objectifs Clés :**

- Autonomie des élèves (encodage de leur progression).
- Tableau de bord enseignant (suivi global, retards, avances).
- Génération de bulletins.
- Gestion des présences.
- Logique de délais et communication automatique avec les parents.

## Stack Technique

| Catégorie | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| Frontend | React | 19.x | Bibliothèque UI moderne et réactive |
| Build Tool | Vite | 5.x | Build rapide et HMR |
| Langage | TypeScript | 5.x | Typage statique pour la robustesse |
| Styles | Tailwind CSS | 4.x | Styling utilitaire rapide |
| Backend / DB | Supabase | Client 2.x | BaaS (Postgres, Auth, Realtime) |
| State | React Query | 5.x | Gestion de l'état serveur et cache |
| Routing | React Router | 6.x | Navigation SPA |

## Architecture

Le projet suit une architecture **Monolithique Modulaire** (Feature-based) côté frontend.
Le backend est délégué à **Supabase** (PostgreSQL + Services).

- **Frontend :** Organisé par fonctionnalités (`src/features/*`) plutôt que par type technique.
- **Base de données :** Schéma relationnel PostgreSQL (hébergé par Supabase).

## Structure du Répertoire

```
gestion-de-classe/
├── src/
│   ├── features/       # Modules métier (activities, students, attendance...)
│   ├── components/     # Composants UI réutilisables
│   ├── pages/          # Pages de l'application (Routes)
│   ├── lib/            # Configuration et utilitaires (Supabase client)
│   ├── hooks/          # Hooks React globaux
│   ├── context/        # Contextes globaux
│   └── types/          # Types TypeScript partagés
├── supabase/
│   └── migrations/     # Historique des changements de schéma DB
└── public/             # Assets statiques
```

## Documentation Détaillée

- [Architecture Système](./architecture.md)
- [Modèles de Données](./data-models.md)
- [Guide de Développement](./development-guide.md)
