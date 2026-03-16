-- =============================================================================
-- KIOSK FULL DATA RPC
-- =============================================================================
-- This migration provides a secure way for students to fetch modules 
-- and activities without needing direct table read permissions.

-- 1. get_kiosk_modules_activities
-- Retrieves all active modules and their activities for a student,
-- filtering by the student's level and including branch info.
CREATE OR REPLACE FUNCTION public.get_kiosk_modules_activities(p_student_id UUID, p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_niveau_id UUID;
    v_result JSONB;
BEGIN
    -- Verify token and get student level
    SELECT niveau_id INTO v_niveau_id
    FROM "Eleve"
    WHERE id = p_student_id AND access_token::TEXT = p_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    -- Build the complex JSON structure
    SELECT jsonb_agg(m_data) INTO v_result
    FROM (
        SELECT 
            jsonb_build_object(
                'id', m.id,
                'nom', m.nom,
                'date_fin', m.date_fin,
                'statut', m.statut,
                'SousBranche', jsonb_build_object(
                    'nom', sb.nom,
                    'Branche', jsonb_build_object('nom', b.nom, 'ordre', b.ordre)
                ),
                'Activite', (
                    SELECT jsonb_agg(act_data)
                    FROM (
                        SELECT 
                            a.id,
                            a.titre,
                            a.ordre,
                            (
                                SELECT jsonb_agg(an.niveau_id)
                                FROM "ActiviteNiveau" an
                                WHERE an.activite_id = a.id
                            ) as levels
                        FROM "Activite" a
                        WHERE a.module_id = m.id
                        -- Filter by level if restriction exists
                        AND (
                            NOT EXISTS (SELECT 1 FROM "ActiviteNiveau" an WHERE an.activite_id = a.id)
                            OR EXISTS (SELECT 1 FROM "ActiviteNiveau" an WHERE an.activite_id = a.id AND an.niveau_id = v_niveau_id)
                        )
                        ORDER BY a.ordre
                    ) act_data
                )
            ) as m_data
        FROM "Module" m
        JOIN "SousBranche" sb ON m.sous_branche_id = sb.id
        JOIN "Branche" b ON sb.branche_id = b.id
        WHERE m.statut = 'en_cours'
        ORDER BY m.nom
    ) sub;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- 2. get_kiosk_planning_status
-- Replaces previous partial implementation if necessary, 
-- ensuring we check the correct boolean on CompteUtilisateur.
CREATE OR REPLACE FUNCTION public.get_kiosk_planning_status(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM "Eleve" e
        JOIN "CompteUtilisateur" u ON e.titulaire_id = u.id
        WHERE e.id = p_student_id AND u.kiosk_planning_open = true
    );
END;
$$;

-- 3. get_kiosk_status (Standard for Encodage Kiosk)
CREATE OR REPLACE FUNCTION public.get_kiosk_status(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM "Eleve" e
        JOIN "CompteUtilisateur" u ON e.titulaire_id = u.id
        WHERE e.id = p_student_id AND u.kiosk_is_open = true
    );
END;
$$;

-- 4. Grant Permissions
GRANT EXECUTE ON FUNCTION public.get_kiosk_modules_activities(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kiosk_planning_status(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kiosk_status(UUID) TO anon, authenticated;
