# Estado de la migración documental

El [plan canónico activo](./migration-plan.md) vive en este repositorio. El traspaso documental no completa el plan de producto: las Etapas 3 y 4 conservan evidencia local, la Etapa 5 tiene diseño aprobado y su tramo de base local verificado, y las Etapas 6 a 10 mantienen trabajo pendiente. El baseline público conocido es `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; no se usa como prueba del `HEAD` actual.

La implementación del issue #3 está local y sin commit en `feat/db-publications-schema`, con `HEAD` observado en `8d7c54b`. No hubo push, PR ni merge del issue #3 y no existe permiso de entrega pública. `main` queda fuera del alcance.

## Estado por etapa

| Etapa | Estado | Alcance |
| --- | --- | --- |
| 1 — Preservación | Parcial | Existe respaldo, pero no demuestra revisión completa de secretos, privacidad, licencias ni backup de PostgreSQL. |
| 2 — Monorepo mínimo | Publicada | El commit inicial `a13911e` fue publicado. Protección de ramas, CI, aplicaciones y automatizaciones no están configuradas. |
| 3 — Archivo y clasificación | Integridad local verificada | 75/75 hashes y tamaños coinciden. Las fuentes raw permanecen locales e ignoradas; la revisión semántica, funcional, de privacidad y licencias sigue pendiente. |
| 4 — Referencias legacy | Documentada y verificada localmente | La [guía activa](./legacy-reference.md) fija URL, commit, navegación y límites para Front y C#. No se clonó, ejecutó, modificó ni copió código legacy. |
| 5 — Publicaciones MVP | Base local y función images verificadas; etapa incompleta | Existen 22 migraciones, dos tablas, seed sintético, grants, RLS, borrado lógico, helper público SQL, función Edge images, adaptadores Memory/Blob, validador de imágenes y 98 pruebas (52 pgTAP + 46 Deno). Faltan funciones Edge de publicaciones (#5), identidad Auth real, recuperación, frontend, Cloud y despliegue. |
| 6 — Recorrido al frontend | Pendiente | 6.1 debe elegir entre ir directamente a la Etapa 7 o aprobar el puente opcional 6.2. Ninguna alternativa está implementada. |
| 7 — Frontend nuevo | Pendiente | Se construirá desde cero; Vite, Next.js u otra tecnología siguen abiertos y `apps/web` no existe. |
| 8 — Despliegues | Pendiente | No hay CI, despliegues, variables de entorno ni política operativa implementada. |
| 9 — Cierre de transición | Parcial | El puntero desde el workspace original fue verificado. Los sistemas y repositorios legacy siguen como referencias externas; no se autorizó retiro ni archivo. |
| 10 — Refinamiento | Pendiente | Conserva nueve tareas para evaluar fuentes locales, validar requisitos, adaptar contratos y crear o actualizar documentación activa. |

## Autoridad después del handover

- [`migration-plan.md`](./migration-plan.md) es la única guía activa y canónica del plan completo.
- [`mvp-publications-contract-proposal.md`](./mvp-publications-contract-proposal.md) es el contrato de diseño aprobado de la primera capacidad y registra qué tramo local está implementado; no prueba API ni despliegue.
- [`handover.md`](./handover.md) resume el punto de reentrada; leerlo no autoriza acciones.
- [`ai-handoff.md`](./ai-handoff.md) contiene el orden de lectura y el prompt para una sesión nueva.
- [`work-history/README.md`](./work-history/README.md) conserva hashes y procedencia de cinco copias históricas locales. Las copias no deben ejecutarse ni publicarse por inercia.
- El plan del workspace original ya fue sustituido por un puntero verificado a esta documentación.
- Si existe localmente, `odd/tasks/db-publications-schema.md` registra la unidad del issue #3; `odd/` no es parte del checkout público esperado.

## Límites de la Etapa 3

- `docs/archive/migration-sources/` es archivo local no normativo. Sólo su [wrapper público](../archive/migration-sources/README.md) forma parte del allowlist propuesto.
- El snapshot local `docs/archive/migration-sources/root/PLAN-MIGRACION-MONOREPO.md` refleja una captura histórica y no es autoridad actual.
- El último plan completo previo al handover se conserva localmente como `docs/migration/work-history/PLAN-MIGRACION-MONOREPO-before-handover.md`; su hash figura en el wrapper público.
- ADR, políticas y contratos del backend describen decisiones del diseño C# legado; no deciden automáticamente Supabase. Los contratos de usuarios no prueban autenticación implementada.
- OpenSpec y tareas preservan evidencia histórica de pruebas; no se afirma que esas pruebas pasen hoy.
- SQL, Postman, prompts, skills y wrappers archivados son referencias inertes y no deben ejecutarse ni cargarse automáticamente.

## Revisiones pendientes

1. **Cierre local del issue #3:** revisar el diff de fuente y documentación antes de decidir commits o entrega. `supabase/config.toml` permanece local e ignorado; los ignores reducen riesgo accidental, pero no son una auditoría ni purgan historial.
2. **Seguridad histórica:** revisar SQL, Postman, autenticación simulada y contratos antes de reutilizarlos; esto permanece en la Etapa 10.
3. **Visual, privacidad y licencias:** PDFs, diagramas e imágenes continúan en cuarentena local. Algunas imágenes pueden mostrar personas identificables; no están aprobadas para publicación.
4. **Producto fuera del MVP aprobado:** validar Screen Map, frontend y otros flujos. El archivo raw sigue mezclando propuestas, UI histórica, prompts y supuestos; no reabre el contrato de publicaciones ya aceptado.
5. **Implementación restante:** completar funciones Edge, Auth real, almacenamiento, pruebas HTTP e integración sólo con otra autorización. Las migraciones y RLS locales ya verificadas no prueban esos tramos ni un despliegue. La evaluación semántica integral del material histórico permanece en la Etapa 10.

## Fuentes de control públicas

- [Plan canónico](./migration-plan.md)
- [Handoff para IA](./ai-handoff.md)
- [Handover de configuración](./handover.md)
- [Guía de referencias legacy](./legacy-reference.md)
- [Contrato aprobado de publicaciones MVP](./mvp-publications-contract-proposal.md)
- [Advertencia del archivo](../archive/migration-sources/README.md)
- [Procedencia del historial local](./work-history/README.md)

El inventario `docs/migration/source-inventory.md` y el manifest `docs/migration/source-manifest.json` son evidencia local opcional e ignorada. Sólo deben consultarse con alcance de lectura explícito y no son requisitos para usar el checkout público.

Las operaciones actuales de la base local se describen en [`supabase/README.md`](../../supabase/README.md), mientras [`docs/development/local-environment.md`](../development/local-environment.md) conserva observaciones históricas del entorno. `supabase/config.toml` no forma parte de una entrega pública. Ningún documento autoriza publicar, desplegar o continuar con las capacidades pendientes.
