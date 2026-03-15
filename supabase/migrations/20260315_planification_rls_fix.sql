-- =============================================
-- FIX: Politiques RLS pour PlanificationHebdo
-- Permet au prof authentifié de lire/écrire/supprimer
-- =============================================

-- Activer RLS
ALTER TABLE "PlanificationHebdo" ENABLE ROW LEVEL SECURITY;

-- Politique: Le prof authentifié peut tout faire
CREATE POLICY "Authenticated users can manage PlanificationHebdo"
ON "PlanificationHebdo"
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Politique: Accès anonyme en lecture (pour le kiosque via RPC, mais au cas où)
CREATE POLICY "Anon can read PlanificationHebdo"
ON "PlanificationHebdo"
FOR SELECT
USING (true);
