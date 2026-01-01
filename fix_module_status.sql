-- FIX: Add 'statut' column to Module table
-- States: 'en_preparation', 'en_cours', 'archive'

ALTER TABLE public."Module"
ADD COLUMN IF NOT EXISTS statut text DEFAULT 'en_preparation';

-- Add check constraint to ensure valid values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_module_statut'
    ) THEN
        ALTER TABLE public."Module"
        ADD CONSTRAINT check_module_statut
        CHECK (statut IN ('en_preparation', 'en_cours', 'archive'));
    END IF;
END $$;
