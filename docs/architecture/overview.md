# Arquitectura inicial

La arquitectura actual sigue siendo documental: existe un diseño aprobado para publicaciones MVP, pero no hay runtime. Separa el producto nuevo de los repositorios legados y distingue las decisiones aceptadas de toda implementación futura.

## Mapa actual

```text
Contenedor local sin Git
└── iam-facea-page (este repositorio independiente)
    ├── documentación activa y glosario
    ├── archivo documental no normativo de la Etapa 3
    ├── apps/ (reserva documental, sin aplicación)
    └── supabase/ (guía pública; config local excluida, sin servicios ni esquema aplicado)

Workspace legado original (externo, sólo lectura)
├── Front
└── C#
```

No se trasladan automáticamente código, historial, datos ni decisiones desde el legado. La copia allowlisted de la Etapa 3 preserva fuentes documentales byte a byte, según el [wrapper público del archivo](../archive/migration-sources/README.md). Las capturas y `docs/migration/source-inventory.md` permanecen locales, excluidos de Git hasta completar su revisión; pueden no existir en un clon. Esos snapshots aportan evidencia, pero no son contratos activos: su evaluación y refinamiento corresponden a la Etapa 10, sin posponer los controles mínimos necesarios para no publicar información sensible ahora.

## Evolución prevista

| Área | Estado | Dirección |
|---|---|---|
| Web | No creada | Evaluar Vite y Next.js antes de crear `apps/web`. |
| Referencia actual | Externa | Considerar `apps/web-current` sólo ante una necesidad aceptada. |
| Datos y backend | Diseño de publicaciones aprobado; servicios, migraciones, tablas, RLS y funciones no creados | Implementar después de una autorización separada el esquema y tres funciones Edge del contrato. |
| CI y despliegue | No configurados | Diseñar por aplicación cuando existan comandos reales. |
| GitHub | Repositorio y baseline `a13911e` publicados históricamente | La rama documental actual prepara un único PR autorizado hacia `develop`; commit, push, PR y merge todavía requieren evidencia. |

## Límites operativos

Las aplicaciones se podrán desplegar independientemente. Un despliegue no debe requerir que todas cambien al mismo tiempo; las migraciones seguirán expand/contract para tolerar versiones coexistentes.

La autorización se garantiza en el servidor y/o con políticas RLS. La visibilidad de un botón o una ruta en la interfaz no concede ni revoca acceso. Las credenciales privilegiadas permanecen del lado servidor: una clave `service_role` nunca puede exponerse con prefijos públicos como `VITE_` o `NEXT_PUBLIC_`.

La [guía de Supabase](../../supabase/README.md) registra que la CLI 2.122.0 generó configuración en una sesión anterior. `supabase/config.toml` permanece local y se excluye deliberadamente de la entrega documental actual; no se iniciaron servicios ni se crearon migraciones, tablas, seeds o vínculos Cloud.

El [contrato de publicaciones MVP](../migration/mvp-publications-contract-proposal.md) aprueba dos tablas, ocho operaciones y tres funciones Edge: `publications` para lectura pública, `editor-publications` para CRUD editorial e `images` para carga. Las funciones se organizan en módulos funcionales pequeños, sin cadenas redundantes controller/service/repository. Un adaptador de almacenamiento sí constituye una frontera real: producción usará Vercel Blob y las pruebas un adaptador local o fake.

La función pública es anónima y depende de RLS para limitar la lectura. Las funciones editoriales deben autenticar y además autorizar el subject exacto de la única identidad editora. Supabase Auth con email y contraseña, ausencia de signup, recuperación requerida, políticas RLS, Vercel Blob y URLs públicas son decisiones aprobadas, pero nada está configurado o verificado contra servicios reales.

El legado conserva valor como evidencia histórica, no como modelo a copiar. El próximo paso de esta unidad es entregar la documentación y detenerse antes de la implementación; iniciar Supabase, integrar proveedores o considerar Cloud requiere autorización posterior.

## Decisiones relacionadas

- [ADR 0001: monorepo del producto](../adr/0001-product-monorepo.md)
- [Reserva para aplicaciones](../../apps/README.md)
- [Flujo de desarrollo](../development/workflow.md)
