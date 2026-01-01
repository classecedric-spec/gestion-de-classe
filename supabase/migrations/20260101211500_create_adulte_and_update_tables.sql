-- Create Adulte table
CREATE TABLE IF NOT EXISTS "Adulte" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nom" text NOT NULL,
  "prenom" text NOT NULL,
  "fonction" text,
  "user_id" uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  "created_at" timestamptz DEFAULT now()
);

-- Enable RLS on Adulte
ALTER TABLE "Adulte" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own adults" 
ON "Adulte"
FOR ALL
USING (auth.uid() = user_id);

-- Add titulaire_id to Classe
ALTER TABLE "Classe" ADD COLUMN IF NOT EXISTS "titulaire_id" uuid REFERENCES "Adulte"(id);

-- Add parent fields to Eleve
ALTER TABLE "Eleve" ADD COLUMN IF NOT EXISTS "nom_parents" text;
