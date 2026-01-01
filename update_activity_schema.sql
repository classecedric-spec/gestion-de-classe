-- Add requirements columns to Activite
ALTER TABLE "Activite" ADD COLUMN IF NOT EXISTS "nombre_exercices" integer;
ALTER TABLE "Activite" ADD COLUMN IF NOT EXISTS "nombre_erreurs" integer;
ALTER TABLE "Activite" ADD COLUMN IF NOT EXISTS "statut_exigence" text CHECK (statut_exigence IN ('obligatoire', 'facultatif')) DEFAULT 'obligatoire';

-- Create TypeMateriel table
CREATE TABLE IF NOT EXISTS "TypeMateriel" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "nom" text NOT NULL,
  "user_id" uuid REFERENCES auth.users(id),
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for TypeMateriel
ALTER TABLE "TypeMateriel" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own TypeMateriel" ON "TypeMateriel"
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create junction table for Activity <-> Material
CREATE TABLE IF NOT EXISTS "ActiviteMateriel" (
  "activite_id" uuid REFERENCES "Activite"(id) ON DELETE CASCADE,
  "type_materiel_id" uuid REFERENCES "TypeMateriel"(id) ON DELETE CASCADE,
  PRIMARY KEY ("activite_id", "type_materiel_id")
);

-- Enable RLS for Junction Table
ALTER TABLE "ActiviteMateriel" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ActiviteMateriel" ON "ActiviteMateriel"
  USING (
    EXISTS (SELECT 1 FROM "Activite" WHERE id = activite_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM "Activite" WHERE id = activite_id AND user_id = auth.uid())
  );
