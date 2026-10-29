# Handover de configuración documental

Este documento permite retomar el trabajo sin convertir la preparación en autorización de desarrollo. La fuente activa del rumbo es el [plan canónico](./migration-plan.md); una sesión nueva debe comenzar con el [handoff para IA](./ai-handoff.md). El antiguo plan del workspace original ya es un puntero a este repositorio, no otro plan activo.

## Punto de reentrada

| Dato | Estado recuperable |
| --- | --- |
| Raíz de producto | `<workspace>/iam-facea-page` |
| Contenedor padre | `<workspace>`; no está versionado |
| Rama local observada | `docs/mvp-publications-contract`, excepción documental creada por el padre desde `a13911e` |
| Baseline publicado conocido | `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; no implica `HEAD` actual |
| Cambios posteriores | Locales; preservar índice y worktree, y comprobar cada candidato antes de entregar |
| Entrega documental | Issue, commits pequeños, un PR con excepción de tamaño y merge a `develop` autorizados; todavía no afirmados como realizados |
| `main` y rama por defecto | Fuera del alcance; no deben modificarse |

La autorización vigente cubre únicamente la entrega documental indicada y la ejecuta el padre con evidencia posterior. No autoriza servicios, instalaciones, runtime, implementación, despliegue ni cambios en `main`. El flujo debe detenerse después del merge documental.

La raíz para una nueva sesión de IA es `<workspace>/iam-facea-page`, no el contenedor padre ni el workspace legacy. La [guía de entorno local](../development/local-environment.md) describe por separado una ubicación hermana propuesta para borradores HTML.

## Qué ya está preparado

- El baseline documental inicial se publicó como `a13911e`; es una referencia inicial, no una prueba del estado Git actual.
- La rama documental actual fue creada desde `a13911e` para preparar el contrato; commit, push, issue, PR, merge y estado remoto requieren evidencia posterior.
- La Etapa 3 preservó 75 snapshots (119.057.926 bytes) con hashes verificados. El manifest local tiene SHA256 `1c4de26d6cd386b0c74c5ad47f8389661ffb89bdd6a8d215c25561080f90955c`.
- Los snapshots, el inventario, el manifest y cinco copias históricas están ignorados y permanecen locales; sus wrappers públicos conservan la procedencia.
- La [guía legacy](./legacy-reference.md) fijó los repositorios Front y C# mediante commits; el código no fue copiado al producto.
- Supabase CLI oficial `2.122.0` y Docker fueron observados durante una sesión anterior; la CLI dejó sólo configuración inicial en `supabase/`.
- `supabase init` no inició servicios ni creó esquema, seeds, migraciones, Auth, RLS o vínculo Cloud. La configuración generada permanece local y `supabase/config.toml` está excluido de la entrega actual.
- El contrato de publicaciones MVP aprueba CRUD, dos tablas, ocho operaciones, tres funciones Edge, Auth para una identidad editora y Vercel Blob; no hay implementación.
- El plan original y cuatro logs de tareas completadas se conservaron byte a byte. El [wrapper del historial](./work-history/README.md) registra sus hashes sin convertirlos en instrucciones públicas.

Los ejecutables instalados en directorios personales y la configuración de `PATH` pertenecen a cada máquina: no están versionados ni forman parte del repositorio.

## Qué está aprobado pero no implementado

- Dos tablas de producto y ocho operaciones HTTP para CRUD de publicaciones y carga de imagen.
- Tres funciones Edge pequeñas: `publications`, `editor-publications` e `images`.
- Supabase Auth con email/contraseña para una identidad editora provisionada, sin signup y con recuperación requerida.
- RLS y autorización del subject exacto; un JWT válido por sí solo no alcanza.
- Vercel Blob inicial, URLs públicas y un adaptador de almacenamiento con implementación local/fake para pruebas.
- Borrado lógico sin purga automática, conservando publicaciones e imágenes referenciadas.

No se iniciaron servicios ni se implementaron migraciones, seeds, tablas, funciones, RLS, Auth, recuperación, almacenamiento, pruebas, integración real o despliegue. La tecnología del frontend y el recorrido de la Etapa 6 siguen pendientes. No copies la arquitectura C#, sus contratos o su esquema: permanecen como evidencia histórica.

## Política de ramas acordada

`main` es estable y no participa de esta entrega. `develop` es el destino de integración. `docs/mvp-publications-contract` es una excepción documental explícita para el alcance actual; la restricción anterior de no crear una rama documental describía el handoff previo y no invalida esta autorización. La excepción no habilita otras ramas por adelantado ni cambia la política habitual de `feat/*`, `fix/*` o `task/*`. No se debe afirmar commit, push, PR o merge sin evidencia.

## Cambio de planificación aceptado

La Etapa 6 separa **6.1, elegir el camino**, de **6.2, ejecutar un puente de aprendizaje sólo si fue elegido**. Es válido omitir 6.2 e ir directamente a la Etapa 7; el puente nunca es un prerrequisito.

La Etapa 7 construirá el frontend definitivo desde cero con la tecnología que se decida. Esto no impide incorporar deliberadamente assets, contenido o referencias revisadas, pero sí evita heredar automáticamente la aplicación legacy o un puente temporal.

Este cambio sólo aclara el plan. No se eligió ni implementó el puente, no se creó el frontend definitivo y no se autorizó ningún despliegue.

## Cómo continuar con seguridad

1. Abrí la nueva sesión en `<workspace>/iam-facea-page`.
2. Usá el [prompt y orden de lectura del handoff](./ai-handoff.md).
3. Inspeccioná Git en modo de sólo lectura y distinguí observaciones actuales de referencias históricas.
4. En la primera respuesta, resumí lo hecho, lo pendiente y el estado Git; después pedí el próximo alcance antes de escribir.
5. Si la entrega documental ya tiene evidencia de merge, detenete antes de implementación y pedí un alcance nuevo para cualquier trabajo de producto o runtime.

## Límite de la compuerta actual

La preparación actual sanea el subconjunto documental activo y agrega exclusiones para reducir el riesgo de publicar material local. Un `.gitignore` sólo afecta archivos no seguidos: no audita seguridad, no elimina contenido ya versionado y no purga historial.

No se realizó la revisión semántica o funcional de los 75 snapshots, PDFs, diagramas, contratos, prompts ni materiales legacy. Tampoco se aprobó su publicación. Evaluar si cada elemento se conserva como evidencia, se adapta o no se usa, y crear o actualizar documentación activa según requisitos validados, sigue siendo trabajo de la Etapa 10.

El [estado de migración](./migration-status.md), el [contrato aprobado de publicaciones MVP](./mvp-publications-contract-proposal.md), la [guía de referencias legacy](./legacy-reference.md), el [entorno local](../development/local-environment.md) y la [guía de Supabase](../../supabase/README.md) completan el contexto público. Los archivos locales ignorados son opcionales para tareas expresamente autorizadas y nunca deben cargarse o ejecutarse automáticamente.

## Key Learnings

1. El contrato de publicaciones está aprobado, pero ningún componente de runtime fue implementado.
2. La configuración de Supabase fue generada localmente y queda excluida de esta entrega documental.
3. La rama documental es una excepción acotada y no modifica la estabilidad de main.
4. La entrega autorizada termina antes de iniciar servicios, migraciones o integración con proveedores.
