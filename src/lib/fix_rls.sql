-- Fix RLS for Classe
alter table public."Classe" enable row level security;

drop policy if exists "Public read for all" on public."Classe";
drop policy if exists "Public insert for all" on public."Classe";
drop policy if exists "Public update for all" on public."Classe";
drop policy if exists "Public delete for all" on public."Classe";

create policy "Public read for all" on public."Classe" for select using (true);
create policy "Public insert for all" on public."Classe" for insert with check (true);
create policy "Public update for all" on public."Classe" for update using (true);
create policy "Public delete for all" on public."Classe" for delete using (true);

-- Fix RLS for Groupe
alter table public."Groupe" enable row level security;

drop policy if exists "Public read for all" on public."Groupe";
drop policy if exists "Public insert for all" on public."Groupe";
drop policy if exists "Public update for all" on public."Groupe";
drop policy if exists "Public delete for all" on public."Groupe";

create policy "Public read for all" on public."Groupe" for select using (true);
create policy "Public insert for all" on public."Groupe" for insert with check (true);
create policy "Public update for all" on public."Groupe" for update using (true);
create policy "Public delete for all" on public."Groupe" for delete using (true);

-- Fix RLS for Eleve
alter table public."Eleve" enable row level security;

drop policy if exists "Public read for all" on public."Eleve";
drop policy if exists "Public insert for all" on public."Eleve";
drop policy if exists "Public update for all" on public."Eleve";
drop policy if exists "Public delete for all" on public."Eleve";

create policy "Public read for all" on public."Eleve" for select using (true);
create policy "Public insert for all" on public."Eleve" for insert with check (true);
create policy "Public update for all" on public."Eleve" for update using (true);
create policy "Public delete for all" on public."Eleve" for delete using (true);
