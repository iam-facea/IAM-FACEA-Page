# Preparación local observada

Esta guía registra qué se verificó durante una configuración anterior y cómo razonar sobre disponibilidad sin iniciar servicios. La base local de publicaciones fue implementada y verificada después de esas observaciones; su evidencia vigente está en la [guía de Supabase](../../supabase/README.md) y el [estado de migración](../migration/migration-status.md). Este documento no instala herramientas, no afirma que sigan disponibles hoy y no autoriza runtime.

## Observaciones históricas

| Recurso | Observación previa |
| --- | --- |
| Sistema | Windows |
| Docker | Docker `29.5.2` y Compose `5.1.3` |
| Recursos Docker | Aproximadamente `7.58 GiB` de memoria y `16` CPU |
| Supabase CLI | CLI oficial `2.122.0` |
| Supabase en el repo | En esa sesión, `supabase init` sólo generó configuración local; los servicios todavía no se habían iniciado y `supabase/config.toml` quedó excluido de la entrega documental |

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

`supabase init` creó configuración local en una sesión anterior; por sí solo no creó un backend en ejecución ni una configuración endurecida para producción. Posteriormente, el trabajo local del issue #3 inició Supabase y verificó 20 migraciones, seed sintético, tablas, RLS y grants. `supabase/config.toml` se conserva localmente e ignorado, sin hardening de servicio; esa exclusión no demuestra que el archivo exista en otro checkout ni define una política permanente para futuras configuraciones.

La base tiene un runner real: `supabase test db` pasó 50 pruebas y `supabase db lint --local --level warning` no informó hallazgos en la verificación independiente. El [contrato de publicaciones MVP](../migration/mvp-publications-contract-proposal.md) mantiene ocho operaciones y tres funciones Edge aprobadas, pero todavía no existen runner de aplicación o Edge, funciones HTTP, identidad Auth real, recuperación, integración Blob ni vínculo Cloud.

La autorización debe residir en servidor y RLS, comparando el subject editor exacto; validar sólo un JWT no alcanza. Las credenciales de Vercel Blob y cualquier clave privilegiada permanecen del lado servidor y nunca se exponen mediante `VITE_*`, `NEXT_PUBLIC_*` u otro canal cliente.

Consultá [`supabase/README.md`](../../supabase/README.md) para las operaciones y límites actuales de la base, y el [handoff para IA](../migration/ai-handoff.md) antes de continuar.
