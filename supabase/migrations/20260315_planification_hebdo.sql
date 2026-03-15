-- =============================================
-- MIGRATION: Kiosque Planification
-- Table PlanificationHebdo + RPCs pour accès token
-- =============================================

-- 1. Créer la table PlanificationHebdo
CREATE TABLE IF NOT EXISTS "PlanificationHebdo" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleve_id UUID NOT NULL REFERENCES "Eleve"(id) ON DELETE CASCADE,
    activite_id UUID NOT NULL REFERENCES "Activite"(id) ON DELETE CASCADE,
    semaine_debut DATE NOT NULL,
    jour TEXT NOT NULL CHECK (jour IN ('Lundi','Mardi','Mercredi','Jeudi','Vendredi')),
    lieu TEXT NOT NULL CHECK (lieu IN ('classe','domicile')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(eleve_id, activite_id, semaine_debut)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_planification_eleve_semaine 
    ON "PlanificationHebdo" (eleve_id, semaine_debut);

-- 2. RPC: Lire la planification d'un élève (accès token)
CREATE OR REPLACE FUNCTION get_kiosk_planification(
    p_student_id UUID,
    p_token TEXT,
    p_semaine_debut DATE
)
RETURNS TABLE (
    activite_id UUID,
    jour TEXT,
    lieu TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier le token
    IF NOT EXISTS (
        SELECT 1 FROM "Eleve"
        WHERE id = p_student_id AND access_token = p_token
    ) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    RETURN QUERY
    SELECT ph.activite_id, ph.jour, ph.lieu
    FROM "PlanificationHebdo" ph
    WHERE ph.eleve_id = p_student_id
      AND ph.semaine_debut = p_semaine_debut;
END;
$$;

-- 3. RPC: Sauvegarder la planification (accès token)
CREATE OR REPLACE FUNCTION upsert_kiosk_planification(
    p_student_id UUID,
    p_token TEXT,
    p_semaine_debut DATE,
    p_items JSONB  -- Array of {activite_id, jour, lieu}
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier le token
    IF NOT EXISTS (
        SELECT 1 FROM "Eleve"
        WHERE id = p_student_id AND access_token = p_token
    ) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    -- Supprimer les planifications existantes pour cette semaine
    DELETE FROM "PlanificationHebdo"
    WHERE eleve_id = p_student_id
      AND semaine_debut = p_semaine_debut;

    -- Insérer les nouvelles
    INSERT INTO "PlanificationHebdo" (eleve_id, activite_id, semaine_debut, jour, lieu)
    SELECT
        p_student_id,
        (item->>'activite_id')::UUID,
        p_semaine_debut,
        item->>'jour',
        item->>'lieu'
    FROM jsonb_array_elements(p_items) AS item;
END;
$$;

-- 4. Ajouter le champ kiosk_planning_open au profil prof (si pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'CompteUtilisateur' AND column_name = 'kiosk_planning_open'
    ) THEN
        ALTER TABLE "CompteUtilisateur" ADD COLUMN kiosk_planning_open BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 5. RPC: Vérifier si le kiosque planification est ouvert
CREATE OR REPLACE FUNCTION get_kiosk_planning_status(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT cu.kiosk_planning_open INTO result
    FROM "CompteUtilisateur" cu
    JOIN "Groupe" g ON g.compte_utilisateur_id = cu.id
    JOIN "EleveGroupe" eg ON eg.groupe_id = g.id
    WHERE eg.eleve_id = p_student_id
    LIMIT 1;

    RETURN COALESCE(result, false);
END;
$$;
