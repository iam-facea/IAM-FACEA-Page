# IAM FACEA — Plan canónico de migración al monorepo

## Objetivo y alcance

Organizar la transición al monorepo de producto `<workspace>/iam-facea-page`, que contendrá el futuro frontend, Supabase y la documentación vigente, mientras conserva el contexto y la historia de los repositorios anteriores.

Este es el **plan activo y canónico**. Su lectura no ejecuta ni autoriza automáticamente ninguna etapa: antes de cada trabajo se debe inspeccionar el estado real, definir alcance y obtener la autorización correspondiente. No mover, borrar, publicar, iniciar servicios ni archivar repositorios por el solo hecho de aparecer aquí.

El traspaso documental sólo termina la preparación organizativa de la sesión anterior. No completa el plan de producto ni autoriza desarrollo funcional. La captura íntegra del plan previo y el historial de tareas están en [`work-history/`](./work-history/README.md); son evidencia histórica, no planes alternativos.

## Decisiones y propuestas

| Tema | Estado |
| --- | --- |
| Usar un monorepo para el producto nuevo | Decidido |
| Ubicación del producto | Confirmada: `<workspace>/iam-facea-page`, dentro de un contenedor local no versionado |
| Conservar el workspace original durante la transición | Recomendado; el cambio de punto de trabajo lo realiza la persona usuaria después del traspaso |
| Mantener el backend C# fuera del monorepo como referencia | Recomendado; consultar mediante la [guía fijada](./legacy-reference.md) |
| Construir el frontend definitivo desde cero | Decidido; la tecnología sigue pendiente |
| Primera capacidad: publicaciones MVP | Diseño aprobado; base local implementada y verificada, mientras funciones Edge, Auth real, Blob, HTTP y despliegue siguen pendientes |
| Elegir Vite, Next.js u otra tecnología adecuada | Pendiente; no bloquea el contrato backend aprobado |
| Realizar un puente temporal de aprendizaje | Opcional; sólo si aporta evidencia útil antes del frontend definitivo |

## Reglas para preservar el contexto

- No eliminar ni sobrescribir los originales durante la migración.
- Preservar cambios sin commit y archivos sin seguimiento antes de mover contenido.
- Registrar repositorio, commit y ruta de procedencia de las referencias trasladadas.
- Distinguir requisitos vigentes, propuestas, código implementado y documentación histórica.
- Mantener una única fuente canónica para cada documento activo.
- Revisar secretos y datos personales antes de versionar material.
- No copiar carpetas `.git`, dependencias, builds, dumps ni archivos de entorno al monorepo.
- No copiar automáticamente la arquitectura C#, su esquema ni sus contratos al producto nuevo.
- Marcar un paso como completado solamente después de verificar su resultado.

## Estructura actual y prevista

La estructura muestra el límite actual y los lugares previstos; no implica que las carpetas futuras ya existan.

```text
<legacy-root>/                                  # Workspace externo, conservado
├── FACEA-landing-page-Frontend/                # Repo legacy, sólo lectura por defecto
└── FACEA-landing-page-Backend/                 # Repo legacy, sólo lectura por defecto

<workspace>/                                    # Contenedor local sin Git
└── iam-facea-page/                             # Este repo Git del producto
    ├── README.md
    ├── AGENTS.md
    ├── CONTEXT.md
    ├── apps/
    │   └── web/                               # Futuro; crear tras elegir frontend
    ├── supabase/
    │   ├── config.toml                        # Sólo local; excluida de la entrega actual
    │   ├── migrations/                        # 22 migraciones locales de la base de publicaciones
    │   ├── seed.sql                           # Tres fixtures sintéticos de desarrollo
    │   ├── functions/                         # Edge Functions (images implementada con tests)
    │   └── tests/                             # Cinco archivos pgTAP de base
    ├── docs/
    │   ├── product/                           # Futuro; tras validar requisitos
    │   ├── architecture/
    │   ├── adr/
    │   ├── migration/
    │   │   ├── migration-plan.md              # Este plan canónico
    │   │   ├── handover.md
    │   │   ├── work-history/                  # Wrapper público; copias locales
    │   │   ├── source-inventory.md            # Evidencia local ignorada
    │   │   ├── legacy-reference.md
    │   │   └── migration-status.md
    │   └── archive/
    │       └── migration-sources/              # Wrapper público; snapshots locales
    └── .github/
        └── workflows/                         # Futuro; cuando existan checks reales
```

