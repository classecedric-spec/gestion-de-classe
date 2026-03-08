-- 1. Re-create the publication to ensure it tracks ALL tables
-- This ensures that any new table added in the future is also synchronized automatically
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
-- 2. Set Replica Identity to FULL for core tables
-- (Repeat for most important tables to be safe, though FOR ALL TABLES covers the broadcast)
ALTER TABLE "Eleve" REPLICA IDENTITY FULL;
ALTER TABLE "Groupe" REPLICA IDENTITY FULL;
ALTER TABLE "EleveGroupe" REPLICA IDENTITY FULL;
ALTER TABLE "Progression" REPLICA IDENTITY FULL;
ALTER TABLE "Classe" REPLICA IDENTITY FULL;
ALTER TABLE "Activite" REPLICA IDENTITY FULL;
ALTER TABLE "Module" REPLICA IDENTITY FULL;
ALTER TABLE "Branche" REPLICA IDENTITY FULL;
ALTER TABLE "SousBranche" REPLICA IDENTITY FULL;
ALTER TABLE "Niveau" REPLICA IDENTITY FULL;