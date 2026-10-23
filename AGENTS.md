# Instrucciones para agentes

Este repositorio nace vacío de runtime. Antes de proponer o editar, verificá qué existe realmente; no deduzcas herramientas, comandos ni decisiones a partir de la estructura futura.

## Lectura obligatoria

Leé y confirmá que pudiste cargar, en este orden:

1. [README](./README.md): alcance y estado actual.
2. [Glosario](./CONTEXT.md): lenguaje permitido del dominio.
3. [Arquitectura](./docs/architecture/overview.md): límites y evolución prevista.
4. [ADR del monorepo](./docs/adr/0001-product-monorepo.md): decisión y tradeoffs.
5. [Flujo de desarrollo](./docs/development/workflow.md): secuencia y controles.

Si un archivo falta o contradice otro, informalo antes de avanzar. No reemplaces esa verificación por supuestos ni inventes un runner de build o tests.

## Límites de trabajo

- Hacé cambios pequeños y restringidos a los paths autorizados.
- Consultá los proyectos legados Front y C# sólo como evidencia de lectura; no son normativa y no se modifica ni copia su contenido sin una decisión explícita.
- No agregues secretos, datos reales ni credenciales. Usá ejemplos sintéticos y archivos `.env.example` sin valores sensibles cuando exista una necesidad aprobada.
- No expongas claves privilegiadas. En particular, una `service_role` nunca debe publicarse mediante variables `VITE_*` o `NEXT_PUBLIC_*`.
- No presentes planes futuros como capacidades implementadas.
- Pedí aprobación humana antes de acciones destructivas, commits, publicación, despliegues, cambios remotos o configuración de servicios externos.

## Criterio técnico

La autorización se aplica en el servidor y/o mediante RLS; ocultar controles en la interfaz no constituye autorización. Las migraciones compartidas deben conservar compatibilidad durante despliegues independientes y seguir un enfoque expand/contract.

Documentá las verificaciones realmente ejecutadas. Si todavía no hay herramientas o runner, indicá que el control no aplica en vez de inventar un comando.
