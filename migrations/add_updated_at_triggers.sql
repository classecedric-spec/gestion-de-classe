-- Migration to add updated_at timestamps for Delta Sync
-- This enables incremental loading by tracking when records change

-- Add updated_at column to all main tables
ALTER TABLE "Eleve" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Progression" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Activite" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Classe" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Groupe" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "Branche" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "SousBranche" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
CREATE TRIGGER update_eleve_updated_at
  BEFORE UPDATE ON "Eleve"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progression_updated_at
  BEFORE UPDATE ON "Progression"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_updated_at
  BEFORE UPDATE ON "Module"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activite_updated_at
  BEFORE UPDATE ON "Activite"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON "Attendance"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classe_updated_at
  BEFORE UPDATE ON "Classe"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groupe_updated_at
  BEFORE UPDATE ON "Groupe"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branche_updated_at
  BEFORE UPDATE ON "Branche"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sousbranche_updated_at
  BEFORE UPDATE ON "SousBranche"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize updated_at for existing records
UPDATE "Eleve" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Progression" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Module" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Activite" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Attendance" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Classe" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Groupe" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "Branche" SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE "SousBranche" SET updated_at = NOW() WHERE updated_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_eleve_updated_at ON "Eleve"(updated_at);
CREATE INDEX IF NOT EXISTS idx_progression_updated_at ON "Progression"(updated_at);
CREATE INDEX IF NOT EXISTS idx_module_updated_at ON "Module"(updated_at);
CREATE INDEX IF NOT EXISTS idx_activite_updated_at ON "Activite"(updated_at);
