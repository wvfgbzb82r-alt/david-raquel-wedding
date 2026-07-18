CORRECCIONES DE INTEGRACIÓN

Cambios:
- Formulario: añade Authorization y muestra el error real de Supabase.
- Fotos: añade Authorization, codifica correctamente las rutas y mejora los mensajes.
- Safari/iPhone: evita los subrayados azules automáticos del IBAN y teléfonos.
- SQL único y compatible para crear función, tabla, bucket y políticas.
- Fuerza la recarga de caché de PostgREST.

PASOS:
1. Copia todos los archivos al proyecto y conserva CNAME.
2. En Supabase > SQL Editor, ejecuta CORRECCION-SUPABASE.sql completo.
3. Deben aparecer 4 filas con estado OK.
4. Commit to main y Push origin.
5. Espera 1-2 minutos.
6. Abre la web en una pestaña privada o fuerza recarga.
7. Prueba una confirmación y una foto JPG pequeña.
