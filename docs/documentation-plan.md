# Plan d'Documentation Complète - src/features

L'objectif est d'uniformiser la documentation de tous les modules restants dans `src/features` en ajoutant pour chaque fichier :
- **En-tête descriptive en Français** (Plan)
- **Commentaires d'intention** (Pourquoi et non comment)
- **Logigramme textuel final** (Flux logique)

## Modules à traiter

### 1. Tracking (Suivi) - PRIORITÉ 1 ✅
*   [x] `TrackingDashboard.tsx`
*   [x] `StudentJournalView.tsx`
*   [x] `components/dashboard/*` (Controls, RecapModal, Columns)
*   [x] `components/desktop/*` (Panels, Grids, Handles)
*   [x] `components/mobile/*`
*   [x] `hooks/*` (useTrackingDashboardFlow, etc.)
*   [x] `services/*`
*   [x] `utils/*`
*   [x] `repositories/*`
*   [x] `types/*`

### 2. Activities (Ateliers) ⏳
*   [ ] `ActivityDetails.tsx`
*   [ ] `ActivityLevelExceptions.tsx`
*   [ ] `ActivityMaterialSelector.tsx`
*   [ ] `AddActivityModal.tsx`
*   [ ] `hooks/*`
*   [ ] `services/*`

### 3. Attendance (Présences) ⏳
*   [ ] `AttendanceColumn.tsx`
*   [ ] `AttendanceConfigModal.tsx`
*   [ ] `AttendancePDF.tsx`
*   [ ] (Tous les autres fichiers du dossier)

### 4. Planner (Planification) ⏳
### 5. Settings (Paramètres) ⏳
### 6. Materials (Matériel) ⏳
### 7. Responsibilities (Métiers) ⏳
### 8. Autres modules (adults, branches, levels, etc.) ⏳

---

## Guide de style

Chaque fichier doit suivre ce modèle :

```typescript
/**
 * Nom du module/fichier : [Nom].tsx
 * 
 * Données en entrée : 
 *   - [Prop 1] : description
 * 
 * Données en sortie : 
 *   - [Sortie] : description
 * 
 * Objectif principal : [Phrase simple expliquant le rôle métier]
 * 
 * Ce que ça affiche : [Description visuelle pour un humain]
 */

// ... imports ...

/**
 * [Action métier du composant]
 */
export const MyComponent = (props) => {
  // Commentaire d'intention : expliquant le pourquoi
  // ...
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. [Étape 1]
 * 2. [Étape 2]
 * ...
 */
```
