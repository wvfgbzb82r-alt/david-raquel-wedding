-- DAVID & RAQUEL · V42 · Sugerencias musicales
create table if not exists public.sugerencias_musicales_v42 (
  id bigint generated always as identity primary key,
  nombre text not null, codigo_invitacion text,
  cancion_cena text, artista_cena text, cancion_baile text, artista_baile text,
  created_at timestamptz not null default now(),
  constraint sugerencias_musicales_v42_al_menos_una_check check (nullif(btrim(coalesce(cancion_cena,'')),'') is not null or nullif(btrim(coalesce(cancion_baile,'')),'') is not null)
);
alter table public.sugerencias_musicales_v42 enable row level security;
revoke all on table public.sugerencias_musicales_v42 from anon;
grant select, delete on table public.sugerencias_musicales_v42 to authenticated;
drop policy if exists "solo novios leen musica v42" on public.sugerencias_musicales_v42;
create policy "solo novios leen musica v42" on public.sugerencias_musicales_v42 for select to authenticated using (auth.uid()='3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);
drop policy if exists "solo novios borran musica v42" on public.sugerencias_musicales_v42;
create policy "solo novios borran musica v42" on public.sugerencias_musicales_v42 for delete to authenticated using (auth.uid()='3c36865b-a156-476f-82fd-7d95a3aea21b'::uuid);
create or replace function public.guardar_sugerencia_musical_v42(datos jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare nueva_id bigint; nombre_limpio text:=nullif(btrim(coalesce(datos->>'nombre','')),''); cena_limpia text:=nullif(btrim(coalesce(datos->>'cancion_cena','')),''); baile_limpio text:=nullif(btrim(coalesce(datos->>'cancion_baile','')),'');
begin if nombre_limpio is null then raise exception 'El nombre es obligatorio'; end if; if cena_limpia is null and baile_limpio is null then raise exception 'Debes indicar al menos una canción'; end if; insert into public.sugerencias_musicales_v42(nombre,codigo_invitacion,cancion_cena,artista_cena,cancion_baile,artista_baile) values(nombre_limpio,nullif(btrim(coalesce(datos->>'codigo_invitacion','')),''),cena_limpia,nullif(btrim(coalesce(datos->>'artista_cena','')),''),baile_limpio,nullif(btrim(coalesce(datos->>'artista_baile','')),'')) returning id into nueva_id; return jsonb_build_object('ok',true,'id',nueva_id); end; $$;
revoke all on function public.guardar_sugerencia_musical_v42(jsonb) from public;
grant execute on function public.guardar_sugerencia_musical_v42(jsonb) to anon, authenticated;
notify pgrst,'reload schema';
