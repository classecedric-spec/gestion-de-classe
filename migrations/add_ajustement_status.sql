-- Migration to add 'ajustement' to the allowed values for "etat" in the "Progression" table.
-- Run this in your Supabase SQL Editor.

-- Drop the old constraint
ALTER TABLE "Progression" DROP CONSTRAINT IF EXISTS "Progression_etat_check";

-- Add the new constraint with 'ajustement'
ALTER TABLE "Progression" ADD CONSTRAINT "Progression_etat_check" 
CHECK (etat IN ('a_commencer', 'besoin_d_aide', 'a_verifier', 'termine', 'a_domicile', 'ajustement'));
