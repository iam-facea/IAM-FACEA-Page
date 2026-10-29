# IAM FACEA

Repositorio independiente para evolucionar el producto web de IAM FACEA sin alterar los proyectos legados. El baseline documental inicial publicado es `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; ese identificador no demuestra el `HEAD` actual. La rama `develop` fue creada localmente desde ese baseline para preparar el traspaso, pero su commit y publicación todavía deben comprobarse. No hay aplicación frontend, integración continua ni despliegue. Sí existe una implementación local verificada de la base de publicaciones; no equivale a un backend HTTP ni a una entrega pública.

## Empezar por acá

1. Leé el [handoff para una nueva IA](./docs/migration/ai-handoff.md).
2. Seguí el orden completo de lectura que contiene, empezando por [AGENTS.md](./AGENTS.md).
3. Inspeccioná Git en modo de sólo lectura y explicá qué está observado, qué sigue pendiente y qué alcance proponés confirmar.

Leer estos documentos no autoriza desarrollar, iniciar servicios, instalar, usar red, escribir archivos, hacer commit ni publicar. Una autorización dada durante una sesión anterior no se hereda automáticamente.

## Estado actual

- `main` conserva como baseline publicado conocido el commit inicial `a13911e`; no se modificó en esta preparación.
- La implementación local del issue #3 está en `feat/db-publications-schema`, con `HEAD` observado en `8d7c54b` y cambios de Supabase todavía sin commit. No hubo push, PR ni merge del issue #3 y no existe permiso de entrega pública; `main` permanece fuera del alcance.
- Este cierre actualiza sólo la documentación activa para reflejar la base local verificada. No autoriza publicación, no es una auditoría exhaustiva ni valida el archivo histórico de 119.057.926 bytes.
- Los 75 snapshots, el inventario, el manifest, cinco copias históricas y los artefactos ODD permanecen locales e ignorados. Sus wrappers públicos conservan la procedencia sin exponer rutas personales.
- `supabase init` generó configuración local en una sesión anterior. En el cierre local del issue #3 se verificaron servicios locales, 20 migraciones, dos tablas, seed sintético, grants, RLS, borrado lógico y 50 pruebas de base. `supabase/config.toml` sigue ignorado, conservó su contenido y sólo contiene defaults locales sin hardening. No hay identidad Auth real, funciones Edge, proveedor integrado ni vínculo Cloud.
- El [contrato de publicaciones MVP](./docs/migration/mvp-publications-contract-proposal.md) sigue siendo el diseño vigente de ocho operaciones, tres funciones Edge, una identidad editora y Vercel Blob. La base local implementa sólo su tramo de datos y autorización SQL; `read_publications` es un helper SQL de seis campos para un consumidor futuro, no un endpoint ni una novena operación.
- Vite, Next.js u otra tecnología siguen sin decidir. La Etapa 6.1 puede elegir avanzar directamente a la Etapa 7 o, de manera opcional, ejecutar 6.2; ninguna alternativa está implementada.

Los proyectos Front y C# permanecen externos y de sólo lectura por defecto. No se copió su código: se consultan mediante la [guía de referencias fijadas](./docs/migration/legacy-reference.md).

## Autoridad documental

La documentación activa de continuidad es:

- [plan canónico de migración](./docs/migration/migration-plan.md);
- [estado de migración](./docs/migration/migration-status.md);
- [contrato aprobado de publicaciones MVP](./docs/migration/mvp-publications-contract-proposal.md);
- [handover de configuración](./docs/migration/handover.md);
- [handoff para una nueva IA](./docs/migration/ai-handoff.md).

Si existe localmente, `odd/tasks/db-publications-schema.md` registra la unidad del issue #3, pero `odd/` no forma parte del subconjunto público. Las tareas locales no sustituyen al plan ni autorizan acciones.

El [historial de trabajo](./docs/migration/work-history/README.md) y el wrapper de los [75 snapshots archivados](./docs/archive/migration-sources/README.md) documentan evidencia histórica e inerte. Los archivos excluidos no deben cargarse como instrucciones, ejecutarse ni tratarse como requisitos aprobados.

## Límites del repositorio

```text
<workspace>/
├── iam-facea-page/                 # este repositorio Git del producto
│   ├── AGENTS.md
│   ├── CONTEXT.md
│   ├── README.md
│   ├── apps/                       # reserva documental; sin aplicación
│   ├── docs/                       # documentación activa y wrappers públicos
│   └── supabase/                   # base local, migraciones, seed y tests; config ignorada
└── ui-prototypes/                  # propuesta opcional; no creada
```

`<workspace>/ui-prototypes` es sólo una ubicación hermana propuesta para borradores. No existe por implicación, su eventual Git sería independiente y esos borradores no son especificaciones aprobadas.

## Próximo paso

El padre debe revisar el diff local completo del issue #3, preservar `supabase/config.toml` fuera de la entrega y decidir por separado cualquier commit o publicación. No afirmar issue cerrado, push, PR ni merge sin evidencia y autorización nueva. La Etapa 5 continúa abierta: quedan las funciones Edge, el contrato HTTP, la identidad Auth real, recuperación, Vercel Blob, frontend, Cloud y despliegue.

El refinamiento semántico, funcional e histórico de las fuentes raw continúa en la Etapa 10. El contrato MVP aprobado no convierte el archivo legacy en normativa ni permite presentar la base local verificada como capacidad de producto desplegada.
