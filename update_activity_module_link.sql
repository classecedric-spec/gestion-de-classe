-- Add module_id column if it doesn't exist
ALTER TABLE "Activite" ADD COLUMN IF NOT EXISTS "module_id" uuid REFERENCES "Module"(id) ON DELETE CASCADE;

-- Safely handle sous_branche_id
DO $$ 
BEGIN 
    -- If the column exists, make it nullable (so we don't break if it was required before)
    -- Or we can drop it if we are sure. Let's just make it nullable to be safe.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Activite' AND column_name = 'sous_branche_id') THEN
        ALTER TABLE "Activite" ALTER COLUMN "sous_branche_id" DROP NOT NULL;
    END IF;
END $$;
