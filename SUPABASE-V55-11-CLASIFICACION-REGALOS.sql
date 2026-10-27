-- Ejecutar una sola vez en Supabase SQL Editor.
-- Conserva todos los regalos existentes. Los antiguos quedan como dinero salvo los tres indicados.
ALTER TABLE public.regalos_v54 ADD COLUMN IF NOT EXISTS clasificacion text NOT NULL DEFAULT 'dinero';
ALTER TABLE public.regalos_v54 DROP CONSTRAINT IF EXISTS regalos_v54_clasificacion_check;
ALTER TABLE public.regalos_v54 ADD CONSTRAINT regalos_v54_clasificacion_check CHECK (clasificacion IN ('dinero','material','separado'));

-- Solo se reclasifican registros que coincidan con nombre e importe.
-- Revisar los resultados de la consulta SELECT antes de ejecutar los UPDATE.
SELECT id, invitado, importe, clasificacion FROM public.regalos_v54
WHERE (lower(trim(invitado)) IN ('damian y pepi','damián y pepi') AND importe = 1000)
   OR (lower(trim(invitado)) IN ('manuel y maria angeles','manuel y maría ángeles','manuel y maría angeles') AND importe = 1000)
   OR (lower(trim(invitado)) IN ('damian','damián') AND importe = 65);

-- Tras comprobar los nombres, puedes clasificarlos desde el panel Regalos.
-- Evitamos reclasificar automáticamente por si hay registros repetidos.
