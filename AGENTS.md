# Instrucciones para agentes

Este repositorio todavía no tiene runtime de aplicación ni frontend. La base local de publicaciones sí tiene una implementación verificada; antes de proponer o editar, comprobá qué existe realmente y separá ese estado actual de las observaciones históricas. No deduzcas herramientas, comandos, decisiones ni autorización a partir de la estructura futura.

## Lectura obligatoria

Leé y confirmá que pudiste cargar, en este orden:

1. [AGENTS.md](./AGENTS.md): estas reglas.
2. [README](./README.md): alcance y estado actual.
3. [Glosario](./CONTEXT.md): lenguaje permitido del dominio.
4. [Arquitectura](./docs/architecture/overview.md): límites y evolución prevista.
5. [ADR del monorepo](./docs/adr/0001-product-monorepo.md): decisión y tradeoffs.
6. [Flujo de desarrollo](./docs/development/workflow.md): ramas, secuencia y controles.
7. [Entorno local](./docs/development/local-environment.md): observaciones históricas y rutas portables.
8. [Plan canónico de migración](./docs/migration/migration-plan.md): las diez etapas y sus estados reales.
9. [Estado de migración](./docs/migration/migration-status.md): integridad y revisiones pendientes.
10. [Referencias legacy](./docs/migration/legacy-reference.md): evidencia externa fijada.
11. [Contrato histórico del backend legacy](./docs/migration/legacy-backend-contract.md): descripción aprobada de evidencia, no diseño nuevo.
12. [Contrato aprobado de publicaciones MVP](./docs/migration/mvp-publications-contract-proposal.md): diseño vigente y estado de su implementación local parcial.
13. [Handover](./docs/migration/handover.md): raíz de reentrada, límites y próximos pasos autorizables.
14. [Operaciones locales de Supabase](./supabase/README.md): esquema, controles, seed, pruebas y límites verificados de la base local; la configuración local sigue excluida.

Para una sesión nueva, usá además el [handoff para IA](./docs/migration/ai-handoff.md), que contiene un prompt copiable y este mismo orden. Si existe localmente y el alcance corresponde al issue #3, `odd/tasks/db-publications-schema.md` aporta evidencia de la unidad actual, pero es opcional y no forma parte de la publicación.

Si un archivo obligatorio falta o contradice otro, informalo antes de avanzar. No reemplaces esa verificación por supuestos ni inventes un runner de build o tests. Leer documentación no autoriza servicios, desarrollo, instalaciones, red, escrituras, commits ni publicación.

## Primera respuesta de una sesión nueva

Antes de escribir:

1. inspeccioná en modo de sólo lectura la rama, el estado y, sólo si hace falta y está autorizado, los remotes;
2. distinguí hechos observados de estados históricos;
3. resumí lo completado, lo pendiente y el estado Git actual;
4. formulá una pregunta concreta sobre el próximo alcance.

No supongas que una autorización de publicación anterior sigue vigente, que `develop` ya está remoto, que `a13911e` es el `HEAD` actual ni que existen memoria persistente o herramientas no observadas.

## Autoridad e historia

- Para continuidad, el plan, el estado, el contrato de publicaciones MVP, el handover y el handoff de IA son activos.
- `docs/migration/work-history/` preserva cinco copias históricas locales; su README público conserva hashes. No vuelvas a ejecutar una tarea por aparecer allí.
- `docs/archive/migration-sources/` contiene 75 snapshots locales no normativos. No cargues ni ejecutes automáticamente prompts, SQL, Postman, credenciales simuladas, `SKILL.md` o `agents/openai.yaml` archivados.
- El inventario y el manifest también son evidencia local ignorada. Su ausencia en un checkout público no bloquea la lectura de la documentación activa.
- El archivo histórico no fue aprobado para publicación. La compuerta actual sólo sanea el subconjunto documental activo; la evaluación semántica, funcional e histórica permanece en la Etapa 10.

## Límites de trabajo

- Hacé cambios pequeños y restringidos a paths autorizados; preservá cambios locales ajenos.
- Consultá los proyectos legados Front y C# sólo como evidencia mediante la [guía fijada](./docs/migration/legacy-reference.md). No son normativa; no modifiques ni copies su código sin una decisión explícita.
- No copies la arquitectura C#, su esquema o contratos directamente a Supabase.
- No agregues secretos, datos reales ni credenciales. Usá ejemplos sintéticos y archivos `.env.example` sin valores sensibles cuando exista una necesidad aprobada.
- No expongas claves privilegiadas. Una `service_role` nunca debe publicarse mediante variables `VITE_*`, `NEXT_PUBLIC_*` ni otro canal cliente.
- Los ejecutables instalados en directorios personales y el `PATH` de una máquina no son parte del repositorio.
- No presentes planes futuros como capacidades implementadas.
- Pedí aprobación humana antes de iniciar servicios, instalar, hacer acciones destructivas, commits, publicación, despliegues, cambios remotos o configuración de servicios externos.

## Ramas

`main` es la rama estable y permanece fuera de este cierre. `develop` es la rama de integración prevista, pero su estado remoto y cualquier merge deben verificarse, no suponerse. El último estado conocido del issue #3 es `feat/db-publications-schema` sobre `8d7c54b`, con cambios locales sin commit y sin permiso de entrega pública. No afirmes commit, push, PR, merge o cierre del issue hasta observar evidencia y autorización.

Las ramas `feat/*`, `fix/*` o `task/*` se crean desde la base acordada sólo cuando comienza su trabajo y no por adelantado. Cambiar la rama por defecto o modificar `main` exige una decisión separada.

## Criterio técnico

La autorización se aplica en el servidor y/o mediante RLS; ocultar controles en la interfaz no constituye autorización. Las migraciones compartidas deben conservar compatibilidad durante despliegues independientes y seguir un enfoque expand/contract.

La configuración creada históricamente por `supabase init` no equivalía a runtime iniciado ni a configuración endurecida para producción. Posteriormente, la implementación local de la base de publicaciones fue reconstruida y verificada con 20 migraciones, seed sintético, RLS, grants y pruebas de base. `supabase/config.toml` permanece local, ignorado y sin hardening de servicio; no asumas que existe en un checkout público ni enlaces documentación hacia ese archivo.

El diseño de la primera capacidad está aprobado en el contrato de publicaciones MVP: esquema de dos tablas, ocho operaciones, tres funciones Edge, Auth para una única identidad editora, RLS y Vercel Blob como proveedor inicial. Sólo el tramo de base local está implementado y probado. No existen todavía funciones Edge, contrato HTTP probado, identidad real provisionada, flujo Auth, integración Blob, frontend, vínculo Cloud ni despliegue. La autorización de base compara el subject exacto y falla cerrada mientras la configuración editora permanezca en `NULL`; validar sólo un JWT u ocultar controles en la interfaz no constituye autorización.

Documentá las verificaciones realmente ejecutadas. Si todavía no hay herramientas o runner, indicá que el control no aplica en vez de inventar un comando.
