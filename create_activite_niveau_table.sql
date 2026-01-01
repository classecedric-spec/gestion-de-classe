-- Create ActiviteNiveau table
CREATE TABLE IF NOT EXISTS public."ActiviteNiveau" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "activite_id" UUID REFERENCES public."Activite"("id") ON DELETE CASCADE NOT NULL,
    "niveau_id" UUID REFERENCES public."Niveau"("id") ON DELETE CASCADE NOT NULL,
    "nombre_exercices" INTEGER DEFAULT 0,
    "nombre_erreurs" INTEGER DEFAULT 0,
    "statut_exigence" TEXT DEFAULT 'obligatoire',
    "user_id" UUID REFERENCES auth.users("id") DEFAULT auth.uid(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("activite_id", "niveau_id")
);

-- Enable Row Level Security
ALTER TABLE public."ActiviteNiveau" ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own activity levels" 
ON public."ActiviteNiveau" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity levels" 
ON public."ActiviteNiveau" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity levels" 
ON public."ActiviteNiveau" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity levels" 
ON public."ActiviteNiveau" FOR DELETE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activiteniveau_activite_id ON public."ActiviteNiveau"("activite_id");
CREATE INDEX IF NOT EXISTS idx_activiteniveau_niveau_id ON public."ActiviteNiveau"("niveau_id");
