-- V22 · Álbum privado de la boda
-- Ejecutar en Supabase > SQL Editor.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-media',
  'wedding-media',
  false,
  104857600,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  object_path text unique not null,
  uploader_name text,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.media_uploads enable row level security;
grant insert on public.media_uploads to anon;
grant select, delete on public.media_uploads to authenticated;

drop policy if exists "invitados registran sus archivos" on public.media_uploads;
create policy "invitados registran sus archivos"
on public.media_uploads for insert to anon
with check (true);

drop policy if exists "solo novios leen archivos" on public.media_uploads;
create policy "solo novios leen archivos"
on public.media_uploads for select to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "solo novios borran registros de archivos" on public.media_uploads;
create policy "solo novios borran registros de archivos"
on public.media_uploads for delete to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

grant insert, select on storage.objects to anon;
grant select, delete on storage.objects to authenticated;

drop policy if exists "invitados suben recuerdos" on storage.objects;
create policy "invitados suben recuerdos"
on storage.objects for insert to anon
with check (
  bucket_id = 'wedding-media'
  and (storage.foldername(name))[1] = 'uploads'
);

-- Permite al API devolver únicamente la información del objeto recién subido.
-- No permite listar ni descargar los archivos a los invitados.
drop policy if exists "invitados reciben confirmacion de subida" on storage.objects;
create policy "invitados reciben confirmacion de subida"
on storage.objects for select to anon
using (
  bucket_id = 'wedding-media'
  and (storage.foldername(name))[1] = 'uploads'
  and storage.allow_only_operation('object.get_authenticated_info')
);

drop policy if exists "solo novios ven recuerdos" on storage.objects;
create policy "solo novios ven recuerdos"
on storage.objects for select to authenticated
using (
  bucket_id = 'wedding-media'
  and auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
);

drop policy if exists "solo novios borran recuerdos" on storage.objects;
create policy "solo novios borran recuerdos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wedding-media'
  and auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
);
