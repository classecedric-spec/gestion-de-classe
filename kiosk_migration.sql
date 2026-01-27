-- =============================================================================
-- KIOSK ACCESS CONTROL MIGRATION
-- =============================================================================
-- Run this script in the Supabase SQL Editor.
-- 1. Add 'kiosk_is_open' column to CompteUtilisateur (Teacher Profile)
ALTER TABLE public."CompteUtilisateur"
ADD COLUMN IF NOT EXISTS kiosk_is_open BOOLEAN DEFAULT FALSE;
-- 2. Create RPC to check kiosk status safely from Student Kiosk
-- This function allows the student view (even if public/anon) to check their teacher's kiosk status.
CREATE OR REPLACE FUNCTION public.get_kiosk_status(p_student_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER -- Runs as superuser/owner to read CompteUtilisateur regardless of RLS
    AS $$
DECLARE v_teacher_id UUID;
v_is_open BOOLEAN;
BEGIN -- 1. Identify the teacher (user_id) linked to this student
SELECT user_id INTO v_teacher_id
FROM public."Eleve"
WHERE id = p_student_id;
IF v_teacher_id IS NULL THEN -- Link not found, default to closed
RETURN FALSE;
END IF;
-- 2. Retrieve the kiosk status from the teacher's profile
SELECT kiosk_is_open INTO v_is_open
FROM public."CompteUtilisateur"
WHERE id = v_teacher_id;
-- Default to FALSE if null
RETURN COALESCE(v_is_open, FALSE);
END;
$$;
-- 3. Auto-Close Mechanism (Daily at 15:30)
-- Requires 'pg_cron' extension. If this fails, enable the extension in Dashboard -> Database -> Extensions.
-- Uncomment the lines below to enable:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('kiosk-auto-close', '30 15 * * *', $$UPDATE public."CompteUtilisateur" SET kiosk_is_open = false$$);
-- =============================================================================
-- End of Script
-- =============================================================================