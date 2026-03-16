-- =============================================================================
-- KIOSK RPC CONSOLIDATION MIGRATION
-- =============================================================================
-- Standardizes parameter names and ensures all required RPCs for Kiosk are present.
-- Execute this in the Supabase SQL Editor.

-- 1. get_kiosk_student_data
-- Retrieves basic student info securely using the access token.
CREATE OR REPLACE FUNCTION public.get_kiosk_student_data(p_student_id UUID, p_token TEXT)
RETURNS TABLE (student JSONB) 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'id', id,
        'nom', nom,
        'prenom', prenom,
        'photo_url', photo_url,
        'niveau_id', niveau_id
    )
    FROM "Eleve"
    WHERE id = p_student_id AND access_token::TEXT = p_token;
END;
$$;

-- 2. get_kiosk_progressions
-- Retrieves all progressions for a student securely.
CREATE OR REPLACE FUNCTION public.get_kiosk_progressions(p_student_id UUID, p_token TEXT)
RETURNS TABLE (activite_id UUID, etat TEXT)
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Verify token
    IF NOT EXISTS (SELECT 1 FROM "Eleve" WHERE id = p_student_id AND access_token::TEXT = p_token) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    RETURN QUERY
    SELECT p.activite_id, p.etat
    FROM "Progression" p
    WHERE p.eleve_id = p_student_id;
END;
$$;

-- 3. update_kiosk_progression
-- Allows students to update their own activity status.
CREATE OR REPLACE FUNCTION public.update_kiosk_progression(
    p_student_id UUID, 
    p_activity_id UUID, 
    p_token TEXT, 
    p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Verify token
    IF NOT EXISTS (SELECT 1 FROM "Eleve" WHERE id = p_student_id AND access_token::TEXT = p_token) THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    INSERT INTO "Progression" (eleve_id, activite_id, etat, updated_at)
    VALUES (p_student_id, p_activity_id, p_status, now())
    ON CONFLICT (eleve_id, activite_id)
    DO UPDATE SET 
        etat = EXCLUDED.etat,
        updated_at = EXCLUDED.updated_at;
END;
$$;

-- 4. Grant Permissions
GRANT EXECUTE ON FUNCTION public.get_kiosk_student_data(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kiosk_progressions(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_kiosk_progression(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- =============================================================================
-- End of Migration
-- =============================================================================
