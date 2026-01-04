-- Ajout de la colonne niveau_id à la table Eleve pour lier les élèves aux niveaux
ALTER TABLE "Eleve" ADD COLUMN IF NOT EXISTS "niveau_id" uuid REFERENCES public."Niveau"(id) ON DELETE SET NULL;
