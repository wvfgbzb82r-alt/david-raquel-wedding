CONFIRMACIÓN DE ASISTENCIA

Este ZIP añade el formulario visual y el código para conectarlo con Google Sheets.

ARCHIVOS:
- index.html
- css/style.css
- js/app.js
- google-apps-script.gs

PASO 1 — PREPARAR LA HOJA
En la primera fila de tu hoja escribe:
Fecha | Nombre | Asistencia | Acompañante | Alergias | Comentarios | Fecha enviada

PASO 2 — CREAR EL SCRIPT
1. Abre la hoja de Google.
2. Ve a Extensiones > Apps Script.
3. Borra el código existente.
4. Copia el contenido de google-apps-script.gs.
5. Si la pestaña no se llama “Hoja 1”, cambia SHEET_NAME por el nombre exacto.
6. Guarda.

PASO 3 — PUBLICAR COMO WEB APP
1. Pulsa Implementar > Nueva implementación.
2. Tipo: Aplicación web.
3. Ejecutar como: Tú.
4. Quién tiene acceso: Cualquier usuario.
5. Implementa y autoriza.
6. Copia la URL terminada en /exec.

PASO 4 — CONECTAR LA WEB
1. Abre js/app.js.
2. Busca:
   const RSVP_ENDPOINT = "PEGA_AQUI_LA_URL_DE_TU_WEB_APP";
3. Sustituye el texto por la URL /exec.
4. Guarda, Commit y Push origin.
