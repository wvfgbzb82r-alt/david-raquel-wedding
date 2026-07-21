-- =============================================================
-- DAVID & RAQUEL · V43
-- Invitaciones inteligentes: máximo de adultos y niños
-- Ejecuta TODO en Supabase > SQL Editor > New query > RUN
-- =============================================================

alter table public.invitaciones_personalizadas
  add column if not exists adultos_max integer not null default 1,
  add column if not exists ninos_max integer not null default 0;

update public.invitaciones_personalizadas
set
  adultos_max = greatest(0, least(20, coalesce(adultos_max, max_personas, 1))),
  ninos_max = greatest(0, least(20, coalesce(ninos_max, 0)));

alter table public.invitaciones_personalizadas
  drop constraint if exists invitaciones_personalizadas_adultos_max_check;

alter table public.invitaciones_personalizadas
  add constraint invitaciones_personalizadas_adultos_max_check
  check (adultos_max between 0 and 20);

alter table public.invitaciones_personalizadas
  drop constraint if exists invitaciones_personalizadas_ninos_max_check;

alter table public.invitaciones_personalizadas
  add constraint invitaciones_personalizadas_ninos_max_check
  check (ninos_max between 0 and 20);

alter table public.confirmaciones_v24
  add column if not exists codigo_invitacion text;

create index if not exists confirmaciones_v24_codigo_invitacion_idx
on public.confirmaciones_v24 (codigo_invitacion);

create or replace function public.abrir_invitacion_personalizada(
  codigo_recibido text
)
returns table (
  nombre_mostrado text,
  max_personas integer,
  adultos_max integer,
  ninos_max integer
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
    greatest(1, i.adultos_max + i.ninos_max),
    i.adultos_max,
    i.ninos_max
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
begin
  if nombre_limpio is null then
    raise exception 'El nombre es obligatorio';
  end if;

  if asistencia_limpia is null then
    raise exception 'La asistencia es obligatoria';
  end if;

  if codigo_limpio is not null then
    select i.adultos_max, i.ninos_max
    into adultos_permitidos, ninos_permitidos
    from public.invitaciones_personalizadas i
    where i.codigo = codigo_limpio
      and i.activa = true
    limit 1;

    if not found then
      raise exception 'La invitación personalizada no es válida';
    end if;
  end if;

  if adultos_num > adultos_permitidos then
    raise exception
      'Esta invitación permite un máximo de % adultos',
      adultos_permitidos;
  end if;

  if ninos_num > ninos_permitidos then
    raise exception
      'Esta invitación permite un máximo de % niños',
      ninos_permitidos;
  end if;

  if lower(asistencia_limpia) in ('sí', 'si')
     and adultos_num + ninos_num < 1 then
    raise exception 'Debe indicarse al menos una persona';
  end if;

  insert into public.confirmaciones_v24 (
    nombre,
    telefono,
    asistencia,
    acompanante,
    codigo_invitacion,
    adultos,
    ninos,
    alergias,
    comentarios
  )
  values (
    nombre_limpio,
    nullif(btrim(coalesce(datos->>'telefono', '')), ''),
    asistencia_limpia,
    null,
    codigo_limpio,
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
grant execute on function public.guardar_confirmacion_v24(jsonb)
to anon, authenticated;

notify pgrst, 'reload schema';
