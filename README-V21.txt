DAVID & RAQUEL — V21 ESTABLE

Incluye:
- Web completa actual.
- IBAN y Bizum con botones de copiar.
- Acceso temporal a la invitación.
- Panel nuevo en /admin/ sin librerías externas.
- Login real mediante Supabase Auth.
- Política RLS limitada al UID del novio.
- Estadísticas, buscador, filtros, móvil y exportación CSV.

INSTALACIÓN
1. Descomprime el ZIP.
2. Copia su contenido dentro de tu carpeta david-raquel-wedding, sustituyendo archivos.
3. Conserva CNAME (ya viene incluido).
4. En GitHub Desktop: Commit to main y Push origin.
5. Espera 1-2 minutos.
6. Abre: https://davidyraquel.es/admin/?v=21
7. Introduce la contraseña del usuario davidn6783@gmail.com creado en Supabase.

SQL
La política SQL ya fue ejecutada correctamente según la captura de Supabase.
El archivo supabase-admin-v21.sql queda incluido como copia de seguridad.

DIAGNÓSTICO
Si el usuario no está confirmado, el panel lo indicará.
Si la contraseña no coincide, mostrará “Código incorrecto”.
Si la política RLS falla, entrará al panel y mostrará el error de lectura.
