-- Migration to add sex column to Eleve table if it doesn't exist

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Eleve' AND column_name = 'sex') THEN 
        ALTER TABLE "Eleve" ADD COLUMN "sex" text; 
    END IF; 
END $$;
