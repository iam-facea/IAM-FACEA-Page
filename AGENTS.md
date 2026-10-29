# Instrucciones para agentes

Este repositorio todavía no tiene runtime de aplicación. Antes de proponer o editar, verificá qué existe realmente; no deduzcas herramientas, comandos, decisiones ni autorización a partir de la estructura futura.

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
12. [Contrato aprobado de publicaciones MVP](./docs/migration/mvp-publications-contract-proposal.md): diseño vigente, todavía no implementado.
13. [Handover](./docs/migration/handover.md): raíz de reentrada, límites y próximos pasos autorizables.
14. [Configuración local de Supabase](./supabase/README.md): historia de inicialización, sin runtime ni configuración pública incluida.

Para una sesión nueva, usá además el [handoff para IA](./docs/migration/ai-handoff.md), que contiene un prompt copiable y este mismo orden. Si existe localmente, `odd/tasks/publish-mvp-documentation.md` aporta evidencia de la unidad actual, pero es opcional y no forma parte de la publicación.

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

`main` es la rama estable y permanece fuera de esta entrega. `develop` es la rama de integración prevista, pero su estado remoto y cualquier merge deben verificarse, no suponerse. Como excepción documental autorizada para el alcance actual, existe `docs/mvp-publications-contract`, creada desde el baseline indicado por la persona usuaria para preparar un issue y un único PR hacia `develop`. La restricción anterior de no crear una rama documental correspondía al handoff previo; no invalida esta excepción concreta. No afirmes que hubo commits, push, PR o merge hasta observar su evidencia.

Fuera de esta excepción, las ramas `feat/*`, `fix/*` o `task/*` se crean desde la base acordada sólo cuando comienza su trabajo y no por adelantado. Cambiar la rama por defecto o modificar `main` exige una decisión separada.

## Criterio técnico

La autorización se aplica en el servidor y/o mediante RLS; ocultar controles en la interfaz no constituye autorización. Las migraciones compartidas deben conservar compatibilidad durante despliegues independientes y seguir un enfoque expand/contract.

La configuración creada históricamente por `supabase init` no equivale a runtime iniciado ni a configuración endurecida para producción. `supabase/config.toml` permanece local y está excluido deliberadamente de la entrega documental actual; no asumas que existe en un checkout público ni enlaces documentación hacia ese archivo.

El diseño de la primera capacidad ya está aprobado en el contrato de publicaciones MVP: esquema de dos tablas, ocho operaciones, tres funciones Edge, Auth para una única identidad editora, RLS y Vercel Blob como proveedor inicial. Nada de eso está implementado, configurado, probado ni desplegado. La autorización se aplica al subject exacto en servidor y RLS; validar sólo un JWT u ocultar controles en la interfaz no constituye autorización.

Documentá las verificaciones realmente ejecutadas. Si todavía no hay herramientas o runner, indicá que el control no aplica en vez de inventar un comando.
