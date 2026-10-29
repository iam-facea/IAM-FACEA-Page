# IAM FACEA

Repositorio independiente para evolucionar el producto web de IAM FACEA sin alterar los proyectos legados. El baseline documental inicial publicado es `a13911eaf10b59a0e3587d0f44fa4ee75c870109`; ese identificador no demuestra el `HEAD` actual. La rama `develop` fue creada localmente desde ese baseline para preparar el traspaso, pero su commit y publicación todavía deben comprobarse. No hay aplicación, base de datos en ejecución, integración continua ni despliegue ejecutable.

## Empezar por acá

1. Leé el [handoff para una nueva IA](./docs/migration/ai-handoff.md).
2. Seguí el orden completo de lectura que contiene, empezando por [AGENTS.md](./AGENTS.md).
3. Inspeccioná Git en modo de sólo lectura y explicá qué está observado, qué sigue pendiente y qué alcance proponés confirmar.

Leer estos documentos no autoriza desarrollar, iniciar servicios, instalar, usar red, escribir archivos, hacer commit ni publicar. Una autorización dada durante una sesión anterior no se hereda automáticamente.

## Estado actual

- `main` conserva como baseline publicado conocido el commit inicial `a13911e`; no se modificó en esta preparación.
- La entrega documental actual se prepara en `docs/mvp-publications-contract`, una excepción autorizada para un único PR hacia `develop`. No se afirma que existan commits, push, PR, merge o `develop` remoto hasta observar su evidencia; `main` permanece fuera del alcance.
- La revisión actual sólo prepara un mínimo de privacidad y seguridad para publicar documentación activa. No es una auditoría exhaustiva ni valida el archivo histórico de 119.057.926 bytes.
- Los 75 snapshots, el inventario, el manifest, cinco copias históricas y los artefactos ODD permanecen locales e ignorados. Sus wrappers públicos conservan la procedencia sin exponer rutas personales.
- `supabase init` generó configuración local en una sesión anterior. `supabase/config.toml` se excluye deliberadamente de esta entrega documental y no se afirma que esté en el checkout público. No hay servicios, migraciones, seeds, tablas, Auth, RLS, funciones Edge, proveedor integrado ni vínculo Cloud.
- El [contrato de publicaciones MVP](./docs/migration/mvp-publications-contract-proposal.md) aprueba el diseño de CRUD, datos, tres funciones Edge, una identidad editora y Vercel Blob. Es diseño vigente, no runtime implementado.
- Vite, Next.js u otra tecnología siguen sin decidir. La Etapa 6.1 puede elegir avanzar directamente a la Etapa 7 o, de manera opcional, ejecutar 6.2; ninguna alternativa está implementada.

Los proyectos Front y C# permanecen externos y de sólo lectura por defecto. No se copió su código: se consultan mediante la [guía de referencias fijadas](./docs/migration/legacy-reference.md).

## Autoridad documental

La documentación activa de continuidad es:

- [plan canónico de migración](./docs/migration/migration-plan.md);
- [estado de migración](./docs/migration/migration-status.md);
- [contrato aprobado de publicaciones MVP](./docs/migration/mvp-publications-contract-proposal.md);
- [handover de configuración](./docs/migration/handover.md);
- [handoff para una nueva IA](./docs/migration/ai-handoff.md).

Si existe localmente, `odd/tasks/publish-mvp-documentation.md` registra esta unidad de trabajo, pero `odd/` no forma parte del subconjunto público. Las tareas locales no sustituyen al plan ni autorizan acciones.

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
│   └── supabase/                   # guía pública; config local excluida, sin runtime
└── ui-prototypes/                  # propuesta opcional; no creada
```

`<workspace>/ui-prototypes` es sólo una ubicación hermana propuesta para borradores. No existe por implicación, su eventual Git sería independiente y esos borradores no son especificaciones aprobadas.

## Próximo paso

El padre debe revisar el subconjunto explícito, sus bytes y el historial antes de preparar commits pequeños, el issue y el único PR documental autorizado hacia `develop`. No usar `git add .`, no incluir `supabase/config.toml` ni material ignorado y no afirmar entrega hasta contar con evidencia de push, PR y merge. El trabajo debe detenerse después de la entrega documental, antes de implementar el contrato.

El refinamiento semántico, funcional e histórico de las fuentes raw continúa en la Etapa 10. El contrato MVP aprobado no convierte el archivo legacy en normativa ni promete runtime, integración real o seguridad ya verificada.
