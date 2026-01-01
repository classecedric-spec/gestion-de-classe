
create table if not exists public."Niveau" (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  ordre integer default 0,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public."Niveau" enable row level security;

drop policy if exists "Users can manage own Niveaux" on public."Niveau";

create policy "Users can view own Niveaux" on public."Niveau" for select using (auth.uid() = user_id);
create policy "Users can insert own Niveaux" on public."Niveau" for insert with check (auth.uid() = user_id);
create policy "Users can update own Niveaux" on public."Niveau" for update using (auth.uid() = user_id);
create policy "Users can delete own Niveaux" on public."Niveau" for delete using (auth.uid() = user_id);

alter table public."Eleve" add column if not exists niveau_id uuid references public."Niveau"(id) on delete set null;