No es necesario crear carpetas vacías. No se incorpora tooling de monorepo ni paquetes compartidos por anticipado.

## Hito de traspaso documental de configuración

Este hito separado registra la continuidad de la preparación; no agrega una etapa funcional ni completa las Etapas 1 o 5–10.

- [x] Preservar byte a byte el último plan original y cuatro tareas completadas en [`work-history/`](./work-history/README.md).
- [x] Crear este plan activo y el [handover de sesión](./handover.md) dentro del repositorio nuevo.
- [x] Registrar históricamente la configuración local observada sin iniciar servicios ni instalar herramientas; `supabase/config.toml` queda fuera de la entrega documental actual.
- [x] Reemplazar el plan de la raíz original por un puntero verificado a este plan; el control previo al corte resultó satisfactorio.
- [ ] Abrir una nueva sesión de IA en la raíz de este repositorio antes de cualquier trabajo funcional.

Para una sesión nueva, la entrada activa es el [handoff para IA](./ai-handoff.md). Si existe localmente, `odd/tasks/prepare-safe-ai-handoff.md` conserva evidencia de esta compuerta, pero `odd/` está ignorado y no forma parte de la publicación.

## Etapa 1 — Preservar el estado actual

- [ ] Reinspeccionar ramas, remotes, cambios locales y archivos sin seguimiento de los tres repositorios actuales.
- [ ] Identificar documentación que existe únicamente en la raíz.
- [ ] Revisar secretos, datos personales y configuración sensible.
- [ ] Definir qué cambios deben consolidarse en sus repositorios de origen y cuáles requieren respaldo separado.
- [ ] Realizar los commits o respaldos acordados y verificar que permiten recuperar el contenido.
- [ ] Registrar commits de referencia y cualquier material respaldado fuera de Git.

**Resultado esperado:** una base recuperable antes de crear o trasladar contenido.

### Estado observado en la inspección previa

Este registro es histórico y no reemplaza una nueva comprobación:

- La raíz original era un repositorio Git sin commits, sin archivos versionados y sin remote configurado.
- El frontend estaba en `develop`, con `.gitignore` modificado.
- El backend fue observado primero en `docs/31-users-contracts` con cambios documentales; al fijar las referencias se verificó `develop` en el commit indicado en la [guía legacy](./legacy-reference.md).
- El `.gitignore` raíz sólo ignoraba `.atl/`; no ignoraba los repositorios anidados.

## Etapa 2 — Crear el monorepo mínimo

- [x] Confirmar nombre y ruta: `iam-facea-workspace/iam-facea-page/`. El contenedor `iam-facea-workspace` no tiene Git.
- [x] Confirmar cómo se creará el repositorio remoto; fue creado por la persona usuaria y configurado como `origin` en `github.com/iam-facea/IAM-FACEA-Page.git`. Primer push realizado con autorización.
- [x] Inicializar Git y definir la rama principal: `main`, con commit inicial publicado `a13911e`.
- [x] Crear `.gitignore`, `README.md`, `AGENTS.md` y `CONTEXT.md`.
- [x] Documentar la decisión de monorepo y el tratamiento del legacy en `docs/adr/0001-product-monorepo.md` y `docs/architecture/overview.md`.
- [x] Definir el workflow de issues, ramas cortas, commits y PRs en `docs/development/workflow.md`.

**Verificación:** límites Git, ocho archivos versionables, enlaces y reglas de ignore fueron comprobados. `.atl/` contiene metadata local ignorada. En ese baseline todavía no había frontend, Supabase ni CI. El primer commit y su publicación se realizaron; protección de ramas y automatización continúan pendientes. La revisión nativa quedó bloqueada por assets gestionados desactualizados; no se afirmó aprobación nativa.

**Resultado esperado:** un repositorio limpio, neutral respecto de Vite o Next.js.

## Etapa 3 — Trasladar y clasificar el conocimiento

**Alcance acordado:** preservar fuentes mediante copias documentales sin modificar sus contenidos y aclarar el estado de cada archivo. No promover borradores, contratos C# ni archivos históricos como especificaciones aprobadas del nuevo producto. El refinamiento y la consolidación quedan en la Etapa 10.

