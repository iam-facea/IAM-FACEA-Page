# Arquitectura inicial

La arquitectura actual es un límite documental, no un sistema ejecutable. Separa el nuevo producto de los repositorios legados y deja decisiones tecnológicas abiertas hasta contar con evidencia.

## Mapa actual

```text
Contenedor local sin Git
└── iam-facea-page (este repositorio independiente)
    ├── documentación y glosario
    └── apps/ (reserva documental, sin aplicación)

Workspace legado original (externo, sólo lectura)
├── Front
└── C#
```

No se trasladan automáticamente código, historial, datos ni decisiones desde el legado. Sus implementaciones pueden aportar evidencia, pero cada regla debe validarse dentro del contexto del producto nuevo.

## Evolución prevista

| Área | Estado | Dirección |
|---|---|---|
| Web | No creada | Evaluar Vite y Next.js antes de crear `apps/web`. |
| Referencia actual | Externa | Considerar `apps/web-current` sólo ante una necesidad aceptada. |
| Datos y backend | No inicializados | Evolucionar Supabase local → Cloud → posible autoalojamiento. |
| CI y despliegue | No configurados | Diseñar por aplicación cuando existan comandos reales. |
| GitHub | Repositorio y `origin` configurados | El primer commit y su publicación, la protección de ramas y la automatización continúan pendientes. |

## Límites operativos

Las aplicaciones se podrán desplegar independientemente. Un despliegue no debe requerir que todas cambien al mismo tiempo; las migraciones seguirán expand/contract para tolerar versiones coexistentes.

La autorización se garantiza en el servidor y/o con políticas RLS. La visibilidad de un botón o una ruta en la interfaz no concede ni revoca acceso. Las credenciales privilegiadas permanecen del lado servidor: una clave `service_role` nunca puede exponerse con prefijos públicos como `VITE_` o `NEXT_PUBLIC_`.

El flujo local de Supabase será el primer objetivo operativo cuando se autorice su inicialización. Cloud vendrá después; el autoalojamiento es una posibilidad futura, no un compromiso actual.

## Decisiones relacionadas

- [ADR 0001: monorepo del producto](../adr/0001-product-monorepo.md)
- [Reserva para aplicaciones](../../apps/README.md)
- [Flujo de desarrollo](../development/workflow.md)
