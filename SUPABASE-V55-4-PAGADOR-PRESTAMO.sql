-- V55.4 · Añadir «Préstamo» como origen/pagador de un gasto
-- Ejecutar una sola vez en Supabase SQL Editor.
-- No borra ni modifica los gastos existentes.

alter table public.gastos_boda_v55
  drop constraint if exists gastos_boda_v55_pagado_por_check;

alter table public.gastos_boda_v55
  add constraint gastos_boda_v55_pagado_por_check
  check (pagado_por in ('David','Raquel','Ambos','Personalizado','Préstamo'));
