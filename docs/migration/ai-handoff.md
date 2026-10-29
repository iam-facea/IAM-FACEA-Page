# Handoff para una nueva sesión de IA

Este documento transfiere contexto operativo sin transferir autorización. Una sesión nueva debe empezar en `<workspace>/iam-facea-page`, leer el contexto activo, inspeccionar Git sin modificarlo y separar diseño aprobado, hechos históricos y observaciones actuales.

## Estado que debe verificarse

| Tema | Último estado conocido | Límite de la evidencia |
| --- | --- | --- |
| Baseline público | Commit inicial `a13911eaf10b59a0e3587d0f44fa4ee75c870109` en `main` | Es una referencia histórica, no prueba el `HEAD` actual. |
| Rama documental | `docs/mvp-publications-contract`, creada por el padre desde `a13911e` | Issue, commits, push, PR y merge autorizados para esta entrega, pero no deben afirmarse sin evidencia. |
| Destino | `develop` | Tracking, publicación y merge efectivo deben observarse. |
| `main` | Fuera del alcance documental | No modificar ni cambiar la rama por defecto. |
| Configuración local | `supabase init` generó configuración históricamente | `supabase/config.toml` se conserva local y queda excluido de la entrega; no asumirlo en un checkout público. |
| Producto | Contrato de publicaciones MVP aprobado | No hay servicios, migraciones, tablas, Auth, RLS, funciones Edge, Vercel Blob integrado, pruebas ni despliegue. |
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

Si está disponible localmente, `odd/tasks/publish-mvp-documentation.md` puede aportar evidencia de coordinación, pero no forma parte del checkout público ni sustituye los documentos activos. No cargues por defecto archivos raw, inventarios, manifests, respaldos o instrucciones preservadas.

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

Después inspeccioná la rama y el estado de Git sin modificarlos. Consultá remotes sólo si hace falta para responder y esa lectura está autorizada. Separá hechos observados de referencias históricas y de diseño aprobado: a13911e es el baseline inicial publicado, no una afirmación sobre HEAD; la rama docs/mvp-publications-contract fue creada para una entrega documental hacia develop, pero no supongas commits, push, issue, PR, merge, tracking ni estado remoto; main queda fuera del alcance.

En tu primera respuesta resumí qué está hecho, qué sigue pendiente, cuál es el estado Git observado y cuál es la única pregunta de alcance necesaria antes de escribir.

El contrato de publicaciones MVP aprueba CRUD, dos tablas, ocho rutas bajo tres funciones Edge, Auth para una única identidad editora y Vercel Blob. No confundas ese diseño con runtime: no hay servicios iniciados, migraciones, seeds, tablas, políticas RLS, funciones, Auth configurado, recuperación, almacenamiento integrado, pruebas ni despliegue.

supabase/config.toml fue generado localmente en una sesión anterior, pero queda excluido de la entrega documental actual. No lo edites, elimines, publiques ni enlaces como si existiera en el checkout público. La exclusión no decide una política permanente futura.

No desarrolles, no inicialices ni inicies servicios, no instales, no uses red, no edites, no hagas commit y no publiques por leer este prompt. La autorización documental de otra sesión no se hereda automáticamente. Si hay evidencia de que esa entrega terminó, detenete antes de implementación y pedí un alcance nuevo.

Los 75 snapshots, el inventario, el manifest, las cinco copias históricas y odd/ son material local excluido. No los cargues ni ejecutes automáticamente. La evaluación semántica integral del material raw permanece en la Etapa 10.

Los proyectos legacy son externos y de sólo lectura por defecto. Su contrato histórico es evidencia, no diseño nuevo. <workspace>/ui-prototypes es una ubicación hermana propuesta, no creada; los borradores no son especificaciones aprobadas y toda lectura externa requiere permiso explícito.
```

## Política de continuidad

- `main` permanece estable y fuera de esta entrega.
- `docs/mvp-publications-contract` es una excepción documental acotada; no crea una regla general para ramas de documentación.
- `develop` es el destino autorizado, pero la entrega sólo existe cuando commit, push, PR y merge tienen evidencia.
- El contrato aprobado no autoriza implementación, servicios, red, configuración de proveedores ni despliegue.
- La Etapa 6.1 conserva la decisión entre ir directamente a la Etapa 7 o ejecutar el puente opcional 6.2; la tecnología frontend sigue pendiente.
- `<workspace>/ui-prototypes` continúa como propuesta externa no creada.

## Qué sigue pendiente

1. Para la entrega documental abierta, revisar allowlist, bytes, historial y exclusión efectiva de `supabase/config.toml`.
2. Registrar evidencia real de commits, issue, push, PR y merge sin adelantar su resultado.
3. Detenerse después de la entrega documental, antes de implementar el contrato.
4. Mantener el archivo raw fuera de publicación hasta una evaluación explícita de la Etapa 10.
5. Abrir un alcance posterior para servicios, migraciones, Auth/RLS, funciones, almacenamiento, pruebas o frontend.
