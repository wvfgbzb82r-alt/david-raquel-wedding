-- DAVID & RAQUEL · V55.1 · SEATING ADULTOS / NIÑOS
-- Ejecutar UNA SOLA VEZ en Supabase > SQL Editor antes de publicar.

-- 1. Cada mesa pasa a ser de adultos o de niños.
alter table public.mesas_v54
  add column if not exists tipo text;

update public.mesas_v54
set tipo = 'adultos'
where tipo is null
   or tipo not in ('adultos', 'ninos');

alter table public.mesas_v54
  alter column tipo set default 'adultos';

alter table public.mesas_v54
  alter column tipo set not null;

alter table public.mesas_v54
  drop constraint if exists mesas_v54_tipo_check;

alter table public.mesas_v54
  add constraint mesas_v54_tipo_check
  check (tipo in ('adultos', 'ninos'));

-- El número puede repetirse entre una mesa de adultos y una de niños,
-- pero no dentro del mismo tipo.
alter table public.mesas_v54
  drop constraint if exists mesas_v54_numero_key;

create unique index if not exists mesas_v54_tipo_numero_uidx
  on public.mesas_v54 (tipo, numero);

-- 2. Una confirmación puede tener DOS asignaciones:
-- una para sus adultos y otra para sus niños.
alter table public.asignaciones_mesas_v54
  add column if not exists tipo_grupo text;

update public.asignaciones_mesas_v54
set tipo_grupo = 'adultos'
where tipo_grupo is null
   or tipo_grupo not in ('adultos', 'ninos');

alter table public.asignaciones_mesas_v54
  alter column tipo_grupo set default 'adultos';

alter table public.asignaciones_mesas_v54
  alter column tipo_grupo set not null;

alter table public.asignaciones_mesas_v54
  drop constraint if exists asignaciones_mesas_v54_tipo_grupo_check;

alter table public.asignaciones_mesas_v54
  add constraint asignaciones_mesas_v54_tipo_grupo_check
  check (tipo_grupo in ('adultos', 'ninos'));

alter table public.asignaciones_mesas_v54
  drop constraint if exists asignaciones_mesas_v54_confirmacion_id_key;

create unique index if not exists asignaciones_mesas_v54_confirmacion_tipo_uidx
  on public.asignaciones_mesas_v54 (confirmacion_id, tipo_grupo);

notify pgrst, 'reload schema';
