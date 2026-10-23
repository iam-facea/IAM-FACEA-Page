---
status: accepted
---

# Adoptar un monorepo para el nuevo producto

El nuevo producto IAM FACEA se desarrollará en un monorepo independiente. Esta forma permite que una persona trabajando con asistencia de IA mantenga juntas las decisiones transversales, la documentación, las aplicaciones y las futuras migraciones, sin mezclar el historial de los sistemas legados.

## Alternativas consideradas

- Reutilizar uno de los repositorios legados: descartado porque acoplaría la evolución nueva a decisiones e historial que todavía deben evaluarse.
- Crear un repositorio por aplicación o servicio desde el inicio: descartado por el costo de coordinación prematuro para un equipo pequeño.
- Usar un monorepo nuevo: elegido porque hace visibles los cambios coherentes que atraviesan producto, datos y aplicaciones.

## Consecuencias

- Front y C# permanecen fuera del monorepo, en su workspace original, como referencias de sólo lectura.
- El monorepo no implica un único artefacto ni despliegues atómicos. Cada aplicación podrá verificarse y desplegarse de manera independiente.
- Las futuras migraciones compartidas deben ser compatibles con versiones coexistentes; se aplicará el patrón expand/contract.
- La decisión no selecciona framework web. Vite y Next.js continúan abiertos hasta contar con criterios del producto y operación.
- Incorporar una referencia `apps/web-current` requerirá una necesidad aceptada; no se copiará el legado por defecto.

Ver el [mapa de arquitectura](../architecture/overview.md) para los límites previstos.
