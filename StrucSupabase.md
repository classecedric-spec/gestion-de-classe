# Structure de la Base de Données Supabase

Ce document détaille les tables et colonnes de la base de données PostgreSQL gérée par Supabase pour le projet Gestion de Classe.

## Tables du Schéma Public

### 1. Eleve (Élèves)

* `id` (uuid, PK) : Identifiant unique de l'élève.
* `nom` (text) : Nom de l'élève.
* `prenom` (text) : Prénom de l'élève.
* `date_naissance` (date) : Date de naissance.
* `sexe` (text) : Sexe (M/F).
* `photo_url` (text) : Lien vers la photo dans le stockage.
* `niveau_id` (uuid, FK) : Lien vers la table `Niveau`.
* `classe_id` (uuid, FK) : Lien vers la table `Classe`.
* `user_id` (uuid, FK) : Propriétaire de la donnée.
* `created_at`, `updated_at` : Timestamps.

### 2. Classe (Classes / Divisions)

* `id` (uuid, PK)
* `nom` (text) : Nom de la classe.
* `annee_scolaire` (text)
* `user_id` (uuid, FK)

### 3. Niveau (Niveaux scolaires)

* `id` (uuid, PK)
* `nom` (text) : PS, MS, GS, etc.
* `ordre` (integer)

### 4. Branche (Domaines d'apprentissage)

* `id` (uuid, PK)
* `nom` (text)
* `couleur` (text)
* `user_id` (uuid, FK)

### 5. SousBranche (Sous-domaines)

* `id` (uuid, PK)
* `nom` (text)
* `branche_id` (uuid, FK)
* `ordre` (integer)
* `photo_url` (text)

### 6. Module (Compétences / Objectifs)

* `id` (uuid, PK)
* `nom` (text)
* `sous_branche_id` (uuid, FK)
* `ordre` (integer)

### 7. SuiviPedago (Évaluations / Observations)

* `id` (uuid, PK)
* `eleve_id` (uuid, FK)
* `module_id` (uuid, FK)
* `statut` (text) : Acquis, En cours, Non acquis.
* `date_evaluation` (date)
* `user_id` (uuid, FK)

### 8. Materiel (Matériel de classe)

* `id` (uuid, PK)
* `nom` (text)
* `quantite` (integer)
* `zone` (text)
* `user_id` (uuid, FK)

### 9. Groupe (Groupes d'élèves)

* `id` (uuid, PK)
* `nom` (text)
* `user_id` (uuid, FK)

### 10. EleveGroupe (Liaison Élève-Groupe)

* `id` (uuid, PK)
* `eleve_id` (uuid, FK)
* `groupe_id` (uuid, FK)

### 11. weekly_planning (Emploi du temps)

* `id` (uuid, PK)
* `day_of_week` (text)
* `start_time`, `end_time` (text)
* `activity_title` (text)
* `user_id` (uuid, FK)

### 12. Adulte (Gestion des intervenants)

* `id` (uuid, PK)
* `nom` (text)
* `role` (text)

---
*Note : Toutes les tables ont la sécurité au niveau des lignes (RLS) activée et sont filtrées par `user_id` pour assurer l'étanchéité des données entre enseignants.*
