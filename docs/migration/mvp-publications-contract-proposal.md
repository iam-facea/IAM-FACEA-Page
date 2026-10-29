# Contrato aprobado de publicaciones MVP

> **DISEÑO DE PRODUCTO APROBADO — NO IMPLEMENTADO.** Este documento define el contrato HTTP, el modelo de datos y los límites de seguridad aceptados para la primera capacidad. No prueba que existan tablas, migraciones, funciones Edge, políticas RLS, Supabase Auth, Vercel Blob, servicios iniciados, pruebas, integración real ni despliegue.

> La aprobación es documental. Implementar, configurar servicios, usar credenciales, desplegar o publicar código requiere un alcance posterior y evidencia propia.

## 1. Alcance, procedencia y ruta de revisión

El MVP ofrece CRUD de [publicaciones](../../CONTEXT.md) para una única persona editora y lectura pública de publicaciones visibles. El diseño adapta evidencia de la [referencia histórica del backend legacy](./legacy-backend-contract.md), pero no copia sus rutas, arquitectura, tablas ni controles de acceso.

### Diseño aprobado

- Estados `draft` y `published`.
- Sólo las publicaciones `published` con `deleted_at IS NULL` son públicas.
- Una única identidad editora puede crear, listar, leer, reemplazar y eliminar lógicamente publicaciones no eliminadas.
- `publicationDate` es una fecha editorial editable, PostgreSQL `date` y JSON `YYYY-MM-DD`. Si se omite al crear, una frontera confiable usa el día de `America/Argentina/Buenos_Aires` correspondiente al instante de creación.
- El `PUT` es reemplazo completo y exige `publicationDate`; nunca la recalcula silenciosamente.
- `createdAt`, `updatedAt`, `publishedAt` y `deletedAt` son timestamps técnicos UTC administrados por el sistema.
- El listado público ordena por `(publicationDate DESC, id DESC)` y el editorial por `(updatedAt DESC, id DESC)`.
- La respuesta pública contiene exactamente `id`, `title`, `description`, `category`, `publicationDate` e `imageUrl`.
- La respuesta editorial conserva estado, timestamps técnicos habituales, `publicationDate` e imagen con `id` y `url`.
- La descripción admite como máximo 1.000 caracteres.
- No hay contador de vistas ni enlace independiente de publicación.
- El borrado es lógico: conserva la fila y la imagen referenciada, no tiene purga automática y no ofrece recuperación, administración de papelera ni purga dentro del MVP.
- El esquema aprobado usa dos tablas de producto y las ocho operaciones lógicas de la sección 3.
- La API aprobada usa tres funciones Edge: `publications`, `editor-publications` e `images`.
- Vercel Blob es el proveedor inicial de imágenes; las URLs de imagen son públicas y la base guarda el localizador, nunca el binario.
- Supabase Auth usa email y contraseña para una única cuenta editora provisionada administrativamente, sin registro abierto y con flujo de recuperación requerido.

### Arquitectura aprobada

Cada función Edge es una frontera HTTP pequeña compuesta por módulos funcionales acotados. No se crearán cadenas redundantes de interfaces controller/service/repository. El almacenamiento sí conserva un adaptador propio porque separa una dependencia externa real y permite un fake o adaptador local en pruebas.

Las funciones públicas y editoriales dependen de PostgreSQL y RLS. La función pública permite lectura anónima controlada. Las funciones editoriales autentican la sesión y autorizan que el subject coincida exactamente con la identidad editora configurada; un JWT válido por sí solo no alcanza.

### Fuera del alcance

- implementación, runtime, migraciones, seeds, SQL ejecutado, políticas RLS aplicadas, funciones desplegadas o integración con proveedores;
- frontend, búsqueda, filtros por categoría, programación, vistas de base de datos, contador de vistas, auditoría completa, versionado o roles múltiples;
- papelera, restauración, recuperación administrativa o purga física de publicaciones;
- un gateway o servidor propio bajo `/api/v1`;
- compatibilidad literal con ids, formularios, tablas o rutas del legacy;
- un campo independiente equivalente a `post.url`, excluido deliberadamente del producto aprobado.

La revisión debe recorrer primero la matriz de ocho acciones, luego inputs y respuestas, después datos y autorización, y finalmente los límites de implementación pendientes.

## 2. Convenciones HTTP aprobadas

Las rutas son paths concretos de Supabase Functions. El origen final todavía es un placeholder de proyecto, por ejemplo `https://<project-origin>`; no se afirma que exista un despliegue.

