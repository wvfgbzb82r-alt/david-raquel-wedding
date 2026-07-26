-- DAVID & RAQUEL · V53.3 · TRATAMIENTO INTELIGENTE
-- Ejecutar una sola vez en Supabase > SQL Editor > New query > Run

alter table public.invitaciones_personalizadas
  add column if not exists tratamiento text;

-- Asigna automáticamente singular o plural mixto a las invitaciones existentes.
-- Después solo hay que cambiar manualmente a plural_femenino las invitaciones
-- dirigidas exclusivamente a varias mujeres.
update public.invitaciones_personalizadas
set tratamiento = case
  when nombre_mostrado ~* '(\s(y|e|&|\+)\s|,|\bfamilia\b|\blos\b|\blas\b|\bhermanos\b|\bhermanas\b|\bpadres\b|\bamigos\b|\bprimos\b|\btios\b|\btias\b)'
    then 'plural_mixto'
  else 'singular'
end
where tratamiento is null
   or tratamiento not in ('singular', 'plural_mixto', 'plural_femenino');

alter table public.invitaciones_personalizadas
  alter column tratamiento set default 'singular';

alter table public.invitaciones_personalizadas
  alter column tratamiento set not null;

alter table public.invitaciones_personalizadas
  drop constraint if exists invitaciones_personalizadas_tratamiento_check;

alter table public.invitaciones_personalizadas
  add constraint invitaciones_personalizadas_tratamiento_check
  check (tratamiento in ('singular', 'plural_mixto', 'plural_femenino'));

-- Actualiza la función pública para devolver también el tratamiento.
drop function if exists public.abrir_invitacion_personalizada(text);

create function public.abrir_invitacion_personalizada(
  codigo_recibido text
)
returns table (
  nombre_mostrado text,
  max_personas integer,
  adultos_max integer,
  ninos_max integer,
  tratamiento text
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
    i.ninos_max,
    i.tratamiento
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

grant update on table public.invitaciones_personalizadas to authenticated;

notify pgrst, 'reload schema';
