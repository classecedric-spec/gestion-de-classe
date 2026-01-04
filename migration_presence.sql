
-- 1. Table de configuration des sets de présence (ex: Cantine, Ateliers, etc.)
create table if not exists public."SetupPresence" (
  id uuid default gen_random_uuid() primary key,
  nom text not null, -- "Cantine", "Atelier Matin"
  description text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table des catégories possibles par set (ex: Table 1, Table 2 / OU / Plat 1, Plat 2)
create table if not exists public."CategoriePresence" (
  id uuid default gen_random_uuid() primary key,
  nom text not null, -- "Table Bleue", "Table Rouge", "Absent"
  couleur text default '#3B82F6', -- Pour l'affichage UI
  setup_id uuid references public."SetupPresence"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Table des présences effectives (Logs)
create table if not exists public."Attendance" (
  id uuid default gen_random_uuid() primary key,
  date date default CURRENT_DATE not null,
  eleve_id uuid references public."Eleve"(id) on delete cascade,
  setup_id uuid references public."SetupPresence"(id) on delete set null,
  categorie_id uuid references public."CategoriePresence"(id) on delete set null,
  status text not null, -- 'present', 'absent'
  user_id uuid references auth.users(id), -- Professeur qui a noté
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public."SetupPresence" enable row level security;
alter table public."CategoriePresence" enable row level security;
alter table public."Attendance" enable row level security;

-- Policies SetupPresence
create policy "Users can manage own SetupPresence" on public."SetupPresence" 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

-- Policies CategoriePresence
create policy "Users can manage own CategoriePresence" on public."CategoriePresence" 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

-- Policies Attendance
create policy "Users can manage own Attendance" on public."Attendance" 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