| Función Edge | Path base | Responsabilidad |
| --- | --- | --- |
| `publications` | `/functions/v1/publications` | Lista y detalle públicos. |
| `editor-publications` | `/functions/v1/editor-publications` | Lista, detalle, creación, reemplazo y borrado lógico editoriales. |
| `images` | `/functions/v1/images` | Carga autenticada de una imagen. |

No se promete un servidor separado, un gateway personalizado ni rutas `/api/v1`.

- Los paths usan minúsculas y JSON usa `camelCase`.
- Los ids son UUID representados como strings canónicos.
- `publicationDate` es una fecha civil `YYYY-MM-DD`, sin hora ni offset.
- Los timestamps técnicos son RFC 3339 UTC con sufijo `Z`.
- Crear o reemplazar publicaciones usa `application/json` y referencia un `imageContentId` previamente cargado.
- Sólo la carga de imagen usa `multipart/form-data`, con un único campo `file`.
- Las listas exitosas usan `{ "items": [...], "nextCursor": string | null }`.
- `limit` es opcional, default `20`, mínimo `1` y máximo `50`.
- `cursor` es opcional, opaco para el cliente y exclusivo del listado que lo emitió.
- El cursor público codifica la tupla `(publicationDate, id)`; el editorial, `(updatedAt, id)`. La codificación es base64url de un objeto versionado y no promete cifrado.
- `POST` devuelve `201`; lecturas y `PUT`, `200`; `DELETE`, `204` sin cuerpo.
- Un `DELETE` repetido o dirigido a un id inexistente devuelve `204` y no altera timestamps existentes.

### Paginación determinista

Después de un cursor público `(d, i)`, la página siguiente incluye sólo:

```text
publicationDate < d OR (publicationDate = d AND id < i)
```

El listado editorial aplica la misma regla con `(updatedAt, id)`. La consulta obtiene `limit + 1` filas, devuelve como máximo `limit` y emite cursor sólo si existe otra fila. La fecha editorial es editable: el cursor da un orden determinista por consulta, pero no un snapshot estable entre requests concurrentes.

## 3. Matriz de las ocho operaciones lógicas

Hay **exactamente ocho acciones**. `publicationDate`, estado e imagen se administran dentro de estas operaciones; no existen endpoints adicionales para esos campos.

| # | Método | Ruta concreta | Entrada | Autorización | Éxito |
| ---: | --- | --- | --- | --- | --- |
| 1 | GET | `/functions/v1/publications` | Query `limit?`, `cursor?` | Pública, sin sesión; RLS limita a `published` no eliminadas | `200`, página pública |
| 2 | GET | `/functions/v1/publications/{id}` | UUID en path | Pública, sin sesión; RLS exige `published` no eliminada | `200`, publicación pública |
| 3 | GET | `/functions/v1/editor-publications` | Query `limit?`, `cursor?` | Sesión válida + subject editor exacto | `200`, ambos estados, sin eliminadas |
| 4 | GET | `/functions/v1/editor-publications/{id}` | UUID en path | Sesión válida + subject editor exacto | `200`, ambos estados, sin eliminadas |
| 5 | POST | `/functions/v1/editor-publications` | JSON `PublicationCreate` | Sesión válida + subject editor exacto | `201`, publicación; `Location` editorial |
| 6 | PUT | `/functions/v1/editor-publications/{id}` | UUID + JSON `PublicationReplace` | Sesión válida + subject editor exacto; sólo no eliminada | `200`, publicación reemplazada |
| 7 | DELETE | `/functions/v1/editor-publications/{id}` | UUID en path | Sesión válida + subject editor exacto | `204`, borrado lógico idempotente |
| 8 | POST | `/functions/v1/images` | `multipart/form-data`, campo `file` | Sesión válida + subject editor exacto | `201`, contenido de imagen |

## 4. Contratos de entrada aprobados

### 4.1 `PublicationCreate`

Cuerpo `application/json`:

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | ---: | --- |
| `title` | string | Sí | Trim; entre 1 y 160 caracteres. |
| `description` | string | Sí | Trim; entre 1 y 1.000 caracteres. |
| `category` | string | Sí | Trim; entre 1 y 80 caracteres. |
| `publicationDate` | string `YYYY-MM-DD` | No | Si falta, se asigna el día de creación en `America/Argentina/Buenos_Aires` desde una frontera confiable. |
| `status` | `draft` \| `published` | No | Default `draft`; nunca publica por omisión. |
| `imageContentId` | UUID string | Sí | Debe existir, no estar asignado a otra publicación y provenir del ciclo autorizado de carga. |

