DAVID & RAQUEL · V23 ESTABILIZACIÓN

CORRECCIONES:
- Safari/iPhone ya no debería subrayar ni colorear el IBAN.
- El formulario RSVP ya no envía la publishable key como Bearer token.
- La subida de fotos ya no envía la publishable key como Bearer token.
- Mensajes de error más claros.
- SQL unificado para crear/reparar la tabla invitados, sus columnas y políticas.
- SQL unificado para crear el bucket privado wedding-media y sus políticas.

INSTALACIÓN:
1. Copia todos los archivos del ZIP sobre el proyecto actual.
2. Conserva CNAME.
3. En Supabase > SQL Editor, pega y ejecuta TODO:
   supabase-estabilizacion-v23.sql
4. Debe aparecer: Success. No rows returned.
5. Commit to main y Push origin.
6. Espera 1-2 minutos y prueba en ventana privada.

PRUEBAS:
- Enviar una confirmación de asistencia.
- Comprobar que aparece en Table Editor > invitados y en /admin/.
- Subir una foto pequeña desde /fotos/.
- Comprobarla en Storage > wedding-media y en /admin/.
