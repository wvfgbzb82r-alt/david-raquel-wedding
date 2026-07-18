-- DAVID & RAQUEL · PERMISOS PARA BORRAR DESDE /ADMIN/

-- Confirmaciones: permitir borrar comentarios y eliminar respuestas.
grant update, delete on table public.confirmaciones_v24 to authenticated;

drop policy if exists "solo novios actualizan confirmaciones v25" on public.confirmaciones_v24;
create policy "solo novios actualizan confirmaciones v25"
on public.confirmaciones_v24
for update
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid)
with check (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "solo novios borran confirmaciones v25" on public.confirmaciones_v24;
create policy "solo novios borran confirmaciones v25"
on public.confirmaciones_v24
for delete
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

-- Fotos: estos permisos ya existían, pero se repiten para dejarlo asegurado.
grant delete on table public.media_uploads_v24 to authenticated;

drop policy if exists "solo novios borran registros v24" on public.media_uploads_v24;
create policy "solo novios borran registros v24"
on public.media_uploads_v24
for delete
to authenticated
using (auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);

drop policy if exists "solo novios borran recuerdos v24" on storage.objects;
create policy "solo novios borran recuerdos v24"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'wedding-media-v24'
  and auth.uid() = '3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid
);

notify pgrst, 'reload schema';

select 'permisos_borrado' as comprobacion, 'OK' as estado;
