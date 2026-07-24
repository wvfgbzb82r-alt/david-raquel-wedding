-- DAVID & RAQUEL · V53.2 · Varias canciones por invitado
-- Ejecutar una sola vez en Supabase > SQL Editor > New query > Run

alter table public.sugerencias_musicales_v42
  add column if not exists cancion_cena_2 text,
  add column if not exists artista_cena_2 text,
  add column if not exists cancion_cena_3 text,
  add column if not exists artista_cena_3 text,
  add column if not exists cancion_baile_2 text,
  add column if not exists artista_baile_2 text,
  add column if not exists cancion_baile_3 text,
  add column if not exists artista_baile_3 text;

alter table public.sugerencias_musicales_v42
  drop constraint if exists sugerencias_musicales_v42_al_menos_una_check;

alter table public.sugerencias_musicales_v42
  add constraint sugerencias_musicales_v42_al_menos_una_check check (
    nullif(btrim(coalesce(cancion_cena, '')), '') is not null or
    nullif(btrim(coalesce(cancion_cena_2, '')), '') is not null or
    nullif(btrim(coalesce(cancion_cena_3, '')), '') is not null or
    nullif(btrim(coalesce(cancion_baile, '')), '') is not null or
    nullif(btrim(coalesce(cancion_baile_2, '')), '') is not null or
    nullif(btrim(coalesce(cancion_baile_3, '')), '') is not null
  );

create or replace function public.guardar_sugerencia_musical_v42(datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nueva_id bigint;
  nombre_limpio text := nullif(btrim(coalesce(datos->>'nombre', '')), '');
  cena_1 text := nullif(btrim(coalesce(datos->>'cancion_cena', '')), '');
  cena_2 text := nullif(btrim(coalesce(datos->>'cancion_cena_2', '')), '');
  cena_3 text := nullif(btrim(coalesce(datos->>'cancion_cena_3', '')), '');
  baile_1 text := nullif(btrim(coalesce(datos->>'cancion_baile', '')), '');
  baile_2 text := nullif(btrim(coalesce(datos->>'cancion_baile_2', '')), '');
  baile_3 text := nullif(btrim(coalesce(datos->>'cancion_baile_3', '')), '');
begin
  if nombre_limpio is null then
    raise exception 'El nombre es obligatorio';
  end if;

  if cena_1 is null and cena_2 is null and cena_3 is null
     and baile_1 is null and baile_2 is null and baile_3 is null then
    raise exception 'Debes indicar al menos una canción';
  end if;

  insert into public.sugerencias_musicales_v42 (
    nombre, codigo_invitacion,
    cancion_cena, artista_cena,
    cancion_cena_2, artista_cena_2,
    cancion_cena_3, artista_cena_3,
    cancion_baile, artista_baile,
    cancion_baile_2, artista_baile_2,
    cancion_baile_3, artista_baile_3
  ) values (
    nombre_limpio,
    nullif(btrim(coalesce(datos->>'codigo_invitacion', '')), ''),
    cena_1, nullif(btrim(coalesce(datos->>'artista_cena', '')), ''),
    cena_2, nullif(btrim(coalesce(datos->>'artista_cena_2', '')), ''),
    cena_3, nullif(btrim(coalesce(datos->>'artista_cena_3', '')), ''),
    baile_1, nullif(btrim(coalesce(datos->>'artista_baile', '')), ''),
    baile_2, nullif(btrim(coalesce(datos->>'artista_baile_2', '')), ''),
    baile_3, nullif(btrim(coalesce(datos->>'artista_baile_3', '')), '')
  )
  returning id into nueva_id;

  return jsonb_build_object('ok', true, 'id', nueva_id);
end;
$$;

revoke all on function public.guardar_sugerencia_musical_v42(jsonb) from public;
grant execute on function public.guardar_sugerencia_musical_v42(jsonb)
  to anon, authenticated;

notify pgrst, 'reload schema';
