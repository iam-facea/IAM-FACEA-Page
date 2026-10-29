# Flujo de desarrollo

Cada cambio parte de una necesidad verificable y termina en revisión humana. El baseline inicial `a13911e` fue publicado en `main`; ese hecho histórico no demuestra el `HEAD` actual. Todavía no hay protección de ramas, CI ni automatización configurada.

## Política de ramas

| Rama | Uso | Estado actual conocido |
| --- | --- | --- |
| `main` | Línea estable | Conserva el baseline público inicial; no fue modificada por la preparación del handoff. |
| `develop` | Integración de unidades revisadas | Fue el destino aprobado para la entrega documental; su estado remoto y cualquier entrega posterior deben comprobarse. |
| `docs/mvp-publications-contract` | Excepción documental histórica | Fue creada por el padre desde `a13911e` para un issue y un único PR autorizado; esa autorización no se transfiere al issue #3. |
| `feat/db-publications-schema` | Implementación local del issue #3 | Trabajo observado sobre `8d7c54b`, todavía sin commit ni permiso de publicación. |
| `feat/*`, `fix/*`, `task/*` | Una unidad futura y acotada | Se crea sólo cuando empieza ese trabajo, desde la base acordada. |

La regla anterior de no crear una rama documental describía el handoff previo. La rama `docs/mvp-publications-contract` fue una excepción explícita, acotada a aquella publicación, y no establece una política general. Cambiar la rama por defecto, modificar `main` o elegir otra estrategia requiere una decisión separada. La implementación local del issue #3 no autoriza commit, push, PR ni merge.

## Camino habitual

1. **Issue o alcance acordado:** describir el problema y criterios de aceptación observables.
2. **Rama corta:** crear `feat/*`, `fix/*` o `task/*` al iniciar una unidad, normalmente desde `develop` una vez que su publicación esté verificada.
3. **Cambio coherente:** mantener código, documentación y migraciones relacionadas en la misma unidad; evitar refactors ajenos.
4. **Checks:** ejecutar los controles reales del área modificada y registrar fallas o controles no disponibles.
5. **Commit autorizado:** sólo con aprobación humana, crear un commit Conventional Commit que exprese el resultado.
6. **Pull request:** explicar intención, límites, evidencia y riesgos pendientes hacia la rama acordada.
7. **Revisión y merge:** corregir hallazgos, obtener aprobación y fusionar según las protecciones vigentes.

La base local tiene checks reales: `supabase test db` pasó 50 pruebas y `supabase db lint --local --level warning` no informó hallazgos en la verificación independiente. La [guía de Supabase](../../supabase/README.md) documenta su uso y el [estado de migración](../migration/migration-status.md) delimita el alcance. Todavía no hay aplicación ni runner de build, funciones Edge o tests HTTP; no se deben inventar comandos genéricos para esas áreas.

## Entrega documental histórica

La persona usuaria autorizó preparar en `docs/mvp-publications-contract` commits pequeños, un issue, una excepción de tamaño para un único PR y su eventual merge hacia `develop`. Esa autorización pertenecía a la entrega documental y no se hereda para publicar la implementación del issue #3. `main` queda intacta; cualquier commit, push, PR o merge actual requiere autorización propia y evidencia posterior.

Para aquella entrega, el padre debía revisar el allowlist, sus bytes y el historial antes de staging, commit o push, sin usar `git add .`. `supabase/config.toml` había sido generado localmente, pero se excluía deliberadamente de esa entrega. Hoy continúa local e ignorado; esa exclusión no decide una política permanente para configuraciones futuras.

Los 75 snapshots, el inventario, el manifest, cinco copias raw y `odd/` permanecen locales e ignorados. `.gitignore` sólo evita agregar archivos no seguidos por accidente: no audita el contenido, no elimina archivos ya versionados ni purga historial. La publicación del archivo histórico no está aprobada.

## Compatibilidad entre entregas

Las aplicaciones y los cambios de datos no se despliegan atómicamente. Cuando una migración afecte contratos compartidos:

1. **Expandir:** agregar estructuras compatibles sin retirar las existentes.
2. **Migrar:** actualizar datos y consumidores, verificando versiones coexistentes.
3. **Contraer:** eliminar lo anterior sólo después de confirmar que ya no tiene consumidores.

Las decisiones de interfaz no sustituyen controles de acceso. La autorización debe aplicarse en el servidor y/o mediante RLS; nunca se publica una clave `service_role` con variables `VITE_*`, `NEXT_PUBLIC_*` ni otro canal cliente.

## Checklist de revisión

- [ ] El alcance tiene criterios de aceptación claros.
- [ ] La rama fue creada al iniciar el trabajo desde la base acordada.
- [ ] El cambio se limita a una unidad coherente y no adopta el legado sin validación.
- [ ] El subconjunto real y su historial fueron inspeccionados; no se confió sólo en ignores o regex.
- [ ] No contiene secretos ni datos reales conocidos.
- [ ] Los checks ejecutados y los no disponibles están declarados.
- [ ] Las migraciones preservan compatibilidad durante despliegues independientes.
- [ ] Commit, publicación y acciones remotas cuentan con autorización humana vigente y evidencia posterior.
- [ ] Cualquier entrega excluye `supabase/config.toml` y cuenta con autorización propia; la implementación local no concede permiso de publicación.

Volvé al [README](../../README.md) para el estado y al [handoff para IA](../migration/ai-handoff.md) para iniciar una sesión nueva.
