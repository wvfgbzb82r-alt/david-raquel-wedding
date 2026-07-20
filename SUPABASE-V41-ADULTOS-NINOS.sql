-- =============================================================
-- DAVID & RAQUEL · V41
-- Adultos, niños y alergias por persona
-- Ejecuta TODO en Supabase > SQL Editor > New query > RUN
-- =============================================================

alter table public.confirmaciones_v24
  add column if not exists adultos integer not null default 1,
  add column if not exists ninos integer not null default 0;

alter table public.confirmaciones_v24
  drop constraint if exists confirmaciones_v24_adultos_check;

alter table public.confirmaciones_v24
  add constraint confirmaciones_v24_adultos_check
  check (adultos between 0 and 20);

alter table public.confirmaciones_v24
  drop constraint if exists confirmaciones_v24_ninos_check;

alter table public.confirmaciones_v24
  add constraint confirmaciones_v24_ninos_check
  check (ninos between 0 and 20);

create or replace function public.guardar_confirmacion_v24(datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nueva_id bigint;
  nombre_limpio text := nullif(btrim(coalesce(datos->>'nombre', '')), '');
  asistencia_limpia text := nullif(btrim(coalesce(datos->>'asistencia', '')), '');
  adultos_num integer := greatest(0, least(20, coalesce((datos->>'adultos')::integer, 0)));
  ninos_num integer := greatest(0, least(20, coalesce((datos->>'ninos')::integer, 0)));
begin
  if nombre_limpio is null then
    raise exception 'El nombre es obligatorio';
  end if;

  if asistencia_limpia is null then
    raise exception 'La asistencia es obligatoria';
  end if;

  if lower(asistencia_limpia) in ('sí', 'si') and adultos_num + ninos_num < 1 then
    raise exception 'Debe indicarse al menos una persona';
  end if;

  insert into public.confirmaciones_v24
    (nombre, telefono, asistencia, acompanante, adultos, ninos, alergias, comentarios)
  values
    (
      nombre_limpio,
      nullif(btrim(coalesce(datos->>'telefono', '')), ''),
      asistencia_limpia,
      null,
      adultos_num,
      ninos_num,
      nullif(btrim(coalesce(datos->>'alergias', '')), ''),
      nullif(btrim(coalesce(datos->>'comentarios', '')), '')
    )
  returning id into nueva_id;

  return jsonb_build_object('ok', true, 'id', nueva_id);
end;
$$;

revoke all on function public.guardar_confirmacion_v24(jsonb) from public;
grant execute on function public.guardar_confirmacion_v24(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
