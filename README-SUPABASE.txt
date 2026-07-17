FORMULARIO CONECTADO A SUPABASE

Este proyecto ya contiene:

- URL del proyecto Supabase.
- Publishable key pública.
- Envío directo a la tabla `invitados`.
- Validación de nombre y asistencia.
- Bloqueo del botón mientras se envía.
- Mensajes de éxito y error.
- Campo opcional de teléfono.

COLUMNAS ESPERADAS EN `public.invitados`:

id
nombre
telefono
asistencia
acompanante
alergias
comentarios
created_at

POLÍTICA RLS NECESARIA:

alter table public.invitados enable row level security;
grant insert on table public.invitados to anon;

create policy "permitir confirmaciones"
on public.invitados
for insert
to anon
with check (true);

INSTALACIÓN:

1. Descomprime el ZIP.
2. Sustituye index.html, css/style.css y js/app.js.
3. Haz Commit to main.
4. Pulsa Push origin.
5. Prueba el formulario en GitHub Pages.
6. Comprueba la respuesta en Supabase > Table Editor > invitados.

IMPORTANTE:
La publishable key puede usarse en el navegador. No pongas nunca una
secret key ni una service_role key dentro de la web.
