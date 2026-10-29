# Handover de configuración documental

Este documento permite retomar el trabajo sin convertir la preparación en autorización de desarrollo. La fuente activa del rumbo es el [plan canónico](./migration-plan.md); una sesión nueva debe comenzar con el [handoff para IA](./ai-handoff.md). El antiguo plan del workspace original ya es un puntero a este repositorio, no otro plan activo.

## Punto de reentrada

| Dato | Estado recuperable |
| --- | --- |
| Raíz de producto | `<workspace>/iam-facea-page` |
| Contenedor padre | `<workspace>`; no está versionado |
| Rama local observada | `feat/db-publications-schema`, con `HEAD` en `8d7c54b` al cierre documental del issue #3 |
| Baseline publicado conocido | `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; no implica `HEAD` actual |
| Cambios posteriores | Implementación DB y documentación locales sin commit; preservar índice, worktree y archivos no seguidos |
| Entrega del issue #3 | Sin push, PR ni merge; no existe permiso vigente de entrega pública ni de cierre del issue |
| `main` y rama por defecto | Fuera del alcance; no deben modificarse |

La autorización vigente cubre únicamente el cierre documental local que ejecuta el padre. No autoriza commits, publicación, despliegue, cambios en `main` ni continuación funcional. Las autorizaciones históricas no se heredan.

La raíz para una nueva sesión de IA es `<workspace>/iam-facea-page`, no el contenedor padre ni el workspace legacy. La [guía de entorno local](../development/local-environment.md) describe por separado una ubicación hermana propuesta para borradores HTML.

## Qué ya está preparado

- El baseline documental inicial se publicó como `a13911e`; es una referencia inicial, no una prueba del estado Git actual.
- La rama `feat/db-publications-schema` conserva el trabajo local del issue #3 sobre `HEAD` `8d7c54b`; todos sus archivos de implementación continúan sin commit y sin entrega pública.
- La Etapa 3 preservó 75 snapshots (119.057.926 bytes) con hashes verificados. El manifest local tiene SHA256 `1c4de26d6cd386b0c74c5ad47f8389661ffb89bdd6a8d215c25561080f90955c`.
- Los snapshots, el inventario, el manifest y cinco copias históricas están ignorados y permanecen locales; sus wrappers públicos conservan la procedencia.
- La [guía legacy](./legacy-reference.md) fijó los repositorios Front y C# mediante commits; el código no fue copiado al producto.
- Históricamente, Supabase CLI oficial `2.122.0` y Docker habían sido observados y `supabase init` sólo había dejado configuración inicial.
- En el cierre local del issue #3 se observaron servicios activos y una reconstrucción desde cero que aplicó 21 migraciones y un seed de tres publicaciones sintéticas. La suite pasó 5 archivos y 52 pruebas, y el lint local no informó hallazgos.
- `supabase/config.toml` permanece ignorado, conservó el hash `5b6b9cd73093e7f66aadfbc7c996b825ffb4ad98` y no fue endurecido para producción.
- El contrato de publicaciones MVP aprueba CRUD, dos tablas, ocho operaciones, tres funciones Edge, Auth para una identidad editora y Vercel Blob. Sólo su tramo de base local está implementado.
- El plan original y cuatro logs de tareas completadas se conservaron byte a byte. El [wrapper del historial](./work-history/README.md) registra sus hashes sin convertirlos en instrucciones públicas.

Los ejecutables instalados en directorios personales y la configuración de `PATH` pertenecen a cada máquina: no están versionados ni forman parte del repositorio.

## Qué está implementado y qué sigue pendiente

La base local implementa las dos tablas, constraints, índices, grants, RLS por subject exacto, seed sintético, borrado lógico y `read_publications`. Este helper devuelve la proyección pública de seis campos con límite `1–50`, cursor o lookup por id; no es un endpoint ni amplía las ocho operaciones HTTP aprobadas. La configuración editora permanece en `NULL`, no hay usuarios reales en `auth.users` y los fixtures Auth de prueba siempre hacen rollback.

Siguen sin implementarse:

- las tres funciones Edge `publications`, `editor-publications` e `images`;
- Supabase Auth real con provisión administrativa, signup deshabilitado y recuperación;
- Vercel Blob y el adaptador de almacenamiento;
- pruebas del contrato HTTP, Edge, Blob e integración real;
- frontend, vínculo Cloud, hardening de configuración y despliegue.

La tecnología del frontend y el recorrido de la Etapa 6 siguen pendientes. No copies la arquitectura C#, sus contratos o su esquema: permanecen como evidencia histórica.

## Política de ramas acordada

`main` es estable y no participa de este cierre. `feat/db-publications-schema` es la rama local del issue #3; no existe autorización vigente para commit, push, PR o merge. `develop` continúa como rama de integración prevista, pero cualquier destino efectivo debe verificarse y aprobarse. No se debe afirmar entrega sin evidencia.

## Cambio de planificación aceptado

La Etapa 6 separa **6.1, elegir el camino**, de **6.2, ejecutar un puente de aprendizaje sólo si fue elegido**. Es válido omitir 6.2 e ir directamente a la Etapa 7; el puente nunca es un prerrequisito.

La Etapa 7 construirá el frontend definitivo desde cero con la tecnología que se decida. Esto no impide incorporar deliberadamente assets, contenido o referencias revisadas, pero sí evita heredar automáticamente la aplicación legacy o un puente temporal.

Este cambio sólo aclara el plan. No se eligió ni implementó el puente, no se creó el frontend definitivo y no se autorizó ningún despliegue.

## Cómo continuar con seguridad

1. Abrí la nueva sesión en `<workspace>/iam-facea-page`.
2. Usá el [prompt y orden de lectura del handoff](./ai-handoff.md).
3. Inspeccioná Git en modo de sólo lectura y distinguí observaciones actuales de referencias históricas.
4. En la primera respuesta, resumí lo hecho, lo pendiente y el estado Git; después pedí el próximo alcance antes de escribir.
5. Si el cierre local del issue #3 ya fue revisado, pedí un alcance nuevo antes de commit, publicación o trabajo en las capacidades pendientes.

## Límite de la compuerta actual

El cierre actual alinea el subconjunto documental activo con la base local verificada sin autorizar su publicación. Las exclusiones reducen el riesgo de publicar material local, pero un `.gitignore` sólo afecta archivos no seguidos: no audita seguridad, no elimina contenido ya versionado y no purga historial.

No se realizó la revisión semántica o funcional de los 75 snapshots, PDFs, diagramas, contratos, prompts ni materiales legacy. Tampoco se aprobó su publicación. Evaluar si cada elemento se conserva como evidencia, se adapta o no se usa, y crear o actualizar documentación activa según requisitos validados, sigue siendo trabajo de la Etapa 10.

El [estado de migración](./migration-status.md), el [contrato aprobado de publicaciones MVP](./mvp-publications-contract-proposal.md), la [guía de referencias legacy](./legacy-reference.md), el [entorno local](../development/local-environment.md) y la [guía de Supabase](../../supabase/README.md) completan el contexto público. Los archivos locales ignorados son opcionales para tareas expresamente autorizadas y nunca deben cargarse o ejecutarse automáticamente.

## Key Learnings

1. La base local de publicaciones tiene veintiuna migraciones verificadas y cincuenta y dos pruebas aprobadas.
2. El helper SQL público no implementa un endpoint ni agrega una novena operación.
3. La autorización editorial falla cerrada porque el subject real continúa sin provisionar.
4. Las funciones Edge, Auth real, Blob, frontend, Cloud y despliegue siguen pendientes.
5. Todo el trabajo del issue tres permanece local, sin commit ni permiso de publicación.
