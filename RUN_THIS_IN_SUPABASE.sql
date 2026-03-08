-- COPIEZ TOUT LE CONTENU CI-DESSOUS
-- ALLEZ DANS VOTRE TABLEAU DE BORD SUPABASE > SQL EDITOR
-- COLLEZ ET CLIQUEZ SUR "RUN"
alter table "public"."CompteUtilisateur"
add column if not exists "brevo_api_key" text;
-- Vérification (Optionnel)
select brevo_api_key
from "CompteUtilisateur"
limit 1;