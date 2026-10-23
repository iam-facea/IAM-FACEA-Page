# Flujo de desarrollo

Cada cambio parte de una necesidad verificable y termina en revisión humana. Como el repositorio todavía no tiene primer commit, el flujo de ramas y pull requests describe el estado posterior a ese hito pendiente.

## Camino habitual

1. **Issue:** describir el problema, alcance y criterios de aceptación observables.
2. **Rama corta:** crearla desde `main` para una unidad coherente de trabajo.
3. **Cambio coherente:** mantener código, documentación y migraciones relacionadas en la misma unidad; evitar refactors ajenos.
4. **Checks:** ejecutar los controles reales del área modificada y registrar fallas o controles no disponibles.
5. **Commit autorizado:** sólo con aprobación humana, crear un commit Conventional Commit que exprese el resultado.
6. **Pull request:** explicar intención, límites, evidencia y riesgos pendientes.
7. **Revisión y merge:** corregir hallazgos, obtener aprobación y fusionar según las protecciones vigentes.

No hay runner de build o tests configurado. Hasta que cada aplicación declare el suyo, no se deben inventar comandos genéricos.

## Estado inicial excepcional

`main` está sin commits y el primer commit continúa pendiente de autorización humana. El repositorio de GitHub ya existe y está configurado como `origin`; todavía están pendientes el primer commit y su publicación, el primer PR, la protección de ramas y la automatización de issues. Por eso hoy estas reglas son intención documentada y no controles técnicamente impuestos.

La publicación inicial y la configuración complementaria de GitHub requieren acciones humanas separadas; disponer del remote no implica que estén realizadas.

## Compatibilidad entre entregas

Las aplicaciones y los cambios de datos no se despliegan atómicamente. Cuando una migración afecte contratos compartidos:

1. **Expandir:** agregar estructuras compatibles sin retirar las existentes.
2. **Migrar:** actualizar datos y consumidores, verificando versiones coexistentes.
3. **Contraer:** eliminar lo anterior sólo después de confirmar que ya no tiene consumidores.

Las decisiones de interfaz no sustituyen controles de acceso. La autorización debe aplicarse en el servidor y/o mediante RLS; nunca se publica una clave `service_role` con variables `VITE_*`, `NEXT_PUBLIC_*` ni otro canal cliente.

## Checklist de revisión

- [ ] El issue tiene criterios de aceptación claros.
- [ ] El cambio se limita a una unidad coherente y no adopta el legado sin validación.
- [ ] No contiene secretos ni datos reales.
- [ ] Los checks ejecutados y los no disponibles están declarados.
- [ ] Las migraciones preservan compatibilidad durante despliegues independientes.
- [ ] Commit, publicación y acciones remotas cuentan con autorización humana.

Volvé al [README](../../README.md) para el estado y los pendientes del producto.
