-- Permettre les valeurs NULL dans activite_id pour les suivis manuels
ALTER TABLE "Progression" ALTER COLUMN "activite_id" DROP NOT NULL;

-- Ajout de la colonne importance_suivi à la table Eleve (si pas déjà fait)
ALTER TABLE "Eleve" ADD COLUMN IF NOT EXISTS "importance_suivi" INTEGER DEFAULT 1;

-- Ajout de la colonne is_suivi à la table Progression (si pas déjà fait)  
ALTER TABLE "Progression" ADD COLUMN IF NOT EXISTS "is_suivi" BOOLEAN DEFAULT false;
