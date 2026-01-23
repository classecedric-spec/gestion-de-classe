/// <reference types="vite/client" />
import { supabase } from '../database';

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


export const SETUP_SQL: string = `-- =============================================================================
-- GESTION DE CLASSE - Database Schema Setup
-- =============================================================================
-- ATTENTION: Ce script est destiné à la création initiale de la base de données.
-- Pour les mises à jour, utilisez les migrations Supabase.
-- Dernière mise à jour: 2026-01-22 (Migration vers photo_url, suppression photo_base64)
-- =============================================================================

-- 1. Tables de base

create table if not exists public."CompteUtilisateur" (
  id uuid references auth.users not null primary key,
  email text,
  nom text,
  prenom text,
  telephone text,
  photo_url text, -- URL vers Supabase Storage
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public."Classe" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  acronyme text,
  logo_url text, -- URL vers Supabase Storage
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public."Groupe" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  acronyme text,
  photo_url text, -- URL vers Supabase Storage
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
  photo_url text, -- URL vers Supabase Storage
  
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
  user_id uuid references auth.users(id),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
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
create policy "Users can manage own Eleves" on public."Eleve" using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Tables pour la Gestion des Activités
-- =============================================================================

create table if not exists public."Branche" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  ordre integer default 0,
  couleur text,
  photo_url text, -- URL vers Supabase Storage
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public."SousBranche" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  ordre integer default 0,
  photo_url text, -- URL vers Supabase Storage
  branche_id uuid references public."Branche"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public."Module" (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  ordre integer default 0,
  isActive boolean default true,
  photo_url text, -- URL vers Supabase Storage
  sous_branche_id uuid references public."SousBranche"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public."Activite" (
  id uuid default gen_random_uuid() primary key,
  titre text not null,
  description text,
  ordre integer default 0,
  nombre_exercices integer default 1,
  nombre_erreurs integer default 1,
  statut_exigence text,
  photo_url text, -- URL vers Supabase Storage
  module_id uuid references public."Module"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Activation de la sécurité (RLS) pour les tables d'activités
alter table public."Branche" enable row level security;
alter table public."SousBranche" enable row level security;
alter table public."Module" enable row level security;
alter table public."Activite" enable row level security;

-- Politiques d'accès
create policy "Users can manage own Branches" on public."Branche" using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own SousBranches" on public."SousBranche" using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own Modules" on public."Module" using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own Activites" on public."Activite" using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 4. Trigger pour création automatique au signup
-- =============================================================================
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

