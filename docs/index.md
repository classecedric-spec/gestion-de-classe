# Index de Documentation - Gestion de Classe

## Aperçu du Projet

- **Type :** Monolith (Web Frontend + BaaS)
- **Langage Principal :** TypeScript
- **Architecture :** React SPA (Feature-based) + Supabase

## Référence Rapide

- **Stack Technique :** React 19, Vite, TailwindCSS, Supabase
- **Point d'Entrée :** `src/main.tsx` (`index.html`)
- **Modèle de Données :** Tables DB en Français (`eleve`, `adulte`) vs Code en Anglais (`Student`, `Adult`).

## Documentation Générée

- [Aperçu du Projet](./project-overview.md)
- [Architecture Système](./architecture.md)
- [Modèles de Données](./data-models.md)
- [Maquette/Design](./component-inventory.md) _(To be generated)_
- [Guide de Développement](./development-guide.md)
- [Contrats d'API](./api-contracts.md) _(To be generated)_

## Documentation Existante

- [Eco_Printing_Feature.md](./Eco_Printing_Feature.md) - Fonctionnalité d'impression écologique (Legacy ?)

## Démarrage Rapide

1. **Installation :** `npm install`
2. **Configuration :** Copier `.env.example` vers `.env` (nécessite clés Supabase).
3. **Lancer :** `npm run dev` pour le serveur local.
4. **Authentification :** L'accès nécessite un compte utilisateur valide dans Supabase Auth.
