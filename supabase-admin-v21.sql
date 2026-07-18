-- Ejecutar una sola vez en Supabase > SQL Editor
alter table public.invitados enable row level security;

grant insert on table public.invitados to anon;
grant select on table public.invitados to authenticated;

drop policy if exists "permitir confirmaciones" on public.invitados;
create policy "permitir confirmaciones"
on public.invitados
for insert
to anon
with check (true);

drop policy if exists "solo novios pueden leer" on public.invitados;
create policy "solo novios pueden leer"
on public.invitados
for select
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);