- [x] Inventariar requisitos, Screen Map, contratos, documentación técnica, PDFs y decisiones existentes; la revisión semántica y visual completa de PDFs y assets todavía está pendiente.
- [x] Crear `docs/migration/source-inventory.md` con origen, destino, clasificación, motivo, hash y revisión pendiente por documento.
- [x] Copiar las referencias seleccionadas a `docs/archive/migration-sources/`, conservando procedencia y originales: 75 snapshots.
- [x] Verificar la integridad y cobertura: 75/75 hashes y tamaños; esto no implica aprobación de privacidad, seguridad o licencias.
- [x] Registrar propuestas de usuarios/autenticación y contradicciones que requerirán adaptación, sin resolverlas.
- [x] Conservar instrucciones y skills seleccionadas sólo como referencias archivadas e inertes; no instalarlas ni asumir carga automática.

**Diferido a Etapa 10:** extraer requisitos aprobados a `docs/product/`, adaptar contratos al nuevo producto, resolver divergencias y establecer fuentes canónicas. Las decisiones mínimas de seguridad necesarias para implementar no deben postergarse hasta esa etapa.

**Resultado esperado:** contexto accesible y clasificado, sin presentar planes históricos como implementación actual.

## Etapa 4 — Formalizar las referencias legacy

- [x] Crear `docs/migration/legacy-reference.md`.
- [x] Registrar los repositorios y commits de referencia de Front y C#: `da58f4fbcb40daa8d728f60068cfbc705e15772a` y `f46ba3952277c4339d09eadeaad3969a710484c1`.
- [x] Documentar cómo obtenerlos y qué archivos consultar según la tarea; 33/33 rutas verificadas en los commits fijados, sin clonar ni ejecutar.
- [x] Establecer el límite de mantenimiento: referencias de sólo lectura; cualquier cambio requiere autorización explícita. No se define SLA, ownership operativo ni calendario de retiro.
- [x] Identificar comportamientos y pruebas útiles como candidatos a validar, sin copiar código ni adoptar la arquitectura anterior.

**Verificación local:** guía y enlaces comprobados; los 75 snapshots de la Etapa 3 conservaron sus hashes y permanecen ignorados, sin publicación aprobada. La documentación activa de las Etapas 3 y 4 integra el candidato local de `develop`. La captura del plan anterior permanece histórica e inalterada; su procedencia está en [`work-history/README.md`](./work-history/README.md).

**Resultado esperado:** la IA puede consultar el contexto anterior explícitamente sin mezclarlo con el código nuevo.

## Etapa 5 — Preparar Supabase y migrar publicaciones MVP

La disponibilidad previa de Supabase CLI 2.122.0 y Docker, y la ejecución de `supabase init`, son antecedentes históricos. En el cierre local del issue #3 se observaron la misma CLI y los servicios locales en ejecución; una reconstrucción desde cero aplicó las 20 migraciones y el seed. `supabase/config.toml` permaneció ignorado, conservó el hash `5b6b9cd73093e7f66aadfbc7c996b825ffb4ad98` y no recibió hardening de servicio.

### Diseño aprobado

- [x] Elegir publicaciones como primera capacidad y ampliar el alcance a CRUD editorial más lectura pública.
- [x] Aprobar campos y límites: título, descripción de hasta 1.000 caracteres, categoría, imagen, estados `draft`/`published` y `publicationDate` editable.
- [x] Aprobar `publicationDate` como PostgreSQL `date`, requerida en `PUT` y con default de creación calculado en `America/Argentina/Buenos_Aires`; timestamps técnicos en UTC.
- [x] Aprobar proyecciones pública y editorial exactas, y órdenes `(publicationDate DESC, id DESC)` y `(updatedAt DESC, id DESC)`.
- [x] Aprobar borrado lógico sin purga automática, conservando filas e imágenes referenciadas; recuperación, administración y purga quedan fuera del MVP.
- [x] Aprobar dos tablas, sus restricciones e índices, sin vistas, y exactamente ocho operaciones HTTP lógicas.
- [x] Aprobar tres funciones Edge pequeñas: `publications`, `editor-publications` e `images`, sin cadenas redundantes controller/service/repository.
- [x] Aprobar Supabase Auth para una única identidad editora con email/contraseña, sin signup, con recuperación requerida y autorización por subject exacto además de RLS.
- [x] Aprobar Vercel Blob como proveedor inicial, URLs públicas, credenciales sólo servidor, binarios fuera de la base y un adaptador real con implementación local/fake para pruebas.

