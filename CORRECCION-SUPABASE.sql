-- DAVID & RAQUEL · CORRECCIÓN DEFINITIVA DE INTEGRACIÓN
-- Ejecuta TODO este archivo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- 1) CONFIRMACIONES
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
grant usage on schema public to anon, authenticated;
grant select on table public.confirmaciones_v24 to authenticated;

create or replace function public.guardar_confirmacion_v24(datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nueva_id bigint;
  nombre_limpio text := nullif(btrim(coalesce(datos->>'nombre','')), '');
  asistencia_limpia text := nullif(btrim(coalesce(datos->>'asistencia','')), '');
begin
  if nombre_limpio is null then raise exception 'El nombre es obligatorio'; end if;
  if asistencia_limpia is null then raise exception 'La asistencia es obligatoria'; end if;

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

-- Solo el usuario administrador puede leer confirmaciones.
drop policy if exists "solo novios leen confirmaciones v24" on public.confirmaciones_v24;
create policy "solo novios leen confirmaciones v24"
on public.confirmaciones_v24 for select to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

-- 2) ÁLBUM PRIVADO
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-media-v24', 'wedding-media-v24', false, 104857600,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

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
on public.media_uploads_v24 for insert to anon with check (true);

drop policy if exists "solo novios leen archivos v24" on public.media_uploads_v24;
create policy "solo novios leen archivos v24"
on public.media_uploads_v24 for select to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "invitados suben recuerdos v24" on storage.objects;
create policy "invitados suben recuerdos v24"
on storage.objects for insert to anon
with check (bucket_id='wedding-media-v24' and (storage.foldername(name))[1]='uploads');

drop policy if exists "solo novios ven recuerdos v24" on storage.objects;
create policy "solo novios ven recuerdos v24"
on storage.objects for select to authenticated
using (bucket_id='wedding-media-v24' and auth.uid()='3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "solo novios borran recuerdos v24" on storage.objects;
create policy "solo novios borran recuerdos v24"
on storage.objects for delete to authenticated
using (bucket_id='wedding-media-v24' and auth.uid()='3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

-- Obliga a PostgREST a actualizar su caché de funciones/tablas.
notify pgrst, 'reload schema';

-- COMPROBACIÓN: las cuatro filas deben mostrar OK.
select 'tabla_confirmaciones' comprobacion,
       case when to_regclass('public.confirmaciones_v24') is not null then 'OK' else 'FALTA' end estado
union all
select 'funcion_confirmacion',
       case when to_regprocedure('public.guardar_confirmacion_v24(jsonb)') is not null then 'OK' else 'FALTA' end
union all
select 'bucket_fotos',
       case when exists(select 1 from storage.buckets where id='wedding-media-v24') then 'OK' else 'FALTA' end
union all
select 'tabla_fotos',
       case when to_regclass('public.media_uploads_v24') is not null then 'OK' else 'FALTA' end;
