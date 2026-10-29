# Historial preservado del trabajo de migración

Este wrapper público registra cinco copias **byte a byte** capturadas desde el workspace legacy antes del traspaso documental. Los archivos raw están ignorados y permanecen locales. Son evidencia histórica e inerte: no son instrucciones activas, no reemplazan el [plan canónico](../migration-plan.md) y las tareas marcadas como completadas no deben volver a ejecutarse por haber sido copiadas.

- Raíz fuente portable: `<legacy-root>`.
- Momento de captura registrado (UTC): `2026-10-26T12:45:38Z`.
- Alcance: sólo el plan y los cuatro logs indicados; no se copiaron `.git`, `.env`, runtime, código, otros metadatos ni secretos de publicación.

| Ruta relativa en la fuente | Copia local preservada | Bytes | SHA256 |
| --- | --- | ---: | --- |
| `PLAN-MIGRACION-MONOREPO.md` | `docs/migration/work-history/PLAN-MIGRACION-MONOREPO-before-handover.md` | 15.745 | `af381d13b1e2d173c73e536ea72f9ebe7d222d13b1aa52ab042b989f4e5f75cb` |
| `odd/tasks/bootstrap-monorepo.md` | `docs/migration/work-history/bootstrap-monorepo.md` | 5.691 | `311f4f0b46e48fba5ad6644afd0649792f1cc2b50c22133f6e09b8660e59403e` |
| `odd/tasks/archive-migration-context.md` | `docs/migration/work-history/archive-migration-context.md` | 7.292 | `a098b645cbda888ef552337be981754323af41b68e129d4df53f42148c3638c0` |
| `odd/tasks/formalize-legacy-references.md` | `docs/migration/work-history/formalize-legacy-references.md` | 5.953 | `1e467b02f142b87c20e846fb14dc3b3f3d8fb14cf0bbd77b7850259877590eef` |
| `odd/tasks/initialize-supabase-local-config.md` | `docs/migration/work-history/initialize-supabase-local-config.md` | 5.701 | `2a3475e4e0eaa61b774a14c5c86a4eb7f7523af39dd651c9283db26581bb3408` |

Los cinco paths de copia son **LOCAL ONLY**. Si una tarea de verificación los necesita, primero confirmá que existen y obtené autorización de lectura. No son enlaces obligatorios ni contenido del checkout público esperado.

El nombre `before-handover` identifica el último plan completo anterior al cambio de autoridad. El plan de la raíz original ya fue reemplazado por un puntero verificado a `docs/migration/migration-plan.md`; este wrapper conserva procedencia, no una segunda autoridad.

Los hashes prueban identidad de bytes respecto de la captura verificada, no seguridad, privacidad, vigencia semántica ni aptitud para publicar. Su evaluación sigue pendiente dentro de la Etapa 10.