No acepta ids ni timestamps técnicos. Tampoco acepta vistas, binarios o enlace independiente de publicación.

### 4.2 `PublicationReplace`

Cuerpo `application/json`; todos los campos son obligatorios:

| Campo | Tipo | Regla |
| --- | --- | --- |
| `title` | string | Reemplazo completo; misma validación que creación. |
| `description` | string | Reemplazo completo; misma validación que creación. |
| `category` | string | Reemplazo completo; misma validación que creación. |
| `publicationDate` | string `YYYY-MM-DD` | Fecha editorial explícita; no se recalcula. |
| `status` | `draft` \| `published` | Reemplaza el estado. |
| `imageContentId` | UUID string | Conserva o cambia la imagen según el id enviado. |

Omitir un campo no significa conservarlo. El reemplazo sólo afecta una publicación con `deleted_at IS NULL`.

El ciclo técnico aprobado para `publishedAt` es:

- `draft → published`: asignar la hora UTC confiable de la operación;
- `published → published`: conservar el valor;
- `published → draft`: asignar `null`;
- una publicación retirada y republicada recibe un timestamp nuevo.

### 4.3 `ImageUpload`

Request `multipart/form-data` con un único campo `file`.

- tamaño máximo: 5 MiB;
- formatos: JPEG, PNG y WebP;
- dimensiones máximas decodificadas: 4096 × 4096;
- validación por bytes y formato real, no sólo por nombre, extensión o `Content-Type`;
- clave física generada por la frontera confiable, sin usar el nombre cliente como identificador;
- SVG, PDF y otros formatos quedan fuera del MVP.

La carga devuelve un `contentId`; por sí sola no crea una publicación.

### 4.4 Enlace independiente excluido

El producto no tendrá un campo separado equivalente a `post.url`. La decisión es intencional y no queda pendiente: `imageUrl` representa exclusivamente la imagen.

## 5. Contratos de respuesta exitosa aprobados

### 5.1 `PublicPublicationResponse`

Contiene **exactamente**:

| Campo JSON | Tipo |
| --- | --- |
| `id` | UUID string |
| `title` | string |
| `description` | string |
| `category` | string |
| `publicationDate` | string `YYYY-MM-DD` |
| `imageUrl` | string URL pública |

No expone estado, timestamps técnicos ni id interno de imagen.

### 5.2 `EditorPublicationResponse`

Contiene **exactamente**:

| Campo JSON | Tipo |
| --- | --- |
| `id` | UUID string |
| `title` | string |
| `description` | string |
| `category` | string |
| `publicationDate` | string `YYYY-MM-DD` |
| `status` | `draft` \| `published` |
| `createdAt` | timestamp UTC |
| `updatedAt` | timestamp UTC |
| `publishedAt` | timestamp UTC \| null |
| `image.id` | UUID string |
| `image.url` | string URL pública |

No incluye vistas, `deletedAt`, identidad editora ni enlace independiente.

### 5.3 `ImageContentResponse`

| Campo JSON | Tipo |
| --- | --- |
| `id` | UUID string |
| `url` | string URL pública |
| `createdAt` | timestamp UTC |

### 5.4 Páginas

```json
{
  "items": [],
  "nextCursor": null
}
```

Los items públicos usan `PublicPublicationResponse`; los editoriales, `EditorPublicationResponse`.

## 6. Ejemplos sintéticos de las ocho acciones

El origen final permanece como placeholder. Los ids, tokens, fechas y URLs son sintéticos.

### 6.1 Acción 1 — listado público

```http
GET /functions/v1/publications?limit=20 HTTP/1.1
```

```json
{
  "items": [
    {
      "id": "f3a6128c-4a65-4810-a441-e19ab1d6d855",
      "title": "Jornada de investigación",
      "description": "Actividad académica abierta a la comunidad.",
      "category": "Institucional",
      "publicationDate": "2027-03-09",
      "imageUrl": "https://media.example.invalid/example.webp"
    }
  ],
  "nextCursor": null
}
```

### 6.2 Acción 2 — detalle público

```http
GET /functions/v1/publications/f3a6128c-4a65-4810-a441-e19ab1d6d855 HTTP/1.1
```

Devuelve `PublicPublicationResponse` sólo si la fila es `published` y no está eliminada.

### 6.3 Acción 3 — listado editorial

