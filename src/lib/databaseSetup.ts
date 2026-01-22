/// <reference types="vite/client" />
import { supabase } from './supabaseClient';

export interface SetupVerificationResult {
    exists: boolean;
    errorType: 'CONFIG_MISSING' | 'API_KEY' | 'TABLE_MISSING' | 'UNKNOWN' | null;
    message: string | null;
    rawError: any | null;
}

/**
 * Vérifie si la table CompteUtilisateur existe.
 * Comme on ne peut pas créer de table directement depuis le frontend (sécurité Supabase),
 * on renvoie une erreur claire si elle manque.
 */
export const checkDatabaseSetup = async (): Promise<SetupVerificationResult> => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return { exists: false, errorType: 'CONFIG_MISSING', message: "Configuration .env.local manquante", rawError: null };
    }
    try {
        // Liste des tables requises pour le projet
        const requiredTables = ['CompteUtilisateur', 'Classe', 'Groupe', 'Eleve'];

        for (const table of requiredTables) {
            let { error } = await supabase
                .from(table as any)
                .select('id')
                .limit(1);

            // Fallback pour la casse
            if (error && (error as any).code === '42P01') {
                const fallback = await supabase
                    .from(table.toLowerCase() as any)
                    .select('id')
                    .limit(1);
                if (!fallback.error || (fallback.error as any).code !== '42P01') {
                    error = fallback.error;
                }
            }

            if (error) {
                if (error.message?.includes('API key') || (error as any).code === 'PGRST301' || (error as any).status === 401) {
                    return { exists: false, errorType: 'API_KEY', message: "Clé API Supabase invalide ou non autorisée", rawError: error };
                }

                if ((error as any).code === '42P01') {
                    return { exists: false, errorType: 'TABLE_MISSING', message: `Table ${table} manquante`, rawError: error };
                }

                if ((error as any).code !== 'PGRST116') {
                    return { exists: false, errorType: 'UNKNOWN', message: error.message, rawError: error };
                }
            }
        }

        return { exists: true, errorType: null, message: null, rawError: null };
    } catch (err: any) {
        return { exists: false, errorType: 'UNKNOWN', message: err.message, rawError: err };
    }
};


export const SETUP_SQL: string = `-- 1. Création des tables de base (reset)
-- ATTENTION: Ceci ne supprime pas les tables existantes, utilisez DROP TABLE si nécessaire.

create table if not exists public."CompteUtilisateur" (
  id uuid references auth.users not null primary key,
  email text,
  nom text,
  prenom text,
  telephone text,
  photo_base64 text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Classe" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  acronyme text,
  logo_url text,
  photo_base64 text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Groupe" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  acronyme text,
  photo_base64 text,
  classe_id uuid references public."Classe"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Eleve" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  prenom text not null,
  date_naissance date,
  annee_inscription integer,
  sex text, 
  photo_base64 text,
  
  -- Parents
  parent1_nom text,
  parent1_prenom text,
  parent1_email text,
  parent1_telephone text,
  parent2_nom text,
  parent2_prenom text,
  parent2_email text,
  parent2_telephone text,

  -- Foreign Keys
  classe_id uuid references public."Classe"(id) on delete set null,
  groupe_id uuid references public."Groupe"(id) on delete set null,
  titulaire_id uuid references public."CompteUtilisateur"(id),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Activation de la sécurité (RLS)
alter table public."CompteUtilisateur" enable row level security;
alter table public."Classe" enable row level security;
alter table public."Groupe" enable row level security;
alter table public."Eleve" enable row level security;

-- 3. Politiques d'accès (STRICTES)

-- Policies for CompteUtilisateur
create policy "Users can view all profiles" on public."CompteUtilisateur" for select using (true);
create policy "Users can update own profile" on public."CompteUtilisateur" for update using (auth.uid() = id);
create policy "Users can insert own profile" on public."CompteUtilisateur" for insert with check (auth.uid() = id);

-- Policies for Classe
create policy "Users can manage own Classes" on public."Classe" using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Policies for Groupe
create policy "Users can manage own Groupes" on public."Groupe" using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Policies for Eleve
create policy "Users can manage own Eleves" on public."Eleve" using (auth.uid() = titulaire_id) with check (auth.uid() = titulaire_id);

-- Tables pour la Gestion des Activités

create table if not exists public."SousDomaine" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  photo_base64 text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Branche" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  photo_base64 text,
  sous_domaine_id uuid references public."SousDomaine"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Module" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  photo_base64 text,
  branche_id uuid references public."Branche"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Activite" (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  description text,
  photo_base64 text,
  module_id uuid references public."Module"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activation de la sécurité (RLS) pour les nouvelles tables
alter table public."SousDomaine" enable row level security;
alter table public."Branche" enable row level security;
alter table public."Module" enable row level security;
alter table public."Activite" enable row level security;

-- Politiques d'accès (STRICTES)
create policy "Users can view shared or own SousDomaines" on public."SousDomaine" for select using (user_id is null or user_id = auth.uid());
create policy "Users can update own SousDomaines" on public."SousDomaine" for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can view shared or own Branches" on public."Branche" for select using (user_id is null or user_id = auth.uid());
create policy "Users can update own Branches" on public."Branche" for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can manage own Modules" on public."Module" using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own Activites" on public."Activite" using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Trigger pour création automatique au signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public."CompteUtilisateur" (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;
