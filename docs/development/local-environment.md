# Preparación local observada

Esta guía registra qué se verificó durante una configuración anterior y cómo razonar sobre disponibilidad sin iniciar servicios. No instala herramientas, no afirma que sigan disponibles hoy y no autoriza runtime.

## Observaciones históricas

| Recurso | Observación previa |
| --- | --- |
| Sistema | Windows |
| Docker | Docker `29.5.2` y Compose `5.1.3` |
| Recursos Docker | Aproximadamente `7.58 GiB` de memoria y `16` CPU |
| Supabase CLI | CLI oficial `2.122.0` |
| Supabase en el repo | `supabase init` generó configuración local; servicios no iniciados y `supabase/config.toml` excluido de la entrega documental actual |

Los ejecutables oficiales de Supabase se instalaron en un directorio personal y se expusieron mediante el `PATH` de esa máquina. Esos binarios y esa configuración no están versionados. No asumas que existen en otra sesión ni uses instrucciones genéricas de instalación global con npm para reconstruir el entorno.

## Raíces portables y borradores visuales

La raíz del producto se representa de forma portable como:

```text
<workspace>/iam-facea-page
```

Los borradores HTML mutables podrían ubicarse fuera del repositorio, en una carpeta hermana. La propuesta **no fue creada ni se verificó que exista**:

```text
<workspace>/
├── iam-facea-page/                 # producto y raíz recomendada para la IA
└── ui-prototypes/                  # propuesta externa; borradores HTML mutables
```

`<workspace>/ui-prototypes` podría usar un repositorio Git independiente si más adelante se necesita historia propia, pero eso es opcional y no fue creado. No es parte de este repositorio ni se enlaza como destino existente.

Un borrador en esa ubicación no es una especificación aprobada, una aplicación de runtime ni parte del archivo histórico inmutable. No mover allí HTML, crear symlinks o presentar la carpeta como disponible sin autorización posterior. Las decisiones revisadas y aprobadas deben promoverse explícitamente a la documentación activa del producto.

Toda consulta a borradores o proyectos externos requiere una ruta explícita y autorización de lectura; la proximidad en el árbol no concede acceso automático. Tampoco se deben ejecutar scripts externos ni activar instrucciones o skills archivadas por inercia.

## Comprobaciones opcionales de sólo lectura

Si una tarea autorizada necesita comprobar disponibilidad actual, acordá primero cuáles de estas consultas corresponden:

```powershell
docker --version
docker info
supabase --version
```

Estos comandos consultan herramientas locales, pero su ejecución no se presume. Esta guía no autoriza `supabase start`, pulls de imágenes, login, link, instalación, inicialización adicional ni cambios de servicios.

## Límite de preparación

`supabase init` creó configuración local en una sesión anterior; no creó un backend en ejecución ni una configuración endurecida para producción. `supabase/config.toml` se conserva localmente y no forma parte de la entrega documental actual. Esa exclusión no demuestra que el archivo exista en otro checkout ni define una política permanente para futuras configuraciones.

El [contrato de publicaciones MVP](../migration/mvp-publications-contract-proposal.md) ya aprueba el esquema, las ocho operaciones, tres funciones Edge, Auth para una identidad editora y Vercel Blob. Siguen sin implementar migraciones, seeds, tablas, funciones, recuperación de contraseña, RLS, pruebas, integración real y cualquier vínculo Cloud.

La autorización debe residir en servidor y RLS, comparando el subject editor exacto; validar sólo un JWT no alcanza. Las credenciales de Vercel Blob y cualquier clave privilegiada permanecen del lado servidor y nunca se exponen mediante `VITE_*`, `NEXT_PUBLIC_*` u otro canal cliente.

Consultá [`supabase/README.md`](../../supabase/README.md) para la historia de inicialización y el [handoff para IA](../migration/ai-handoff.md) antes de continuar.
