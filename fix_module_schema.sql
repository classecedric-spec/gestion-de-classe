-- FIX: Add 'sous_branche_id' to Module table
-- Fixes error: "Could not find the 'sous_branche_id' column of 'Module'"

-- 1. Add the missing column 'sous_branche_id'
ALTER TABLE public."Module"
ADD COLUMN IF NOT EXISTS sous_branche_id uuid;

-- 2. Add Foreign Key linking Module -> SousBranche
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_module_sousbranche'
    ) THEN
        ALTER TABLE public."Module"
        ADD CONSTRAINT fk_module_sousbranche
        FOREIGN KEY (sous_branche_id)
        REFERENCES public."SousBranche"(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Ensure RLS Policies exist for Module
ALTER TABLE public."Module" ENABLE ROW LEVEL SECURITY;

-- Re-create policy to be sure
DROP POLICY IF EXISTS "Users can manage own Modules" ON public."Module";

CREATE POLICY "Users can manage own Modules" ON public."Module"
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Drop 'branche_id' if it exists and causes confusion, 
-- but strictly speaking we just need to ignore it if it allows NULL.
-- ALTER TABLE public."Module" DROP COLUMN IF EXISTS branche_id;
