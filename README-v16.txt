DAVID & RAQUEL — V1.6 ADMIN DIRECTO

Esta versión elimina la dependencia del archivo externo de Supabase.
El panel inicia sesión directamente mediante HTTPS, por lo que también
mostrará el error real si el acceso falla.

SUSTITUYE ESTOS DOS ARCHIVOS:
- admin.html
- js/admin.js

Después:
1. Commit to main.
2. Push origin.
3. Abre exactamente:
   https://davidyraquel.es/admin.html?v=16
4. Pulsa Ctrl + F5.

Si el usuario no está confirmado, el panel lo indicará.
Si falta la política SQL, entrará pero mostrará el error de lectura.
