-- ========================================
-- MIGRATION: Enable RLS on all tables
-- Date: 2026-01-22
-- Description: Secures all tables by enabling RLS and adding owner-only policies.
-- SAFE MODE: Checks if policy exists before creating (using DROP IF EXISTS)
-- ========================================
-- ========================================
-- 1. TABLES AVEC PROPRIÉTAIRE DIRECT (user_id)
-- ========================================
-- Table: Activite
ALTER TABLE "Activite" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own activities" ON "Activite";
CREATE POLICY "Users can manage their own activities" ON "Activite" FOR ALL USING (auth.uid() = user_id);
-- Table: Branche
ALTER TABLE "Branche" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own branches" ON "Branche";
CREATE POLICY "Users can manage their own branches" ON "Branche" FOR ALL USING (auth.uid() = user_id);
-- Table: Classe
ALTER TABLE "Classe" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own classes" ON "Classe";
CREATE POLICY "Users can manage their own classes" ON "Classe" FOR ALL USING (
    -- Essaie de matcher auth.uid (cas probable selon le code React)
    titulaire_id = auth.uid()::uuid -- Si titulaire_id est lié à Adulte.id, décommentez ceci:
    -- OR titulaire_id IN (SELECT id FROM "Adulte" WHERE user_id = auth.uid())
);
-- Table: Eleve
ALTER TABLE "Eleve" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own students" ON "Eleve";
CREATE POLICY "Users can manage their own students" ON "Eleve" FOR ALL USING (
    -- Code React utilise .eq('titulaire_id', user.id) donc auth.uid() est correct
    titulaire_id = auth.uid()::uuid
);
-- Table: Groupe
ALTER TABLE "Groupe" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own groups" ON "Groupe";
CREATE POLICY "Users can manage their own groups" ON "Groupe" FOR ALL USING (auth.uid() = user_id);
-- Table: Module
ALTER TABLE "Module" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own modules" ON "Module";
CREATE POLICY "Users can manage their own modules" ON "Module" FOR ALL USING (auth.uid() = user_id);
-- Table: Niveau
ALTER TABLE "Niveau" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own levels" ON "Niveau";
CREATE POLICY "Users can manage their own levels" ON "Niveau" FOR ALL USING (auth.uid() = user_id);
-- Table: SousBranche
ALTER TABLE "SousBranche" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sub-branches" ON "SousBranche";
CREATE POLICY "Users can manage their own sub-branches" ON "SousBranche" FOR ALL USING (auth.uid() = user_id);
-- Table: TypeMateriel
ALTER TABLE "TypeMateriel" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own material types" ON "TypeMateriel";
CREATE POLICY "Users can manage their own material types" ON "TypeMateriel" FOR ALL USING (auth.uid() = user_id);
-- Table: SetupPresence
ALTER TABLE "SetupPresence" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own presence setups" ON "SetupPresence";
CREATE POLICY "Users can manage their own presence setups" ON "SetupPresence" FOR ALL USING (auth.uid() = user_id);
-- Table: CategoriePresence
ALTER TABLE "CategoriePresence" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own presence categories" ON "CategoriePresence";
CREATE POLICY "Users can manage their own presence categories" ON "CategoriePresence" FOR ALL USING (auth.uid() = user_id);
-- Table: Attendance
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own attendance records" ON "Attendance";
CREATE POLICY "Users can manage their own attendance records" ON "Attendance" FOR ALL USING (auth.uid() = user_id);
-- Table: UserPreference
ALTER TABLE "UserPreference" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON "UserPreference";
CREATE POLICY "Users can manage their own preferences" ON "UserPreference" FOR ALL USING (auth.uid() = user_id);
-- Table: weekly_planning
ALTER TABLE "weekly_planning" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own weekly planning" ON "weekly_planning";
CREATE POLICY "Users can manage their own weekly planning" ON "weekly_planning" FOR ALL USING (auth.uid() = user_id);
-- Table: EleveGroupe
ALTER TABLE "EleveGroupe" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own student-group links" ON "EleveGroupe";
CREATE POLICY "Users can manage their own student-group links" ON "EleveGroupe" FOR ALL USING (auth.uid() = user_id);
-- Table: CompteUtilisateur (basé sur ID)
ALTER TABLE "CompteUtilisateur" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own account" ON "CompteUtilisateur";
CREATE POLICY "Users can manage their own account" ON "CompteUtilisateur" FOR ALL USING (auth.uid() = id);
-- ========================================
-- 2. TABLES AVEC RELATION INDIRECTE
-- ========================================
-- Table: ClasseAdulte (jointure Classe - Adulte)
ALTER TABLE "ClasseAdulte" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their class-adult links" ON "ClasseAdulte";
CREATE POLICY "Users can manage their class-adult links" ON "ClasseAdulte" FOR ALL USING (
    classe_id IN (
        SELECT id
        FROM "Classe"
        WHERE titulaire_id = auth.uid()::uuid
    )
);
-- Table: ActiviteMateriel (jointure Activite - TypeMateriel)
ALTER TABLE "ActiviteMateriel" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their activity-material links" ON "ActiviteMateriel";
CREATE POLICY "Users can manage their activity-material links" ON "ActiviteMateriel" FOR ALL USING (
    activite_id IN (
        SELECT id
        FROM "Activite"
        WHERE user_id = auth.uid()
    )
);
-- Table: ActiviteNiveau (jointure Activite - Niveau)
ALTER TABLE "ActiviteNiveau" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their activity-level links" ON "ActiviteNiveau";
CREATE POLICY "Users can manage their activity-level links" ON "ActiviteNiveau" FOR ALL USING (
    activite_id IN (
        SELECT id
        FROM "Activite"
        WHERE user_id = auth.uid()
    )
);
-- Table: Progression (Suivi élève)
ALTER TABLE "Progression" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage progressions of their students" ON "Progression";
CREATE POLICY "Users can manage progressions of their students" ON "Progression" FOR ALL USING (
    eleve_id IN (
        SELECT id
        FROM "Eleve"
        WHERE titulaire_id = auth.uid()::uuid
    )
);