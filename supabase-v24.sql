-- DAVID & RAQUEL · V24 ESTABLE
-- Ejecuta TODO el archivo en Supabase > SQL Editor > Run.
-- No borra tablas antiguas ni respuestas existentes.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. CONFIRMACIONES: tabla limpia + función pública controlada
-- =========================================================

create table if not exists public.confirmaciones_v24 (
  id bigint generated always as identity primary key,
  nombre text not null,
  telefono text,
  asistencia text not null,
  acompanante text,
  alergias text,
  comentarios text,
  created_at timestamptz not null default now()
);

alter table public.confirmaciones_v24 enable row level security;
revoke all on table public.confirmaciones_v24 from anon;
grant select on table public.confirmaciones_v24 to authenticated;

drop policy if exists "solo novios leen confirmaciones v24" on public.confirmaciones_v24;
create policy "solo novios leen confirmaciones v24"
on public.confirmaciones_v24
for select
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

create or replace function public.guardar_confirmacion_v24(datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  nueva_id bigint;
  nombre_limpio text := nullif(btrim(coalesce(datos->>'nombre','')), '');
  asistencia_limpia text := nullif(btrim(coalesce(datos->>'asistencia','')), '');
begin
  if nombre_limpio is null then
    raise exception 'El nombre es obligatorio';
  end if;
  if asistencia_limpia is null then
    raise exception 'La asistencia es obligatoria';
  end if;

  insert into public.confirmaciones_v24
    (nombre, telefono, asistencia, acompanante, alergias, comentarios)
  values
    (nombre_limpio,
     nullif(btrim(coalesce(datos->>'telefono','')), ''),
     asistencia_limpia,
     nullif(btrim(coalesce(datos->>'acompanante','')), ''),
     nullif(btrim(coalesce(datos->>'alergias','')), ''),
     nullif(btrim(coalesce(datos->>'comentarios','')), ''))
  returning id into nueva_id;

  return jsonb_build_object('ok', true, 'id', nueva_id);
end;
$$;

revoke all on function public.guardar_confirmacion_v24(jsonb) from public;
grant execute on function public.guardar_confirmacion_v24(jsonb) to anon, authenticated;

-- =========================================================
-- 2. FOTOS: bucket privado nuevo y tabla de metadatos nueva
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-media-v24',
  'wedding-media-v24',
  false,
  104857600,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'video/mp4','video/quicktime'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_uploads_v24 (
  id uuid primary key default gen_random_uuid(),
  object_path text unique not null,
  uploader_name text,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.media_uploads_v24 enable row level security;
grant insert on table public.media_uploads_v24 to anon;
grant select, delete on table public.media_uploads_v24 to authenticated;

drop policy if exists "invitados registran archivos v24" on public.media_uploads_v24;
create policy "invitados registran archivos v24"
on public.media_uploads_v24
for insert
to anon
with check (true);

drop policy if exists "solo novios leen archivos v24" on public.media_uploads_v24;
create policy "solo novios leen archivos v24"
on public.media_uploads_v24
for select
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "solo novios borran registros v24" on public.media_uploads_v24;
create policy "solo novios borran registros v24"
on public.media_uploads_v24
for delete
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

-- Los invitados solo pueden crear objetos dentro de uploads/.
drop policy if exists "invitados suben recuerdos v24" on storage.objects;
create policy "invitados suben recuerdos v24"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'wedding-media-v24'
  and (storage.foldername(name))[1] = 'uploads'
);

-- Solo los novios pueden ver, descargar o borrar objetos.
drop policy if exists "solo novios ven recuerdos v24" on storage.objects;
create policy "solo novios ven recuerdos v24"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'wedding-media-v24'
  and auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
);

drop policy if exists "solo novios borran recuerdos v24" on storage.objects;
create policy "solo novios borran recuerdos v24"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'wedding-media-v24'
  and auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
);

-- =========================================================
-- 3. COMPROBACIÓN FINAL
-- Deben aparecer tres filas con estado OK.
-- =========================================================

select 'tabla_confirmaciones' as comprobacion,
       case when to_regclass('public.confirmaciones_v24') is not null then 'OK' else 'FALTA' end as estado
union all
select 'funcion_confirmacion',
       case when to_regprocedure('public.guardar_confirmacion_v24(jsonb)') is not null then 'OK' else 'FALTA' end
union all
select 'bucket_fotos',
       case when exists(select 1 from storage.buckets where id='wedding-media-v24') then 'OK' else 'FALTA' end;
