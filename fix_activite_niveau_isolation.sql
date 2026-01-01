-- ⚠️ ATTENTION : Ce script va supprimer les exigences de niveau existantes (ActiviteNiveau)
-- pour recréer la table avec la bonne structure liée spécifiquement à l'Activité.

DROP TABLE IF EXISTS public."ActiviteNiveau";

CREATE TABLE public."ActiviteNiveau" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "activite_id" UUID REFERENCES public."Activite"("id") ON DELETE CASCADE NOT NULL,
    "niveau_id" UUID REFERENCES public."Niveau"("id") ON DELETE CASCADE NOT NULL,
    "nombre_exercices" INTEGER DEFAULT 0,
    "nombre_erreurs" INTEGER DEFAULT 0,
    "statut_exigence" TEXT DEFAULT 'obligatoire', -- 'obligatoire' | 'facultatif'
    "user_id" UUID REFERENCES auth.users("id") DEFAULT auth.uid(),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Contrainte d'unicité : Une seule entrée par paire (Activité, Niveau)
    UNIQUE("activite_id", "niveau_id")
);

-- Activation de la sécurité (RLS)
ALTER TABLE public."ActiviteNiveau" ENABLE ROW LEVEL SECURITY;

-- Politique de sécurité
CREATE POLICY "Users can manage own ActiviteNiveau"
ON public."ActiviteNiveau"
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index pour la performance
CREATE INDEX idx_activite_niveau_activite ON public."ActiviteNiveau"("activite_id");
CREATE INDEX idx_activite_niveau_niveau ON public."ActiviteNiveau"("niveau_id");
