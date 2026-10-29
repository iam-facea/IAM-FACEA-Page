# Handoff para una nueva sesión de IA

Este documento transfiere contexto operativo sin transferir autorización. Una sesión nueva debe empezar en `<workspace>/iam-facea-page`, leer el contexto activo, inspeccionar Git sin modificarlo y separar diseño aprobado, hechos históricos y observaciones actuales.

## Estado que debe verificarse

| Tema | Último estado conocido | Límite de la evidencia |
| --- | --- | --- |
| Baseline público | Commit inicial `a13911eaf10b59a0e3587d0f44fa4ee75c870109` en `main` | Es una referencia histórica, no prueba el `HEAD` actual. |
| Rama de implementación | `feat/db-publications-schema`, con `HEAD` observado en `8d7c54b` | Los cambios del issue #3 están locales y sin commit; no hubo push, PR ni merge y no existe permiso de entrega pública. |
| Destino eventual | Sin autorización vigente | Cualquier commit, publicación o merge requiere una decisión nueva y evidencia posterior. |
| `main` | Fuera del alcance documental | No modificar ni cambiar la rama por defecto. |
| Configuración local | `supabase init` generó configuración históricamente | `supabase/config.toml` se conserva local y queda excluido de la entrega; no asumirlo en un checkout público. |
| Producto | Contrato de publicaciones MVP aprobado; base local verificada | Hay 21 migraciones, dos tablas, seed, grants, RLS, borrado lógico y pruebas DB; faltan Auth real, funciones Edge, Blob, HTTP, frontend, Cloud y despliegue. |
| Material local | 75 snapshots, inventario, manifest, cinco copias históricas y `odd/` | Está ignorado y no fue aprobado para publicación ni revisión semántica integral. |

La exclusión de Git evita agregar material no seguido por accidente, pero no audita contenido, no retira archivos ya versionados y no purga historial.

## Orden de lectura completo

Leé estos paths relativos y portables, en este orden:

1. [`AGENTS.md`](../../AGENTS.md)
2. [`README.md`](../../README.md)
3. [`CONTEXT.md`](../../CONTEXT.md)
4. [`docs/architecture/overview.md`](../architecture/overview.md)
5. [`docs/adr/0001-product-monorepo.md`](../adr/0001-product-monorepo.md)
6. [`docs/development/workflow.md`](../development/workflow.md)
7. [`docs/development/local-environment.md`](../development/local-environment.md)
8. [`docs/migration/migration-plan.md`](./migration-plan.md)
9. [`docs/migration/migration-status.md`](./migration-status.md)
10. [`docs/migration/legacy-reference.md`](./legacy-reference.md)
11. [`docs/migration/legacy-backend-contract.md`](./legacy-backend-contract.md)
12. [`docs/migration/mvp-publications-contract-proposal.md`](./mvp-publications-contract-proposal.md)
13. [`docs/migration/handover.md`](./handover.md)
14. [`supabase/README.md`](../../supabase/README.md)

Si está disponible localmente y el alcance corresponde al issue #3, `odd/tasks/db-publications-schema.md` puede aportar evidencia de coordinación, pero no forma parte del checkout público ni sustituye los documentos activos. No cargues por defecto archivos raw, inventarios, manifests, respaldos o instrucciones preservadas.

## Prompt copiable

```text
Estás retomando IAM FACEA desde la raíz portable <workspace>/iam-facea-page.

Primero trabajá únicamente en modo de sólo lectura. Leé, en este orden exacto:
1. AGENTS.md
2. README.md
3. CONTEXT.md
4. docs/architecture/overview.md
5. docs/adr/0001-product-monorepo.md
6. docs/development/workflow.md
7. docs/development/local-environment.md
8. docs/migration/migration-plan.md
9. docs/migration/migration-status.md
10. docs/migration/legacy-reference.md
11. docs/migration/legacy-backend-contract.md
12. docs/migration/mvp-publications-contract-proposal.md
13. docs/migration/handover.md
14. supabase/README.md

Después inspeccioná la rama y el estado de Git sin modificarlos. Consultá remotes sólo si hace falta para responder y esa lectura está autorizada. Separá hechos observados de referencias históricas y de diseño aprobado: a13911e es el baseline inicial publicado, no una afirmación sobre HEAD; el último estado conocido del issue #3 es feat/db-publications-schema en HEAD 8d7c54b, con implementación local sin commit y sin push, PR, merge ni permiso de entrega pública; main queda fuera del alcance.

En tu primera respuesta resumí qué está hecho, qué sigue pendiente, cuál es el estado Git observado y cuál es la única pregunta de alcance necesaria antes de escribir.

El contrato de publicaciones MVP aprueba CRUD, dos tablas, ocho rutas bajo tres funciones Edge, Auth para una única identidad editora y Vercel Blob. No confundas el diseño completo con el tramo implementado: la base local tiene 21 migraciones, dos tablas, seed sintético, RLS, grants, borrado lógico, helper público SQL y pruebas DB; no hay identidad Auth real, funciones Edge, contrato HTTP probado, recuperación, Blob, frontend, Cloud ni despliegue. El helper SQL no es un endpoint ni una novena acción.

supabase/config.toml fue generado localmente en una sesión anterior, permanece ignorado y conservó su contenido durante la implementación DB. No fue endurecido para producción: sus defaults no prueban signup deshabilitado ni preparación de Auth. No lo edites, elimines, publiques ni enlaces como si existiera en el checkout público.

No desarrolles, no inicies servicios, no instales, no uses red, no edites, no hagas commit y no publiques por leer este prompt. Las autorizaciones de otra sesión no se heredan automáticamente. Primero verificá el estado local y pedí un alcance nuevo para cualquier continuación.

Los 75 snapshots, el inventario, el manifest, las cinco copias históricas y odd/ son material local excluido. No los cargues ni ejecutes automáticamente. La evaluación semántica integral del material raw permanece en la Etapa 10.

Los proyectos legacy son externos y de sólo lectura por defecto. Su contrato histórico es evidencia, no diseño nuevo. <workspace>/ui-prototypes es una ubicación hermana propuesta, no creada; los borradores no son especificaciones aprobadas y toda lectura externa requiere permiso explícito.
```

## Política de continuidad

- `main` permanece estable y fuera de esta entrega.
- `feat/db-publications-schema` contiene el trabajo local conocido del issue #3; no deduzcas commits ni entrega a partir de la rama.
- No existe permiso vigente de entrega pública: commit, push, PR y merge requieren autorización y evidencia propias.
- El contrato aprobado y la base local verificada no autorizan funciones Edge, proveedores, Cloud ni despliegue.
- La Etapa 6.1 conserva la decisión entre ir directamente a la Etapa 7 o ejecutar el puente opcional 6.2; la tecnología frontend sigue pendiente.
- `<workspace>/ui-prototypes` continúa como propuesta externa no creada.

## Qué sigue pendiente

1. Revisar el diff local completo del issue #3 y confirmar que `supabase/config.toml` sigue fuera de cualquier entrega.
2. Decidir por separado commits, cierre del issue y publicación; no adelantar push, PR ni merge.
3. Abrir alcances posteriores para funciones Edge, contrato HTTP, Auth real, recuperación, Blob, frontend, Cloud o despliegue.
4. Mantener el archivo raw fuera de publicación hasta una evaluación explícita de la Etapa 10.
5. No tratar fixtures Auth transaccionales como provisión de una identidad real.
