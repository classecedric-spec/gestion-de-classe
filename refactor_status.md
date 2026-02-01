# Refactor Status

Dernière action : Refactorisation des modales d'ajout d'élèves (`AddStudentToGroupModal` et `AddStudentToClassModal`) vers leurs features respectives.

## Hooks créés

- `useTrackingDashboardFlow.ts` : Orchestre la logique complexe du tableau de bord de suivi.
- `useAdultsPageFlow.ts` : Gère la logique UI de la page Adultes (modales, synchro hauteur, formulaires).
- `useStudentDetailsFlow.ts` : Extrait la logique de `StudentDetailsColumn` (progressions, brevets, PDF).
- `useGroupsPageFlow.ts` : Centralise la gestion de la page Groupes.
- `useAddStudentToGroupFlow.ts` : Gère le flux d'ajout d'élèves à un groupe.
- `useAddStudentToClassFlow.ts` : Gère le flux d'ajout d'élèves à une classe.

## Composants créés / Migrés

- `src/features/tracking/components/TrackingDashboard.tsx` : Refactorisé (Hook-First).
- `src/features/adults/components/AdultsPage.tsx` : Migré depuis `src/pages/Adults.tsx`.
- `src/features/students/components/StudentDetailsColumn.tsx` : Refactorisé (Hook-First).
- `src/features/groups/components/GroupsPage.tsx` : Migré depuis `src/pages/Groups`.
- `src/features/groups/components/AddStudentToGroupModal.tsx` : Migré depuis `src/components`.
- `src/features/classes/components/AddStudentToClassModal.tsx` : Migré depuis `src/components`.

## Santé du site : [🟢 Stable]

- Playwright Health Check : **PASS**
- Navigation de base : **OK**

## Prochaine étape

- Phase C : Refactorisation de `src/features/settings/components/SettingsSystemTab.tsx` (Nettoyage de la logique de cache et d'optimisation).
