-- Migration: Add last_selected_group_id to CompteUtilisateur
-- Purpose: Enable cross-device synchronization of selected group between TBI, Tablet, and Mobile

ALTER TABLE "CompteUtilisateur" 
ADD COLUMN IF NOT EXISTS last_selected_group_id UUID 
REFERENCES "Groupe"(id) ON DELETE SET NULL;

COMMENT ON COLUMN "CompteUtilisateur".last_selected_group_id IS 'Last selected group by user for cross-device sync';
