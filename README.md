# Gestion de Classe - Application Enseignant

Application web pour aider les enseignants à gérer leur classe, suivre les activités des élèves et gérer les présences.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js (v18+)
- npm

### Installation

1. Cloner le dépôt (si applicable)
2. Installer les dépendances :

   ```bash
   npm install
   ```

### Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`.

## 🛠 Technologies

- **Frontend** : React, Vite, Tailwind CSS v4
- **Backend** : Supabase (PostgreSQL, Auth)
- **Tests** : Vitest

## 🏗 Architecture

Pour une vue détaillée de l'architecture technique et des flux de données, consultez le fichier [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📂 Structure du Projet

- **`src/pages`** : Contient les vues principales (Dashboard, Suivi, Auth...).
- **`src/components`** : Composants UI réutilisables (Boutons, Modales, Layout...).
- **`src/hooks`** : Logique métier encapsulée (gestion des modules, élèves...).
- **`src/lib`** : Configuration Supabase et utilitaires.
