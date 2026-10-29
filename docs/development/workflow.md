# Flujo de desarrollo

Cada cambio parte de una necesidad verificable y termina en revisión humana. El baseline inicial `a13911e` fue publicado en `main`; ese hecho histórico no demuestra el `HEAD` actual. Todavía no hay protección de ramas, CI ni automatización configurada.

## Política de ramas

| Rama | Uso | Estado actual conocido |
| --- | --- | --- |
| `main` | Línea estable | Conserva el baseline público inicial; no fue modificada por la preparación del handoff. |
| `develop` | Integración de unidades revisadas | Es el destino aprobado para la entrega documental; tracking, publicación y merge deben comprobarse. |
| `docs/mvp-publications-contract` | Excepción documental actual | Creada por el padre desde `a13911e` para un issue y un único PR autorizado; la entrega todavía no se afirma realizada. |
| `feat/*`, `fix/*`, `task/*` | Una unidad futura y acotada | Se crea sólo cuando empieza ese trabajo, desde la base acordada. |

La regla anterior de no crear una rama documental describía el handoff previo. La rama `docs/mvp-publications-contract` es una excepción explícita, acotada a esta publicación y no establece una política general. Cambiar la rama por defecto, modificar `main` o elegir otra estrategia requiere una decisión separada. Publicar o fusionar esta documentación no autoriza implementación posterior ni transfiere permiso a otra sesión.

## Camino habitual

1. **Issue o alcance acordado:** describir el problema y criterios de aceptación observables.
2. **Rama corta:** crear `feat/*`, `fix/*` o `task/*` al iniciar una unidad, normalmente desde `develop` una vez que su publicación esté verificada.
3. **Cambio coherente:** mantener código, documentación y migraciones relacionadas en la misma unidad; evitar refactors ajenos.
4. **Checks:** ejecutar los controles reales del área modificada y registrar fallas o controles no disponibles.
5. **Commit autorizado:** sólo con aprobación humana, crear un commit Conventional Commit que exprese el resultado.
6. **Pull request:** explicar intención, límites, evidencia y riesgos pendientes hacia la rama acordada.
7. **Revisión y merge:** corregir hallazgos, obtener aprobación y fusionar según las protecciones vigentes.

No hay runner de build o tests configurado. Hasta que cada aplicación declare el suyo, no se deben inventar comandos genéricos.

## Entrega documental actual

La persona usuaria autorizó preparar en `docs/mvp-publications-contract` commits pequeños, un issue, una excepción de tamaño para un único PR y su eventual merge hacia `develop`. Esas acciones pertenecen al padre y todavía no se documentan como realizadas. `main` queda intacta y el flujo debe detenerse después del merge, antes de implementar el contrato.

El padre debe revisar el allowlist, sus bytes y el historial antes de staging, commit o push; no debe usar `git add .`. `supabase/config.toml` fue generado localmente en el pasado, pero se excluye deliberadamente de esta entrega. La exclusión describe el alcance actual y no decide una política permanente para configuraciones futuras.

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
- [ ] La entrega actual excluye `supabase/config.toml` y se detiene antes de implementar el contrato MVP.

Volvé al [README](../../README.md) para el estado y al [handoff para IA](../migration/ai-handoff.md) para iniciar una sesión nueva.
