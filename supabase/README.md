# Supabase: estado documental y configuración local

Supabase no fue iniciado y no existe un esquema de producto aplicado. El diseño de publicaciones MVP está aprobado, pero este directorio público no demuestra tablas, políticas RLS, datos, funciones Edge, Auth, proveedor de imágenes ni vínculo con Supabase Cloud.

## Historia de inicialización

Durante una sesión anterior se ejecutó Supabase CLI 2.122.0 desde la raíz portable `<workspace>/iam-facea-page`:

```powershell
supabase init --workdir "<workspace>/iam-facea-page"
```

El comando informó `Finished supabase init.` y generó localmente:

- `supabase/config.toml`, con `project_id = "iam-facea-page"` y defaults de esa versión de CLI;
- `supabase/.gitignore`, con exclusiones propias de metadata y entorno;
- `supabase/.temp/cli-latest`, metadata local que registró `v2.122.0`.

No generó `seed.sql` ni migraciones. Estas son observaciones históricas: no prueban que la CLI, Docker o esos archivos estén disponibles hoy en otra máquina o checkout.

## Exclusión de la entrega actual

`supabase/config.toml` se conserva localmente y la raíz lo ignora de forma deliberada para la entrega documental actual. No se edita ni elimina en este alcance, no se enlaza como archivo público y no se afirma que esté incluido en un clon.

La exclusión responde sólo a esta publicación documental. No establece una política permanente sobre qué configuración futura deberá versionarse; esa decisión necesitará alcance, revisión de seguridad y evidencia propias.

`supabase/.gitignore` permanece fuera de esta reconciliación y conserva su contenido generado.

## Qué significa el estado actual

- **Diseño aprobado:** el [contrato de publicaciones MVP](../docs/migration/mvp-publications-contract-proposal.md) define dos tablas, ocho operaciones y tres funciones Edge.
- **No iniciado:** no se ejecutó `supabase start`; no hay servicios locales observados en ejecución.
- **No migrado:** no existen migraciones, seeds, tablas ni índices aplicados para el producto.
- **No configurado:** no existen políticas RLS, funciones Edge, Auth editorial, recuperación de contraseña ni Vercel Blob integrados.
- **No conectado:** no se hizo login, link ni configuración comprobada de un proyecto Cloud.
- **No verificado para producción:** ni los defaults locales históricos ni el diseño documental prueban una configuración endurecida o desplegada.

## Diseño aprobado, no implementación

El MVP adopta Supabase Auth con email y contraseña para una única identidad editora provisionada administrativamente, sin signup y con recuperación requerida. Las funciones editoriales deberán verificar el subject exacto además del JWT, y RLS deberá sostener los mismos límites. La lectura pública será anónima y restringida a publicaciones `published` no eliminadas.

Vercel Blob es el proveedor inicial de imágenes y sus URLs serán públicas. Las credenciales quedan del lado servidor, sin prefijos públicos; la base almacena una URL, no el binario. Términos comerciales, disponibilidad, permisos y SDK todavía deben verificarse antes de integrar.

Nada de lo anterior está aplicado. El sistema legacy continúa como evidencia histórica y no se copia automáticamente como esquema o política.

## Próximo paso

La entrega actual publica únicamente documentación y debe detenerse antes de implementación. Iniciar servicios, revisar o modificar configuración, crear migraciones, integrar proveedores, configurar Auth/RLS o usar Cloud requiere autorización posterior y controles reales. Leer esta guía no autoriza runtime, instalaciones, red ni cambios de servicios.
