# Audit Plan - Refactoring Gestion de Classe

## Objectives

- Implement Feature-Driven Architecture.
- Extract common UI components to `src/core`.
- Extract logic from components to custom hooks (Hook-First Rule).
- Enforce JSDoc documentation.
- Improve state management and API isolation.

## 0. Stabilization

- [x] Create `e2e/healthcheck.spec.ts`
- [x] Validate current stability (🟢 PASSED)

## 1. Core Migration (UI Atoms)

- **Target**: `src/components/ui` -> `src/core`
- **Action**: Move all base components (Button, Input, Badge, etc.) to `src/core`.
- **Reason**: Centralize primitive components as per target architecture.

## 2. Feature Reorganization (Prioritized)

### Phase A: Mobile & Tracking (High Complexity)

- `src/pages/MobileDashboard.tsx` -> `src/features/dashboard/components/MobileDashboard.tsx`
- `src/features/tracking/components/TrackingDashboard.tsx`: Extract logic to `useTrackingDashboard` hook.
- `src/pages/Adults.tsx` -> `src/features/adults/components/AdultsPage.tsx`.

### Phase B: Student & Group Management

- `src/features/students/components/StudentDetailsColumn.tsx`: Extract logic (current size ~56 blocks).
- `src/components/AddStudentToGroupModal.tsx` -> `src/features/groups/components/AddStudentToGroupModal.tsx`.
- `src/components/AddStudentToClassModal.tsx` -> `src/features/classes/components/AddStudentToClassModal.tsx`.

### Phase C: Settings & System

- `src/features/settings/components/SettingsSystemTab.tsx`: This is the largest file (64 blocks). Needs major extraction of system/cache/optimization logic into hooks and services.

## 3. Global Cleanup

- Move generic hooks from `src/hooks` to appropriate feature folders or keep in `src/hooks` if truly global (ex: `useWindowSize`).
- Type consolidation in `src/types`.

## Refactor Status Tracker

Created `refactor_status.md` to track progress.
