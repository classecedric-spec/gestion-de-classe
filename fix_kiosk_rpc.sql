-- Script de correction pour le statut du kiosque (Version 2 - Correction de la relation élève-prof)
-- À exécuter dans l'éditeur SQL de Supabase
-- 1. On supprime l'ancienne fonction pour être sûr
DROP FUNCTION IF EXISTS public.get_kiosk_status(uuid);
-- 2. On la recrée en passant par la table EleveGroupe pour trouver le prof (via user_id)
CREATE OR REPLACE FUNCTION public.get_kiosk_status(p_student_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_teacher_id UUID;
v_is_open BOOLEAN;
BEGIN -- Trouve le prof de l'élève via la table de liaison EleveGroupe
-- On prend le premier user_id trouvé (normalement unique ou cohérent par classe)
SELECT user_id INTO v_teacher_id
FROM public."EleveGroupe"
WHERE eleve_id = p_student_id
LIMIT 1;
IF v_teacher_id IS NULL THEN -- Si aucun prof trouvé, on considère fermé par sécurité
RETURN FALSE;
END IF;
-- Vérifie le statut du prof trouvé
SELECT kiosk_is_open INTO v_is_open
FROM public."CompteUtilisateur"
WHERE id = v_teacher_id;
RETURN COALESCE(v_is_open, FALSE);
END;
$$;
-- 3. Droits d'exécution
GRANT EXECUTE ON FUNCTION public.get_kiosk_status(UUID) TO anon,
    authenticated,
    service_role;