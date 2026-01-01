-- 1. Create Join Table
create table if not exists public."EleveGroupe" (
  id uuid default gen_random_uuid() primary key,
  eleve_id uuid references public."Eleve"(id) on delete cascade,
  groupe_id uuid references public."Groupe"(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(eleve_id, groupe_id)
);

-- 2. Enable RLS
alter table public."EleveGroupe" enable row level security;

-- 3. RLS Policies
create policy "Users can view own EleveGroupe" on public."EleveGroupe" for select using (auth.uid() = user_id);
create policy "Users can insert own EleveGroupe" on public."EleveGroupe" for insert with check (auth.uid() = user_id);
create policy "Users can update own EleveGroupe" on public."EleveGroupe" for update using (auth.uid() = user_id);
create policy "Users can delete own EleveGroupe" on public."EleveGroupe" for delete using (auth.uid() = user_id);

-- 4. Migrate existing data (if any)
-- Insert a record in EleveGroupe for each Eleve that has a groupe_id
insert into public."EleveGroupe" (eleve_id, groupe_id, user_id)
select id, groupe_id, titulaire_id 
from public."Eleve" 
where groupe_id is not null;

-- 5. Drop old column (Optional for now, but recommended to avoid confusion)
-- alter table public."Eleve" drop column groupe_id;
-- Keeping it temporarily might break less things immediately, but we should stop using it.
-- Let's drop it to force errors and find all usages.
alter table public."Eleve" drop column groupe_id;
