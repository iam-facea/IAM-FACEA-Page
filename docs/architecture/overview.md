# Arquitectura inicial

La arquitectura del producto sigue sin runtime de aplicación, pero ya no es exclusivamente documental: existe una implementación verificada de la base local de publicaciones. El diseño aprobado conserva alcance mayor que ese tramo SQL. Este mapa separa el producto nuevo de los repositorios legados y distingue diseño, implementación local y capacidades futuras.

## Mapa actual

```text
Contenedor local sin Git
└── iam-facea-page (este repositorio independiente)
    ├── documentación activa y glosario
    ├── archivo documental no normativo de la Etapa 3
    ├── apps/ (reserva documental, sin aplicación)
    └── supabase/ (20 migraciones, seed y pruebas de base; config local ignorada)

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
| Datos y backend | Base local verificada: dos tablas, grants, RLS, seed, borrado lógico y helper público SQL; sin endpoint HTTP | Implementar las tres funciones Edge, Auth real y Blob sin ampliar las ocho operaciones aprobadas. |
| CI y despliegue | No configurados | Diseñar por aplicación cuando existan comandos reales. |
| GitHub | Baseline `a13911e` publicado; issue #3 local en `feat/db-publications-schema` sobre `8d7c54b` | Revisar el diff local; commit, push, PR y merge requieren autorización nueva y evidencia. |

## Límites operativos

Las aplicaciones se podrán desplegar independientemente. Un despliegue no debe requerir que todas cambien al mismo tiempo; las migraciones seguirán expand/contract para tolerar versiones coexistentes.

La autorización se garantiza en el servidor y/o con políticas RLS. La visibilidad de un botón o una ruta en la interfaz no concede ni revoca acceso. Las credenciales privilegiadas permanecen del lado servidor: una clave `service_role` nunca puede exponerse con prefijos públicos como `VITE_` o `NEXT_PUBLIC_`.

La [guía de Supabase](../../supabase/README.md) separa dos momentos. Históricamente, la CLI 2.122.0 sólo había generado configuración. En la implementación local del issue #3 se reconstruyeron 20 migraciones y un seed sintético con servicios locales; `supabase test db` pasó 5 archivos y 50 pruebas, y `supabase db lint --local --level warning` no informó errores ni advertencias. `supabase/config.toml` permanece local, ignorado y sin hardening; no existe vínculo Cloud.

El [contrato de publicaciones MVP](../migration/mvp-publications-contract-proposal.md) aprueba dos tablas, ocho operaciones y tres funciones Edge: `publications` para lectura pública, `editor-publications` para CRUD editorial e `images` para carga. La base implementa `read_publications` como helper SQL público, acotado a la proyección de seis campos y paginación aprobadas; no es una función Edge, un endpoint ni una novena operación. Las futuras funciones se organizarán en módulos funcionales pequeños, sin cadenas redundantes controller/service/repository. Un adaptador de almacenamiento sí constituye una frontera real: producción usará Vercel Blob y las pruebas un adaptador local o fake.

La lectura SQL pública permite sólo filas `published` no eliminadas y no concede acceso directo a las tablas. La configuración privada editora conserva `editor_subject = NULL`, por lo que las políticas y la operación de borrado lógico fallan cerradas hasta provisionar una identidad real; las pruebas usan identidades sintéticas transaccionales y rollback. Supabase Auth con email y contraseña, ausencia de signup, recuperación requerida, Vercel Blob y URLs públicas siguen siendo decisiones aprobadas sin implementación de servicio real. Los defaults locales generados no prueban signup deshabilitado ni preparación para producción.

El legado conserva valor como evidencia histórica, no como modelo a copiar. El próximo paso es revisar y cerrar localmente el tramo de base del issue #3 sin afirmar entrega pública. Implementar funciones Edge, provisionar Auth, integrar proveedores o considerar Cloud requiere un alcance y una autorización posteriores.

## Decisiones relacionadas

- [ADR 0001: monorepo del producto](../adr/0001-product-monorepo.md)
- [Reserva para aplicaciones](../../apps/README.md)
- [Flujo de desarrollo](../development/workflow.md)
