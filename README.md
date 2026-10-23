# IAM FACEA

Repositorio independiente para evolucionar el producto web de IAM FACEA sin alterar los proyectos legados. Hoy contiene solamente la base documental y reglas de trabajo del futuro monorepo: todavía no hay aplicación, base de datos, integración continua ni despliegue ejecutable.

## Empezar por acá

1. Leé el [glosario del dominio](./CONTEXT.md).
2. Revisá el [mapa de arquitectura](./docs/architecture/overview.md).
3. Entendé la [decisión de monorepo](./docs/adr/0001-product-monorepo.md).
4. Antes de cambiar algo, seguí el [flujo de desarrollo](./docs/development/workflow.md) y las [instrucciones para agentes](./AGENTS.md).

## Estado actual

La etapa vigente establece el límite del nuevo repositorio y documenta las decisiones iniciales. El directorio padre es sólo un contenedor local sin control de versiones; este directorio hijo es el repositorio del producto.

El respaldo de la etapa 1 existe, pero no demuestra que toda la seguridad, autorización o información histórica haya sido revisada. Los proyectos Front y C# continúan en el workspace legado original como referencia de sólo lectura. No se copió su código, historial ni contexto de manera automática.

```text
.
├── AGENTS.md
├── CONTEXT.md
├── README.md
├── apps/
│   └── README.md
└── docs/
    ├── adr/
    │   └── 0001-product-monorepo.md
    ├── architecture/
    │   └── overview.md
    └── development/
        └── workflow.md
```

## Estructura futura, no implementada

`apps/web` será el lugar probable de la nueva experiencia web cuando se elija el framework. Vite y Next.js siguen en evaluación; esta documentación no fija ninguno. Un eventual `apps/web-current` sólo se incorporará si se acepta una necesidad concreta de alojar una referencia temporal dentro del monorepo.

Supabase se prevé con una progresión local → Cloud → posible autoalojamiento. Aún no está inicializado, por lo que no existen migraciones, configuración, servicios ni credenciales en este repositorio.

Las aplicaciones podrán desplegarse de forma independiente. Sus despliegues no deben suponerse atómicos entre sí ni con las migraciones de datos.

## Próxima etapa

Antes de implementar, cada hallazgo del legado debe clasificarse como:

- **Regla o término de producto:** se valida con responsables y, si corresponde, se incorpora al glosario o a una especificación.
- **Evidencia técnica reutilizable:** se contrasta con la arquitectura nueva; no se adopta por inercia.
- **Dato, acceso o seguridad:** requiere revisión explícita antes de copiar, exponer o automatizar.
- **Detalle obsoleto o incierto:** permanece fuera del nuevo producto hasta resolverlo.

El repositorio remoto es [iam-facea/IAM-FACEA-Page](https://github.com/iam-facea/IAM-FACEA-Page) y está configurado como `origin`. La consulta inicial no devolvió referencias `HEAD`, `main` ni `master`. Quedan pendientes el primer commit y su publicación, la protección de ramas, cualquier automatización de issues y el primer PR; no se consideran configurados por disponer de un remote.
