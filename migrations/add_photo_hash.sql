-- Migration to add photo_hash column for cache invalidation
-- This allows detecting when photos have changed without downloading them

-- Add photo_hash column to Eleve table
ALTER TABLE "Eleve" ADD COLUMN IF NOT EXISTS "photo_hash" TEXT;

-- Add photo_hash column to CompteUtilisateur table
ALTER TABLE "CompteUtilisateur" ADD COLUMN IF NOT EXISTS "photo_hash" TEXT;

-- Create function to auto-update hash when photo changes
CREATE OR REPLACE FUNCTION update_photo_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.photo_base64 IS DISTINCT FROM OLD.photo_base64 THEN
    IF NEW.photo_base64 IS NOT NULL AND NEW.photo_base64 != '' THEN
      NEW.photo_hash = md5(NEW.photo_base64);
    ELSE
      NEW.photo_hash = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Eleve table
DROP TRIGGER IF EXISTS eleve_photo_hash_trigger ON "Eleve";
CREATE TRIGGER eleve_photo_hash_trigger
  BEFORE INSERT OR UPDATE ON "Eleve"
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_hash();

-- Create trigger for CompteUtilisateur table
DROP TRIGGER IF EXISTS user_photo_hash_trigger ON "CompteUtilisateur";
CREATE TRIGGER user_photo_hash_trigger
  BEFORE INSERT OR UPDATE ON "CompteUtilisateur"
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_hash();

-- Update existing records to generate initial hashes
UPDATE "Eleve" 
SET photo_hash = md5(photo_base64) 
WHERE photo_base64 IS NOT NULL AND photo_base64 != '';

UPDATE "CompteUtilisateur" 
SET photo_hash = md5(photo_base64) 
WHERE photo_base64 IS NOT NULL AND photo_base64 != '';
