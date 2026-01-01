-- ⚠️ DANGER : CE SCRIPT SUPPRIME TOUT ⚠️
-- Exécutez ce script dans l'éditeur SQL de Supabase pour repartir de zéro.

-- 1. Nettoyage : Suppression des tables existantes (Cascade pour les clés étrangères)
DROP TABLE IF EXISTS public."Activite" CASCADE;
DROP TABLE IF EXISTS public."SousBranche" CASCADE;
DROP TABLE IF EXISTS public."Branche" CASCADE;
DROP TABLE IF EXISTS public."SousDomaine" CASCADE;
DROP TABLE IF EXISTS public."Eleve" CASCADE;
DROP TABLE IF EXISTS public."Groupe" CASCADE;
DROP TABLE IF EXISTS public."Classe" CASCADE;
DROP TABLE IF EXISTS public."CompteUtilisateur" CASCADE;

-- 2. Nettoyage : Suppression de TOUS les utilisateurs authentifiés
-- Cela empêchera les anciennes connexions de fonctionner (Ghost Login)
DELETE FROM auth.users;

-- 3. Reconstruction : Création des tables propres
-- (Ceci est une copie propre de votre SETUP_SQL)

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

-- Activation de la sécurité (RLS)
alter table public."CompteUtilisateur" enable row level security;
alter table public."Classe" enable row level security;
alter table public."Groupe" enable row level security;
alter table public."Eleve" enable row level security;

-- Politiques d'accès
create policy "Users can view all profiles" on public."CompteUtilisateur" for select using (true);
create policy "Users can update own profile" on public."CompteUtilisateur" for update using (auth.uid() = id);
create policy "Users can insert own profile" on public."CompteUtilisateur" for insert with check (auth.uid() = id);

create policy "Users can manage own Classes" on public."Classe" using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own Groupes" on public."Groupe" using (auth.uid() = user_id) with check (auth.uid() = user_id);
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

create table if not exists public."SousBranche" (
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
  sous_branche_id uuid references public."SousBranche"(id) on delete cascade,
  user_id uuid references auth.users(id),
  ordre integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public."SousDomaine" enable row level security;
alter table public."Branche" enable row level security;
alter table public."SousBranche" enable row level security;
alter table public."Activite" enable row level security;

create policy "Users can view shared or own SousDomaines" on public."SousDomaine" for select using (user_id is null or user_id = auth.uid());
create policy "Users can update own SousDomaines" on public."SousDomaine" for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can view shared or own Branches" on public."Branche" for select using (user_id is null or user_id = auth.uid());
create policy "Users can update own Branches" on public."Branche" for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage own SousBranche" on public."SousBranche" using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own Activites" on public."Activite" using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger pour création automatique au signup
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