```http
GET /functions/v1/editor-publications?limit=20 HTTP/1.1
Authorization: Bearer <sesión-editor-sintética>
```

Devuelve el sobre paginado con `EditorPublicationResponse`, ambos estados, sin eliminadas y ordenado por `(updatedAt DESC, id DESC)`.

### 6.4 Acción 4 — detalle editorial

```http
GET /functions/v1/editor-publications/f3a6128c-4a65-4810-a441-e19ab1d6d855 HTTP/1.1
Authorization: Bearer <sesión-editor-sintética>
```

Devuelve `EditorPublicationResponse` sólo al subject editor exacto y cuando `deleted_at IS NULL`.

### 6.5 Acción 5 — crear publicación

```http
POST /functions/v1/editor-publications HTTP/1.1
Authorization: Bearer <sesión-editor-sintética>
Content-Type: application/json

{
  "title": "Jornada de investigación",
  "description": "Actividad académica abierta a la comunidad.",
  "category": "Institucional",
  "publicationDate": "2027-03-08",
  "status": "draft",
  "imageContentId": "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31"
}
```

La respuesta `201` usa `EditorPublicationResponse` y `Location: /functions/v1/editor-publications/{id}`. Si se omite `publicationDate`, la frontera confiable usa el día de creación en `America/Argentina/Buenos_Aires`.

### 6.6 Acción 6 — reemplazar y publicar

```http
PUT /functions/v1/editor-publications/f3a6128c-4a65-4810-a441-e19ab1d6d855 HTTP/1.1
Authorization: Bearer <sesión-editor-sintética>
Content-Type: application/json

{
  "title": "Jornada de investigación 2027",
  "description": "Actividad académica abierta a la comunidad.",
  "category": "Institucional",
  "publicationDate": "2027-03-09",
  "status": "published",
  "imageContentId": "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31"
}
```

La respuesta `200` usa `EditorPublicationResponse`; `publicationDate` sigue siendo editorial y `publishedAt` registra la transición técnica UTC.

### 6.7 Acción 7 — eliminar lógicamente

```http
DELETE /functions/v1/editor-publications/f3a6128c-4a65-4810-a441-e19ab1d6d855 HTTP/1.1
Authorization: Bearer <sesión-editor-sintética>
```

La primera eliminación asigna `deleted_at` y `updated_at` al mismo instante UTC confiable, conserva fila e imagen y devuelve `204`. Las repeticiones conservan esos timestamps.

### 6.8 Acción 8 — cargar imagen

```http
POST /functions/v1/images HTTP/1.1
Authorization: Bearer <sesión-editor-sintética>
Content-Type: multipart/form-data; boundary=example-boundary

--example-boundary
Content-Disposition: form-data; name="file"; filename="jornada.webp"
Content-Type: image/webp

<bytes sintéticos omitidos>
--example-boundary--
```

```json
{
  "id": "64e0e8d4-56b4-4bd0-990f-0f3bc5e6bb31",
  "url": "https://media.example.invalid/example.webp",
  "createdAt": "2027-03-10T14:00:00Z"
}
```

## 7. Reglas de servicio y negocio aprobadas

### Lectura

- Lista y detalle públicos filtran `status = 'published' AND deleted_at IS NULL`.
- Lista y detalle editoriales incluyen `draft` y `published`, pero excluyen eliminadas.
- Conocer un UUID no evita esos filtros.
- No hay efectos laterales ni contador de vistas en las lecturas.

### Creación y reemplazo

- Una creación sin estado produce `draft`.
- Una creación sin fecha usa el día argentino calculado desde el instante confiable; una actualización siempre usa la fecha enviada.
- El sistema, no el cliente, administra timestamps técnicos UTC.
- Cada publicación tiene exactamente una imagen y cada `content` pertenece como máximo a una publicación.
- El reemplazo es completo y usa last-write-wins para la única identidad editora.
- Una publicación eliminada no puede leerse, reemplazarse ni reactivarse mediante las operaciones habituales.

### Borrado lógico y retención

- La primera eliminación asigna una sola vez `deleted_at` y actualiza `updated_at` al mismo instante.
- El estado y `published_at` no se modifican al eliminar.
- La fila, su `content_id` y el objeto de imagen referenciado se conservan sin purga automática.
- El MVP no ofrece listado de eliminadas, restauración, recuperación administrativa ni purga física.
- Cualquier capacidad futura de recuperación o purga requiere otra decisión, otro permiso y otro contrato.

### Validación y errores