El detalle normativo está en el [contrato aprobado de publicaciones MVP](./mvp-publications-contract-proposal.md). Estas marcas prueban decisiones documentales, no implementación.

### Implementación por completar

- [x] Iniciar los servicios locales con autorización y reconstruir la base desde cero.
- [x] Crear y aplicar 22 migraciones y un seed sintético para las dos tablas aprobadas y RPCs de Edge.
- [x] Implementar grants, políticas RLS, subject editor exacto con default `NULL` y borrado lógico protegido.
- [x] Crear y ejecutar pruebas de base positivas y negativas con fixtures sintéticos transaccionales.
- [x] Revisar y endurecer configuración de servicio para un entorno que no sea el desarrollo local generado (Supabase Cloud).
- [x] Implementar las funciones Edge de publicaciones (Issue #5).
- [x] Implementar contrato de almacenamiento, adaptadores Memory/Blob y función Edge `images` con tests (Issue #4).
- [x] Configurar Supabase Auth, provisión administrativa de una identidad real y flujo de recuperación.
- [ ] Integrar Vercel Blob después de verificar términos, disponibilidad, permisos y SDK vigentes en producción.
- [x] Crear y ejecutar pruebas de Deno para la función Edge de imágenes y sus adaptadores.
- [x] Crear y ejecutar pruebas de las funciones Edge de publicaciones (#5).
- [x] Desplegar backend y Edge Functions en Supabase Cloud y verificar endpoints en vivo.
- [x] Verificar despliegue y diferencias respecto del legacy; actualizar `migration-status.md` con evidencia.

**Estado actual:** la capacidad de backend del MVP de publicaciones está completamente implementada, probada y desplegada en Supabase Cloud (`cpeeairlzggsxbhurdas`). Cuenta con 22 migraciones aplicadas, tablas `content` y `publication`, triggers de seguridad, RLS, funciones RPC, y las 3 Edge Functions (`publications`, `editor-publications`, `images`) respondiendo en vivo. La identidad editora real fue aprovisionada administrativamente (`cee551c9-bb24-4fdb-9155-7dd0b4bd41ad`), el registro abierto fue deshabilitado y `get_editor_subject()` resuelve el UUID exacto. Resta configurar el token de servidor de Vercel Blob para cargas de imágenes productivas y avanzar hacia el desarrollo del frontend (Etapas 6 y 7).

**Criterio de diseño:** el legacy es evidencia histórica; el esquema y contrato nuevos no copian su arquitectura, ids, rutas, almacenamiento ni autorización.

**Resultado esperado:** la capacidad aprobada validada de punta a punta, no solamente una conversión de tablas.

## Etapa 6 — Elegir el recorrido hacia el frontend definitivo

La Etapa 6 decide el camino, no la tecnología final. Ir directamente a la Etapa 7 es una opción completa y legítima; el puente de la sección 6.2 sólo se realiza si antes demuestra un valor de aprendizaje o despliegue mayor que su costo como trabajo descartable.

### 6.1 — Elegir el camino

- [ ] Comparar el camino directo a la Etapa 7 con un puente temporal según la evidencia que permitiría obtener sobre integración, operación y despliegue.
- [ ] Estimar el trabajo descartable, el mantenimiento transitorio y la condición de retiro del puente antes de elegirlo.
- [ ] Tratar esquema, contrato de backend, Auth, RLS y Storage como costos comunes que el frontend nuevo también necesitará, no como razones suficientes para construir un puente.
- [ ] Si no existe una pregunta concreta que justifique el puente, omitir la sección 6.2 y continuar directamente con la Etapa 7.
- [ ] Si el puente aporta valor, aprobar explícitamente su alcance verificable antes de implementarlo.

La eventual ubicación `apps/web-current/` sólo podrá evaluarse después de esa aprobación. Cualquier material de referencia deberá sanearse y revisarse; no se copia ahora la aplicación legacy ni se presume que deba incorporarse.

### 6.2 — Ejecutar un puente de aprendizaje, sólo si fue elegido

Esta sección es condicional. No rediseña la aplicación anterior ni habilita un refactor general: reutiliza de forma acotada la interfaz pública y editorial necesaria para responder las preguntas aprobadas.

- [ ] Conectar inicio de sesión, cierre de sesión, restauración y renovación de sesión con Supabase Auth real para una única identidad autorizada, provisionada de forma segura; no habilitar registro abierto.
- [ ] Mantener toda clave privilegiada fuera del frontend y proteger escrituras privadas en el servidor y/o con RLS; ocultar controles de interfaz no cuenta como autorización.
- [ ] Adaptar publicaciones y contenido multimedia al contrato de backend acordado, sin trasladar automáticamente el esquema ni la arquitectura C#.
- [ ] Probar que visitantes anónimos e identidades no autorizadas no pueden escribir y que la identidad autorizada sí puede completar el recorrido previsto.
- [ ] Desplegar sólo el mínimo necesario para obtener aprendizaje y registrar su retiro; ejecución, publicación y cualquier servicio externo requieren autorizaciones posteriores y separadas.
- [ ] Evitar roles finales, un sistema complejo de usuarios y cualquier otra capacidad que no sea necesaria para el experimento.

La cuarentena documental existente no queda habilitada para publicación por elegir o ejecutar este puente.

**Resultado esperado:** una decisión explícita entre avanzar directamente al frontend definitivo o realizar un experimento temporal, acotado y retirado después de producir evidencia.

## Etapa 7 — Construir el frontend definitivo desde cero

- [ ] Evaluar Vite, Next.js u otra tecnología según SEO, rendering, i18n, autenticación, hosting y mantenimiento.
- [ ] Registrar la decisión tecnológica y sus motivos.
- [ ] Crear una aplicación nueva y limpia en `apps/web/`, sin usar el puente ni la aplicación legacy como base de la aplicación definitiva.
- [ ] Incorporar únicamente assets, contenido, referencias, comportamientos o pruebas elegidos y revisados deliberadamente.
- [ ] Integrar progresivamente con el contrato acordado de Supabase y con los controles de autorización del servidor y/o RLS.

**Resultado esperado:** un frontend definitivo construido desde cero, con la tecnología elegida para el producto y sin herencia automática de aplicaciones anteriores.

## Etapa 8 — Configurar despliegues independientes

- [ ] Configurar Vercel con Root Directory `apps/web`, o la aplicación temporal si se aprueba.
- [ ] Configurar variables por entorno y las rutas SPA si se usa Vite con React Router.
- [ ] Separar el build del frontend de las operaciones sobre Supabase.
- [ ] Definir validación y despliegue de migraciones y funciones de Supabase.
- [ ] Proteger credenciales y evitar que previews modifiquen producción.
- [ ] Verificar autenticación real, autorización y RLS antes de exponer operaciones privadas.
- [ ] Mantener compatibilidad entre migraciones y versiones del frontend desplegadas por separado.

**Resultado esperado:** Front y Supabase desplegables por separado aunque compartan repositorio.

## Etapa 9 — Cerrar la transición

- [ ] Verificar funcionalidades, datos y archivos migrados.
- [ ] Retirar el frontend temporal, si existió.
- [ ] Desactivar los servicios legacy y revocar sus credenciales cuando corresponda.
- [ ] Crear referencias de cierre y documentar el reemplazo.
- [ ] Archivar los repositorios históricos únicamente tras aprobación.
- [x] Confirmar que este plan canónico tiene una referencia de retorno en el workspace original, evitando dos planes activos. El original es ahora un puntero; la versión completa previa se conserva verificada en `work-history/`.
- [ ] Retirar los checkouts antiguos del workspace cotidiano cuando ya no sean necesarios.

**Resultado esperado:** un solo producto activo, con historia y referencias recuperables.

## Próximo paso

Las Etapas 3 y 4 conservan evidencia local y la Etapa 5 tiene su tramo de base implementado y verificado. El padre debe revisar el diff del issue #3 y decidir por separado cualquier commit o entrega. Después, las funciones Edge, Auth real, recuperación, Vercel Blob, pruebas HTTP, frontend y despliegue requieren nuevos alcances; no se deducen de la base local.

El baseline público conocido continúa siendo `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; no prueba el `HEAD` actual. La implementación está local y sin commit sobre `feat/db-publications-schema`, cuyo `HEAD` observado es `8d7c54b`. No hubo push, PR ni merge del issue #3 y no existe permiso de entrega pública. `main` queda intacta. La cuarentena histórica permanece ignorada y no está aprobada para publicación.

## Registro de avances

| Paso | Resultado verificado | Evidencia / commit / respaldo |
| --- | --- | --- |
| Guía inicial | Documento creado en la raíz original; copia íntegra preservada antes del traspaso | `docs/migration/work-history/PLAN-MIGRACION-MONOREPO-before-handover.md` (local) |
| Etapa 2 — base local | Workspace y repositorio creados; documentación mínima, ignore y origin verificados | `docs/migration/work-history/bootstrap-monorepo.md` (local) |
| Etapa 2 — publicación | Primer commit y push autorizados y realizados; `main` local/remota coincidieron en ese momento | `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; `github.com/iam-facea/IAM-FACEA-Page` |
| Etapas 3 y 4 — preparación local | Archivo documental y guía legacy verificados; raw excluido de publicación | `docs/migration/work-history/archive-migration-context.md` y `docs/migration/work-history/formalize-legacy-references.md` (locales) |
| Etapa 5 — configuración local histórica | `supabase init` completado sin iniciar runtime ni crear esquema en aquella sesión | `docs/migration/work-history/initialize-supabase-local-config.md` (local) |
| Etapa 5 — base de publicaciones local | Reconstrucción de 22 migraciones, seed de tres publicaciones, 5 archivos/52 pruebas y lint sin hallazgos | Issue #3 y [guía de Supabase](../../supabase/README.md) |
| Etapa 5 — almacenamiento y función images | StorageAdapter desacoplado, adaptadores Memory/Blob, validador de imágenes y Edge Function images con 46 tests Deno | Issue #4 y [guía de Supabase](../../supabase/README.md) |
| Etapa 5 — Edge Functions de publicaciones | Funciones Edge publications y editor-publications implementando las 7 acciones de publicaciones con 110 tests Deno totales | Issue #5 y [guía de Supabase](../../supabase/README.md) |
| Etapa 5 — Despliegue en Supabase Cloud | 22 migraciones, 3 Edge Functions en vivo, provisión de editor Auth y cierre de signup abierto | Proyecto `cpeeairlzggsxbhurdas`, smoke tests 200/401/404 y [guía de despliegue](../development/supabase-cloud-deployment.md) |
| Traspaso documental | Plan activo y continuidad en el monorepo; cinco copias previas verificadas; workspace original reducido a un puntero | [handover](./handover.md) y [handoff para IA](./ai-handoff.md) |

## Etapa 10 — Refinar y consolidar documentación

Esta etapa queda pendiente para una ejecución posterior. La copia de la Etapa 3 preserva contexto: no valida automáticamente requisitos ni convierte el diseño legacy en arquitectura Supabase. La compuerta mínima de privacidad y seguridad de publicación realizada ahora no incluye extracción semántica, refinamiento funcional ni creación de documentación de implementación.

- [ ] Revisar los snapshots locales archivados y evaluar cada elemento: conservarlo como evidencia, adaptarlo o no usarlo.
- [ ] Completar revisión semántica y visual de PDFs, diagramas y assets, incluyendo privacidad y derechos de uso.
- [ ] Validar qué requisitos del Screen Map están aprobados y cuáles son propuestas o quedan fuera de alcance.
- [ ] Crear o actualizar documentación activa en `docs/product/` sólo desde requisitos validados, manteniendo la procedencia.
- [ ] Revisar reglas de usuarios y autenticación y adaptar contratos a Supabase Auth, RLS y almacenamiento; registrar decisiones aceptadas.
- [ ] Resolver contradicciones y duplicados mediante fuentes canónicas, sin alterar los originales archivados.
- [ ] Refinar glosario, arquitectura, guías de desarrollo y documentación de implementación según lo aprobado e implementado.
- [ ] Evaluar qué instrucciones de IA deben ser portables y comprobar su mecanismo de carga; no activar skills archivadas por inercia.
- [ ] Actualizar enlaces, estados y referencias de reemplazo en el inventario local y en los documentos activos correspondientes.

**Resultado esperado:** documentación activa coherente con el producto nuevo y referencias históricas claramente separadas. Las decisiones de seguridad y contratos imprescindibles para una tarea deben resolverse antes de implementarla, aunque el refinamiento integral quede para esta etapa.
