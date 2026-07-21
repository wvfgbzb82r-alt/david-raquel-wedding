-- =============================================================
-- DAVID & RAQUEL · V48 · CATERING
-- Ejecuta TODO en Supabase > SQL Editor > New query > RUN
-- =============================================================

alter table public.confirmaciones_v24
  add column if not exists menus_adultos jsonb not null default '[]'::jsonb;

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
  codigo_limpio text := nullif(upper(btrim(coalesce(datos->>'codigo_invitacion', ''))), '');
  adultos_num integer := greatest(0, least(20, coalesce((datos->>'adultos')::integer, 0)));
  ninos_num integer := greatest(0, least(20, coalesce((datos->>'ninos')::integer, 0)));
  adultos_permitidos integer := 20;
  ninos_permitidos integer := 20;
  menus jsonb := coalesce(datos->'menus_adultos', '[]'::jsonb);
  necesidades jsonb := coalesce(datos->'alergias', '[]'::jsonb);
begin
  if nombre_limpio is null then raise exception 'El nombre es obligatorio'; end if;
  if asistencia_limpia is null then raise exception 'La asistencia es obligatoria'; end if;

  if codigo_limpio is not null then
    select adultos_max, ninos_max
      into adultos_permitidos, ninos_permitidos
    from public.invitaciones_personalizadas
    where codigo = codigo_limpio and activa = true
    limit 1;
    if not found then raise exception 'La invitación personalizada no es válida'; end if;
  end if;

  if adultos_num > adultos_permitidos then
    raise exception 'Esta invitación permite un máximo de % adultos', adultos_permitidos;
  end if;
  if ninos_num > ninos_permitidos then
    raise exception 'Esta invitación permite un máximo de % niños', ninos_permitidos;
  end if;
  if lower(asistencia_limpia) in ('sí','si') and adultos_num + ninos_num < 1 then
    raise exception 'Debe indicarse al menos una persona';
  end if;
  if lower(asistencia_limpia) in ('sí','si') and jsonb_array_length(menus) <> adultos_num then
    raise exception 'Debe indicarse el menú de cada adulto';
  end if;

  insert into public.confirmaciones_v24 (
    nombre, telefono, asistencia, acompanante, codigo_invitacion,
    adultos, ninos, menus_adultos, alergias, comentarios
  ) values (
    nombre_limpio,
    nullif(btrim(coalesce(datos->>'telefono', '')), ''),
    asistencia_limpia,
    null,
    codigo_limpio,
    adultos_num,
    ninos_num,
    menus,
    necesidades::text,
    nullif(btrim(coalesce(datos->>'comentarios', '')), '')
  )
  returning id into nueva_id;

  return jsonb_build_object('ok', true, 'id', nueva_id);
end;
$$;

revoke all on function public.guardar_confirmacion_v24(jsonb) from public;
grant execute on function public.guardar_confirmacion_v24(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
