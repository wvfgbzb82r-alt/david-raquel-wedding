alter table public.invitados enable row level security;
grant insert on table public.invitados to anon;
grant select on table public.invitados to authenticated;
drop policy if exists "admin puede leer confirmaciones" on public.invitados;
create policy "admin puede leer confirmaciones" on public.invitados for select to authenticated using (true);
