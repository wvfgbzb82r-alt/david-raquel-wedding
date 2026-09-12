-- V55.3 · Añadir control del préstamo al módulo económico
-- Esta migración NO borra ni modifica los gastos existentes.

alter table public.configuracion_economica_v55
  add column if not exists prestamo_total numeric(12,2) not null default 0
  check (prestamo_total >= 0);

update public.configuracion_economica_v55
set prestamo_total = coalesce(prestamo_total, 0)
where id = 1;

-- No es necesario cambiar las políticas RLS existentes.
