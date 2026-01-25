# Guide de Développement - Gestion de Classe

## Prérequis

- **Node.js** : Version 18 ou supérieure
- **npm** : Version 8 ou supérieure (ou pnpm/yarn)

## Installation

1. Cloner le dépôt.
2. Installer les dépendances :

   ```bash
   npm install
   ```

3. Configurer l'environnement :
   - Dupliquer `.env.example` en `.env`
   - Configurer les clés Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## Commandes Principales

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement local (Vite) |
| `npm run build` | Construit l'application pour la production |
| `npm run preview`| Prévisualise le build localement |
| `npm run lint` | Lance l'analyse statique du code (ESLint) |
| `npm test` | Lance les tests unitaires (Vitest) |
| `npm run test:ui`| Lance l'interface graphique de Vitest |

## Tests

Le projet utilise **Vitest** pour les tests unitaires et composants.

- Les fichiers de tests sont situés à côté des composants (`*.test.tsx`) ou dans `src/test/`.
- **Playwright** est configuré pour les tests E2E (voir `e2e/`).

## Style de Code

- **Formatage :** Le projet utilise ESLint et Prettier (implicite via les plugins).
- **CSS :** Tailwind CSS est utilisé pour le style. Évitez le CSS custom dans `index.css` sauf nécessité absolue.
- **Architecture :** Respectez l'architecture par "Feature" (`src/features/*`).

## WorkflowGit

1. Créer une branche pour votre fonctionnalité.
2. Commiter régulièrement.
3. Ouvrir une Pull Request pour revue.

## Déploiement

Le déploiement est généralement géré via connexion à un dépôt Git (ex: Vercel, Netlify) qui build automatiquement via `npm run build`.
La configuration Supabase (Migrations) doit être appliquée manuellement ou via CI/CD.
