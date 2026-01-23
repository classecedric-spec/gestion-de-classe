-- Migration pour ajouter la colonne photo_url aux tables Groupe et CompteUtilisateur
-- Ajouter photo_url à la table Groupe si elle n'existe pas
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Groupe'
        AND column_name = 'photo_url'
) THEN
ALTER TABLE "Groupe"
ADD COLUMN "photo_url" TEXT;
END IF;
END $$;
-- Ajouter photo_url à la table CompteUtilisateur si elle n'existe pas
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'CompteUtilisateur'
        AND column_name = 'photo_url'
) THEN
ALTER TABLE "CompteUtilisateur"
ADD COLUMN "photo_url" TEXT;
END IF;
END $$;
-- Ajouter photo_url à la table Branche si elle n'existe pas (déjà fait normalement)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Branche'
        AND column_name = 'photo_url'
) THEN
ALTER TABLE "Branche"
ADD COLUMN "photo_url" TEXT;
END IF;
END $$;
-- Ajouter photo_url à la table SousBranche si elle n'existe pas (déjà fait normalement)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'SousBranche'
        AND column_name = 'photo_url'
) THEN
ALTER TABLE "SousBranche"
ADD COLUMN "photo_url" TEXT;
END IF;
END $$;