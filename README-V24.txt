DAVID & RAQUEL · V24 ESTABLE

Esta versión aísla las confirmaciones y las fotos de las estructuras antiguas que estaban causando conflictos.

PASOS OBLIGATORIOS
1. Copia todos los archivos al proyecto y conserva CNAME.
2. En Supabase > SQL Editor, pega y ejecuta TODO supabase-v24.sql.
3. Al final deben aparecer tres filas y las tres deben decir OK.
4. Commit to main y Push origin.
5. Espera 1-2 minutos.
6. Prueba la confirmación y luego una foto pequeña.

CAMBIOS
- Confirmaciones guardadas mediante una función RPC segura.
- Nueva tabla confirmaciones_v24, sin conflictos con tablas antiguas.
- Nuevo bucket privado wedding-media-v24.
- Nueva tabla media_uploads_v24.
- Panel actualizado para leer las nuevas tablas.
- Caché actualizada a v24.
