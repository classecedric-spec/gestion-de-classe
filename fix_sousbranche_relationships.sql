-- FIX: Add missing relationship (Foreign Key) between SousBranche and Branche
-- This fixes the error: "Could not find a relationship between 'SousBranche' and 'branche_id'"

-- 1. Add Foreign Key for 'branche_id' linking to 'Branche' table
ALTER TABLE public."SousBranche"
DROP CONSTRAINT IF EXISTS fk_sousbranche_branche; -- Drop if exists to be safe/update

ALTER TABLE public."SousBranche"
ADD CONSTRAINT fk_sousbranche_branche
FOREIGN KEY (branche_id)
REFERENCES public."Branche"(id)
ON DELETE CASCADE;

-- 2. Add Foreign Key for 'user_id' linking to 'auth.users' (Best practice)
ALTER TABLE public."SousBranche"
DROP CONSTRAINT IF EXISTS fk_sousbranche_user;

ALTER TABLE public."SousBranche"
ADD CONSTRAINT fk_sousbranche_user
FOREIGN KEY (user_id)
REFERENCES auth.users(id);

-- 3. Notify PostgREST schema cache (Supabase does this automatically on DDL, but good to know)
