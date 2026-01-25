# Modèles de Données - Gestion de Classe

## Schéma de Base de Données (PostgreSQL)

La base de données est hébergée sur Supabase.
**Note importante :** Les tables utilisent des noms en **Français**, tandis que le code frontend utilise majoritairement l'Anglais.

### Tables Principales (Identifiées)

| Table (DB) | Concept (Code) | Description |
|------------|----------------|-------------|
| `eleve` | Student | Représente un élève de la classe. Contient les infos personnelles, le sexe, la photo. |
| `adulte` | Adult/Parent | Représente un parent ou un enseignant associé aux élèves ou à la classe. |
| `compte_utilisateur`| UserProfile | Profil étendu de l'utilisateur (lié à `auth.users`). Contient les préférences (ex: dernier groupe sélectionné). |
| `type_materiel` | MaterialType | Types de matériel scolaire/activités (avec acronyme). |

### Mapping Code-DB

Pour assurer la cohérence, le mapping suivant est observé :

- **Frontend `src/features/students`** ↔ **DB `eleve`**
- **Frontend `src/features/users`** ↔ **DB `compte_utilisateur`** / **DB `adulte`**
- **Frontend `src/features/materials`** ↔ **DB `type_materiel`**

## Migrations

Les migrations sont gérées via Supabase CLI et stockées dans `supabase/migrations/`.
L'historique montre des ajouts récents (Janvier 2026) :

- Ajout du sexe aux élèves.
- Ajout des acronymes pour le matériel.
- Activation RLS (Row Level Security) sur toutes les tables (Sécurité critique).

## Sécurité des Données

- **RLS (Row Level Security) :** Activé sur toutes les tables.
- Les requêtes doivent être authentifiées via le client Supabase pour respecter les politiques d'accès.
