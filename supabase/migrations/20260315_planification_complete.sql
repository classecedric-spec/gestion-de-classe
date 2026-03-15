-- Migration Robuste pour Kiosque Planification
-- Corrige les erreurs 400 Bad Request en utilisant des types TEXT plus permissifs pour les signatures RPC

-- 1. Ajouter la colonne statut si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PlanificationHebdo' AND column_name = 'statut') THEN
        ALTER TABLE "PlanificationHebdo" ADD COLUMN statut TEXT DEFAULT 'non_demarre';
    END IF;
END $$;

-- 2. Nettoyer les anciennes fonctions (pour éviter les conflits de signature)
DROP FUNCTION IF EXISTS get_kiosk_planification(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS upsert_kiosk_planification(UUID, TEXT, DATE, JSONB);
DROP FUNCTION IF EXISTS get_kiosk_planning_status(UUID);
DROP FUNCTION IF EXISTS update_progression_from_kiosk(UUID, TEXT, UUID, TEXT);

-- 3. RPC: Récupérer la planification (signatures TEXT pour compatibilité maximale)
CREATE OR REPLACE FUNCTION get_kiosk_planification(
    p_student_id TEXT,
    p_token TEXT,
    p_semaine_debut TEXT
)
RETURNS TABLE (
    activite_id UUID,
    jour TEXT,
    lieu TEXT,
    statut TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier le token (cast safe)
    IF NOT EXISTS (
        SELECT 1 FROM "Eleve"
        WHERE id = p_student_id::UUID 
          AND access_token::TEXT = p_token
    ) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    RETURN QUERY
    SELECT ph.activite_id, ph.jour, ph.lieu, ph.statut
    FROM "PlanificationHebdo" ph
    WHERE ph.eleve_id = p_student_id::UUID
      AND ph.semaine_debut = p_semaine_debut::DATE;
END;
$$;

-- 4. RPC: Sauvegarder la planification
CREATE OR REPLACE FUNCTION upsert_kiosk_planification(
    p_student_id TEXT,
    p_token TEXT,
    p_semaine_debut TEXT,
    p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier le token
    IF NOT EXISTS (
        SELECT 1 FROM "Eleve"
        WHERE id = p_student_id::UUID 
          AND access_token::TEXT = p_token
    ) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    -- Supprimer les planifications existantes pour cette semaine
    DELETE FROM "PlanificationHebdo"
    WHERE eleve_id = p_student_id::UUID
      AND semaine_debut = p_semaine_debut::DATE;

    -- Insérer les nouvelles
    INSERT INTO "PlanificationHebdo" (eleve_id, activite_id, semaine_debut, jour, lieu, statut)
    SELECT
        p_student_id::UUID,
        (item->>'activite_id')::UUID,
        p_semaine_debut::DATE,
        item->>'jour',
        item->>'lieu',
        COALESCE(item->>'statut', 'non_demarre')
    FROM jsonb_array_elements(p_items) AS item;
END;
$$;

-- 5. RPC: Statut du kiosque
CREATE OR REPLACE FUNCTION get_kiosk_planning_status(p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT cu.kiosk_planning_open INTO result
    FROM "CompteUtilisateur" cu
    JOIN "Groupe" g ON g.user_id = cu.id
    JOIN "EleveGroupe" eg ON eg.groupe_id = g.id
    WHERE eg.eleve_id = p_student_id::UUID
    LIMIT 1;

    RETURN COALESCE(result, false);
END;
$$;

-- 6. RPC: Mettre à jour la progression
CREATE OR REPLACE FUNCTION update_progression_from_kiosk(
    p_student_id TEXT,
    p_token TEXT,
    p_activite_id TEXT,
    p_etat TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier le token
    IF NOT EXISTS (
        SELECT 1 FROM "Eleve"
        WHERE id = p_student_id::UUID 
          AND access_token::TEXT = p_token
    ) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    -- Upsert de la progression
    INSERT INTO "Progression" (eleve_id, activite_id, etat, updated_at)
    VALUES (p_student_id::UUID, p_activite_id::UUID, p_etat, now())
    ON CONFLICT (eleve_id, activite_id)
    DO UPDATE SET 
        etat = EXCLUDED.etat,
        updated_at = EXCLUDED.updated_at;
END;
$$;

-- 7. Accorder les permissions
GRANT EXECUTE ON FUNCTION get_kiosk_planification(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_kiosk_planification(TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_kiosk_planning_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_progression_from_kiosk(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
