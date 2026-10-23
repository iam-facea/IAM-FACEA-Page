# Aplicaciones

Este directorio reserva el límite para aplicaciones desplegables del monorepo. No contiene una aplicación ejecutable.

## Posibles incorporaciones

- `apps/web`: futura experiencia web, después de decidir entre Vite y Next.js con evidencia suficiente.
- `apps/web-current`: referencia temporal opcional, únicamente si se acepta una necesidad concreta; no es el destino automático del Front legado.

Cada aplicación deberá declarar sus propios comandos, variables y verificaciones cuando sea creada. No asumas que los despliegues de distintas aplicaciones, servicios o migraciones ocurren de manera atómica.

Volvé al [estado del producto](../README.md) o consultá el [mapa de arquitectura](../docs/architecture/overview.md).
