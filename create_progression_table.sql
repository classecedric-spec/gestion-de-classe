-- Create Progression table to track student status on activities
CREATE TABLE IF NOT EXISTS public."Progression" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "eleve_id" UUID REFERENCES public."Eleve"("id") ON DELETE CASCADE NOT NULL,
    "activite_id" UUID REFERENCES public."Activite"("id") ON DELETE CASCADE NOT NULL,
    "etat" TEXT DEFAULT 'a_commencer' CHECK (etat IN ('a_commencer', 'en_cours', 'besoin_d_aide', 'termine')),
    "user_id" UUID REFERENCES auth.users("id") DEFAULT auth.uid(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("eleve_id", "activite_id")
);

-- Enable Row Level Security
ALTER TABLE public."Progression" ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Users can manage own Progressions" ON public."Progression";
CREATE POLICY "Users can manage own Progressions" 
ON public."Progression" FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_progression_eleve_id ON public."Progression"("eleve_id");
CREATE INDEX IF NOT EXISTS idx_progression_activite_id ON public."Progression"("activite_id");