Se validan strings, ids, fechas, estado, cursor, límites, autorización y archivo. Este contrato fija respuestas exitosas; un catálogo exhaustivo de errores puede definirse al implementar sin ampliar las ocho acciones ni debilitar autorización.

## 8. Esquema PostgreSQL aprobado, todavía no aplicado

> No existe migración ni SQL aplicado. Las tablas, constraints e índices siguientes son diseño aprobado; no describen una base actual.

Supabase Auth conserva identidades fuera de estas tablas. No se agrega una tabla local de usuarios o roles.

### 8.1 `content`

| Columna | Tipo | Null | Default | Restricción |
| --- | --- | ---: | --- | --- |
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `image_url` | `text` | No | — | `UNIQUE`; no vacío |
| `created_at` | `timestamptz` | No | `now()` | Hora técnica UTC |

No guarda binario, bucket, proveedor, credenciales, nombre original ni metadata del SDK.

### 8.2 `publication`

| Columna | Tipo | Null | Default | Restricción |
| --- | --- | ---: | --- | --- |
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `title` | `varchar(160)` | No | — | Trim; longitud 1–160 |
| `description` | `text` | No | — | Trim; longitud 1–1000 |
| `category` | `varchar(80)` | No | — | Trim; longitud 1–80 |
| `publication_date` | `date` | No | Frontera confiable en zona argentina cuando se omite en creación | No usar una zona de sesión implícita |
| `status` | `text` | No | `'draft'` | `draft` o `published` |
| `content_id` | `uuid` | No | — | FK a `content.id`, `ON DELETE RESTRICT`, `UNIQUE` |
| `created_at` | `timestamptz` | No | `now()` | — |
| `updated_at` | `timestamptz` | No | `now()` | No anterior a `created_at` |
| `published_at` | `timestamptz` | Sí | `NULL` | Coherente con estado |
| `deleted_at` | `timestamptz` | Sí | `NULL` | Primera eliminación lógica |

Consistencia técnica:

```text
(status = 'draft' AND published_at IS NULL)
OR
(status = 'published' AND published_at IS NOT NULL)
```

Los cambios de `updated_at`, `published_at` y `deleted_at` ocurren en una frontera confiable.

### 8.3 Índices

- PK de ambas tablas;
- unique de `content(image_url)`;
- unique de `publication(content_id)`;
- índice parcial público `(publication_date DESC, id DESC) WHERE status = 'published' AND deleted_at IS NULL`;
- índice parcial editorial `(updated_at DESC, id DESC) WHERE deleted_at IS NULL`.

No se crean vistas de base de datos ni tablas de estado, categorías, usuarios, roles o auditoría.

### 8.4 Contenido no referenciado

Un `content` referenciado por una publicación —incluso eliminada— se conserva. Una carga que nunca fue referenciada o una imagen reemplazada puede convertirse en huérfana, pero no se aprueba ni activa ahora un job, cronograma o plazo de limpieza. Si la implementación demuestra esa necesidad, el mecanismo, la observabilidad y la autoridad de borrado se decidirán por separado.

## 9. Almacenamiento y resolución de URLs

Vercel Blob es el proveedor inicial elegido. La elección no promete gratuidad, cuotas, precios, disponibilidad de un modo de acceso ni comportamiento entre proveedores. Los términos comerciales, la disponibilidad y los detalles del SDK deben verificarse antes de integrar.

### Límite del adaptador

La aplicación depende de un adaptador real de almacenamiento:

1. `store(contentId, validatedImage) → publicImageUrl`;
2. `delete(publicImageUrl) → resultado reintentable`, sólo para contenido confirmado como no referenciado;
3. producción usa Vercel Blob;
4. pruebas usan un adaptador local o fake determinista y sin red.

La base guarda la URL pública, no el binario. No se agregan bucket, nombre de servicio ni detalles del proveedor al esquema. El adaptador desacopla la dependencia externa; no promete que otro proveedor sea intercambiable sin verificación.

### Ciclo de carga

1. Autenticar y autorizar al subject editor exacto.
2. Validar tamaño, formato y dimensiones.
3. Generar el UUID de `content` en una frontera confiable.
4. Guardar mediante el adaptador.
5. Insertar `content` con id y URL.
6. Devolver `ImageContentResponse`.
7. Referenciar ese id al crear o reemplazar una publicación.

No existe transacción distribuida entre PostgreSQL y Vercel Blob. Una compensación puede intentar borrar un objeto si falla el registro, pero la limpieza periódica de huérfanos sigue inactiva y sin cronograma aprobado.

