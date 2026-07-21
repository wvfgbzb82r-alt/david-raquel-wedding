-- =============================================================
-- DAVID & RAQUEL · V48.1
-- Reparación de acceso con códigos privados
-- Ejecuta TODO en Supabase > SQL Editor > New query > RUN
-- =============================================================

drop function if exists public.abrir_invitacion_personalizada(text);

create function public.abrir_invitacion_personalizada(
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
declare
  codigo_limpio text := upper(btrim(coalesce(codigo_recibido, '')));
begin
  if codigo_limpio = '' then
    return;
  end if;

  update public.invitaciones_personalizadas
  set opened_at = coalesce(opened_at, now())
  where upper(btrim(codigo)) = codigo_limpio
    and activa = true;

  return query
  select
    i.nombre_mostrado,
    greatest(1, coalesce(i.adultos_max, 1) + coalesce(i.ninos_max, 0)),
    coalesce(i.adultos_max, 1),
    coalesce(i.ninos_max, 0)
  from public.invitaciones_personalizadas i
  where upper(btrim(i.codigo)) = codigo_limpio
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

notify pgrst, 'reload schema';

-- Comprobación opcional:
-- Sustituye CODIGO_REAL por uno de tus códigos y ejecuta esta línea aparte:
-- select * from public.abrir_invitacion_personalizada('CODIGO_REAL');
