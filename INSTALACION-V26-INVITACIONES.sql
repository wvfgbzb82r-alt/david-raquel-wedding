-- =========================================================
-- DAVID & RAQUEL · V26 INVITACIONES PERSONALIZADAS
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.invitaciones_personalizadas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null
    default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  nombre_mostrado text not null,
  telefono text,
  max_personas integer not null default 1
    check (max_personas between 1 and 20),
  activa boolean not null default true,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invitaciones_personalizadas
enable row level security;

grant select, insert, update, delete
on table public.invitaciones_personalizadas
to authenticated;

drop policy if exists "solo novios gestionan invitaciones"
on public.invitaciones_personalizadas;

create policy "solo novios gestionan invitaciones"
on public.invitaciones_personalizadas
for all
to authenticated
using (
  auth.uid() =
  '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
)
with check (
  auth.uid() =
  '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
);

create or replace function public.abrir_invitacion_personalizada(
  codigo_recibido text
)
returns table (
  nombre_mostrado text,
  max_personas integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.invitaciones_personalizadas
  set opened_at = coalesce(opened_at, now())
  where codigo = upper(btrim(codigo_recibido))
    and activa = true;

  return query
  select
    i.nombre_mostrado,
    i.max_personas
  from public.invitaciones_personalizadas i
  where i.codigo = upper(btrim(codigo_recibido))
    and i.activa = true
  limit 1;
end;
$$;

revoke all
on function public.abrir_invitacion_personalizada(text)
from public;

grant execute
on function public.abrir_invitacion_personalizada(text)
to anon, authenticated;

notify pgrst, 'reload schema';

select
  'tabla_invitaciones' as comprobacion,
  case
    when to_regclass(
      'public.invitaciones_personalizadas'
    ) is not null
    then 'OK'
    else 'FALTA'
  end as estado

union all

select
  'funcion_apertura',
  case
    when to_regprocedure(
      'public.abrir_invitacion_personalizada(text)'
    ) is not null
    then 'OK'
    else 'FALTA'
  end;