### URLs públicas

Las imágenes del MVP usan URLs públicas. RLS protege filas y operaciones, pero no vuelve privada una URL ya conocida ni revoca el objeto al borrar lógicamente una publicación. Por eso no deben cargarse imágenes sensibles. Las credenciales de Vercel Blob permanecen sólo en una frontera servidor y nunca usan prefijos públicos como `VITE_*` o `NEXT_PUBLIC_*`.

## 10. Seguridad, Auth y autorización

- Una única cuenta editora de Supabase Auth se provisiona administrativamente con email y contraseña.
- No existe registro abierto.
- El producto debe ofrecer un flujo de recuperación de contraseña para esa cuenta; no se documentan credenciales ni datos reales.
- La función `publications` admite requests sin sesión y devuelve sólo la proyección pública de filas `published` no eliminadas, respaldada por RLS.
- Las funciones `editor-publications` e `images` exigen sesión válida y comparación exacta de `auth.uid()` con el subject editor configurado.
- Cualquier otro subject autenticado conserva el mismo límite de escritura que una persona anónima y no puede leer drafts o eliminadas.
- La carga de `content` ocurre sólo a través de la frontera que valida imágenes.
- La lectura pública de la fila de contenido sólo se habilita cuando corresponde a una publicación pública; esto no oculta una URL pública ya conocida.
- El borrado lógico ocurre mediante una operación confiable que asigna `deleted_at` una sola vez.
- Ocultar controles en frontend y configurar CORS no constituyen autorización.
- Una clave privilegiada, si una implementación futura la requiere y justifica, permanece exclusivamente del lado servidor y nunca se expone con prefijos públicos.

No hay políticas, grants, funciones, subjects, credenciales ni recuperación configurados actualmente. La implementación deberá probar accesos positivos y negativos mediante RLS y la frontera HTTP; no alcanza con validar un JWT.

## 11. Límites de implementación y decisiones futuras

Las decisiones de producto y arquitectura de este contrato están cerradas para el MVP. Siguen pendientes de trabajo, no de aprobación retroactiva:

1. escribir y revisar migraciones, seeds sintéticos, RLS y las tres funciones Edge;
2. definir el catálogo concreto de errores sin cambiar las ocho acciones exitosas;
3. provisionar de forma segura la identidad editora y configurar el flujo de recuperación;
4. verificar términos comerciales, disponibilidad, permisos y SDK vigente de Vercel Blob antes de integrar;
5. comprobar con integración real que las URLs públicas y las operaciones del proveedor se comportan como exige el contrato;
6. decidir sólo si aparece una necesidad demostrada cómo observar y limpiar contenido verdaderamente huérfano;
7. tratar recuperación administrativa, papelera y purga física como capacidades futuras fuera del MVP;
8. elegir la tecnología y el recorrido del frontend en las etapas posteriores del plan.

La base desplegada legacy permanece sin verificar y no condiciona estas decisiones aprobadas.

## 12. Revisión humana y uso permitido

### Diseño aprobado

- [x] CRUD de publicaciones, campos, defaults, límites y reemplazo completo.
- [x] Ocho acciones concretas bajo tres funciones Edge de Supabase.
- [x] Proyecciones pública y editorial exactas.
- [x] Fecha editorial argentina y timestamps técnicos UTC.
- [x] Borrado lógico sin purga automática ni recuperación dentro del MVP.
- [x] Dos tablas, constraints, índices y ausencia de vistas.
- [x] Supabase Auth para un único editor, sin signup y con recuperación requerida.
- [x] Autorización por subject exacto y RLS, no sólo por JWT.
- [x] Vercel Blob inicial, URLs públicas y adaptador genuino de almacenamiento.
- [x] Exclusión intencional de vistas de base de datos, contador de vistas y enlace independiente de publicación.

### Implementación todavía pendiente

- [ ] Servicios locales iniciados y configuración de desarrollo revisada.
- [ ] Migraciones y seeds creados y aplicados.
- [ ] RLS, Auth y tres funciones Edge implementados.
- [ ] Integración con Vercel Blob verificada con términos y SDK vigentes.
- [ ] Pruebas positivas, negativas y de integración ejecutadas.
- [ ] Despliegue real verificado.

Este documento puede publicarse como contrato de diseño aprobado. No debe presentarse como capacidad existente, configuración aplicada, proveedor verificado, prueba ejecutada ni autorización para comenzar implementación.
