# Referencia histórica aprobada del backend legacy

> **Estado: descripción legacy revisada y aprobada por el usuario.** Esta referencia documenta el código C#, Entity Framework y la migración PostgreSQL versionada del backend legacy. **No es una API, un esquema ni un contrato del producto nuevo, y no se implementará de forma exacta.**

> **Advertencia no normativa:** las reglas, entidades, autenticación, archivos y acciones HTTP aquí descriptos deberán validarse y adaptarse a Supabase y a requisitos nuevos. No copies literalmente el modelo, no deduzcas roles ni políticas RLS y no uses esta aprobación documental como autorización de runtime, build, pruebas, despliegue o publicación.

## 1. Alcance, procedencia y ruta de revisión

Esta copia autorizada permite consultar, en este orden:

1. las 10 acciones HTTP realmente implementadas;
2. los DTO de entrada y de respuesta exitosa;
3. las reglas que ejecutan hoy los servicios;
4. el modelo EF y el DDL PostgreSQL de la migración versionada;
5. las brechas y observaciones que requieren confirmación humana.

Quedan fuera del alcance:

- mensajes, textos, estados y cuerpos de error;
- ejecución del servidor, consultas a una base, pruebas, build o llamadas HTTP reales;
- cambios en código, configuración, migraciones o planes de producto;
- los endpoints y tablas de Users/Authentication propuestos para el futuro, cuyos documentos declaran expresamente que no están implementados ([contrato API propuesto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/docs/contracts/users-authentication-api-contract.md#L1-L11), [estructura de datos propuesta](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/docs/contracts/users-authentication-database-structure.md#L1-L9)).

### Procedencia fijada

| Dato | Evidencia |
| --- | --- |
| Repositorio legacy | `github.com/iam-facea/FACEA-landing-page-Backend.git` |
| Commit inmutable | `f46ba3952277c4339d09eadeaad3969a710484c1` |
| Estado local observado al aprobar la fuente | `HEAD` en ese commit y árbol de trabajo limpio |
| Alcance de los enlaces | Rutas y rangos derivados de la copia local; no se consultó ni validó la disponibilidad remota de las URLs |
| Base física desplegada | No consultada; su correspondencia con el modelo EF y la migración versionada permanece desconocida |

### Fuentes actuales principales

- Controladores: [PostsController](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Controllers/PostsController.cs#L1-L96) y [ContentsController](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Controllers/ContentsController.cs#L1-L33).
- DTO: [PostCreate](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostCreate.cs#L1-L16), [PostUpdateDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostUpdateDto.cs#L1-L18), [PostStateUpdateDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostStateUpdateDto.cs#L1-L6), [PostResponseDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostResponseDto.cs#L1-L21), [ContentUploadDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/ContentUploadDto.cs#L1-L6) y [ContentResponseDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/ContentResponseDto.cs#L1-L8).
- Servicios: [PostService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L1-L244), [ContentService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ContentService.cs#L1-L57), [LocalFileStorageService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/LocalFileStorageService.cs#L1-L28) e [ImageUrlResolver](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ImageUrlResolver.cs#L1-L29).
- Persistencia: [AppDbContext](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Data/AppDbContext.cs#L1-L36), [modelos](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Models/Post.cs#L1-L54), [migración inicial](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Migrations/20260609232815_InitialCreate.cs#L1-L91) y [snapshot](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Migrations/AppDbContextModelSnapshot.cs#L1-L152).
- Host: [Program.cs](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Program.cs#L1-L52) y [proyecto .NET](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/AimFaceaApi.csproj#L1-L28).

## 2. Convenciones HTTP observadas

- Ambos controladores usan `[ApiController]` y `[Route("api/[controller]")]`. El token toma los nombres `Posts` y `Contents`; este documento escribe las rutas como `/api/posts` y `/api/contents`. Las pruebas HTTP existentes usan minúsculas, por ejemplo `/api/posts/public`, `/api/posts/4/state` y `/api/posts/5/view` ([pruebas de integración](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/tests/AimFaceaApi.Tests/Integration/PublicationsApiTests.cs#L1-L89)).
- Los parámetros `{id:int}` se enlazan desde la ruta como `int`. No hay parámetros query implementados: tampoco hay búsqueda, ordenamiento ni paginación.
- `POST /api/posts`, `PUT /api/posts/{id:int}` y `POST /api/contents` enlazan formularios mediante `[FromForm]`; el formato esperado es `multipart/form-data`.
- `PATCH /api/posts/{id:int}/state` enlaza el cuerpo mediante `[FromBody]`; el formato es JSON.
- Las demás acciones no reciben cuerpo.
- `AddControllers()` no agrega opciones JSON propias. Con las convenciones web de ASP.NET Core del proyecto `net9.0`, los nombres JSON salen en `camelCase`; los nombres C# permanecen en `PascalCase` ([Program.cs](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Program.cs#L20-L29), [AimFaceaApi.csproj](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/AimFaceaApi.csproj#L1-L8)).
- Las listas exitosas son arreglos JSON directos, no sobres paginados. Una lista sin resultados es `[]`.
- Este inventario muestra únicamente respuestas exitosas. Deliberadamente no cataloga respuestas ni mensajes de error.

## 3. Matriz rápida de endpoints implementados

Hay **10 acciones reales: 8 de Posts y 2 de Contents**. No existe una undécima acción en los controladores actuales.

| Método | Ruta | Binding de entrada | Éxito | Forma de respuesta exitosa |
| --- | --- | --- | ---: | --- |
| GET | /api/posts/public | Sin cuerpo, path ni query | 200 | Arreglo JSON de `PostResponseDto` |
| GET | /api/posts | Sin cuerpo, path ni query | 200 | Arreglo JSON de `PostResponseDto` |
| GET | /api/posts/{id:int} | `id:int` desde path; sin cuerpo | 200 | Un `PostResponseDto` |
| POST | /api/posts | `multipart/form-data`, campos de `PostCreate` | 201 | Un `PostResponseDto`; `Location` apunta a la lectura por id |
| PUT | /api/posts/{id:int} | `id:int` desde path y `multipart/form-data` de `PostUpdateDto` | 200 | Un `PostResponseDto` |
| PATCH | /api/posts/{id:int}/state | `id:int` desde path y JSON `PostStateUpdateDto` | 200 | Un `PostResponseDto` |
| DELETE | /api/posts/{id:int} | `id:int` desde path; sin cuerpo | 204 | Cuerpo vacío |
| PATCH | /api/posts/{id:int}/view | `id:int` desde path; sin cuerpo | 204 | Cuerpo vacío |
| GET | /api/contents/{id:int} | `id:int` desde path; sin cuerpo | 200 | Un `ContentResponseDto` |
| POST | /api/contents | `multipart/form-data`, campos de `ContentUploadDto` | 201 | Un `ContentResponseDto`; `Location` apunta a la lectura por id |

Evidencia del mapeo y los resultados exitosos: [PostsController](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Controllers/PostsController.cs#L14-L95) y [ContentsController](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Controllers/ContentsController.cs#L14-L33).

## 4. Contratos de entrada

### 4.1 `PostCreate` — formulario de creación

| Campo form | Tipo C# | Nulabilidad/default del DTO | Regla implementada |
| --- | --- | --- | --- |
| `title` | `string` | No nullable; `string.Empty` | No hay atributo ni validación de contenido en el servicio. |
| `description` | `string` | No nullable; `string.Empty` | No hay atributo ni validación de contenido en el servicio. |
| `category` | `string` | No nullable; `string.Empty` | No hay atributo ni validación de contenido en el servicio. |
| `url` | `string` | No nullable; `string.Empty` | Se guarda en `post.url`; no aparece en `PostResponseDto`. |
| `postStateId` | `int?` | Nullable; default `null` | `null`, `0` o un valor negativo se convierte en estado `1`; un valor positivo debe existir. |
| `file` | `IFormFile` | Declarado no nullable con `default!` | El servicio exige una referencia no nula y longitud mayor que cero. |

Los strings no tienen `[Required]`, longitudes, trim ni reglas de formato declaradas. “No nullable” expresa el contrato estático del DTO, pero no prueba por sí solo qué representación multipart inválida aceptará el runtime; el servicio tampoco valida esos cuatro strings. Fuente: [PostCreate](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostCreate.cs#L1-L16) y [creación en PostService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L91-L130).

### 4.2 `PostUpdateDto` — formulario de reemplazo

| Campo form | Tipo C# | Nulabilidad/default del DTO | Regla implementada |
| --- | --- | --- | --- |
| `title` | `string` | No nullable; `string.Empty` | Reemplaza siempre el valor almacenado. |
| `description` | `string` | No nullable; `string.Empty` | Reemplaza siempre el valor almacenado. |
| `category` | `string` | No nullable; `string.Empty` | Reemplaza siempre el valor almacenado. |
| `url` | `string` | No nullable; `string.Empty` | Reemplaza siempre `post.url`, aunque la respuesta no lo expone. |
| `postStateId` | `int` | No nullable; default CLR `0` | Debe corresponder a un registro existente de `post_state`; el servicio no interpreta `0` como default en update. |
| `file` | `IFormFile?` | Nullable; default `null` | Es opcional. Nulo o vacío conserva el `content_id`; un archivo no vacío crea otro `content`. |

Es un `PUT` de reemplazo para los strings y el estado, no un `PATCH`: omitir un string deja el default del DTO y el servicio lo asigna. No modifica `date`, `views`, `deleted` ni `user_id`. Fuente: [PostUpdateDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostUpdateDto.cs#L1-L18) y [actualización](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L132-L176).

### 4.3 `PostStateUpdateDto` — cambio de estado JSON

| Campo JSON | Tipo C# | Nulabilidad/default del DTO | Regla implementada |
| --- | --- | --- | --- |
| `postStateId` | `int` | No nullable; default CLR `0` | Debe existir en `post_state`; se cambia sólo este campo. |

No hay una lista de transiciones permitidas: cualquier id existente puede asignarse. Fuente: [PostStateUpdateDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostStateUpdateDto.cs#L1-L6) y [UpdatePostStateAsync](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L178-L196).

### 4.4 `ContentUploadDto` — carga independiente

| Campo form | Tipo C# | Nulabilidad/default del DTO | Regla implementada |
| --- | --- | --- | --- |
| `file` | `IFormFile` | Declarado no nullable con `default!` | No tiene atributo de validación ni chequeo explícito de nulo/vacío en `ContentService`; el camino exitoso requiere un archivo utilizable porque se acceden `FileName` y contenido. |

No se atribuye una validación que el DTO o el servicio no implementan. Fuente: [ContentUploadDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/ContentUploadDto.cs#L1-L6) y [CreateContentAsync](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ContentService.cs#L35-L57).

## 5. Contratos de respuesta exitosa

### 5.1 `PostResponseDto`

| Campo JSON | Tipo C# | Nulabilidad/default | Origen |
| --- | --- | --- | --- |
| `id` | `int` | No nullable | `post.post_id` |
| `title` | `string` | No nullable; `string.Empty` | `post.title` |
| `description` | `string` | No nullable; `string.Empty` | `post.description` |
| `category` | `string` | No nullable; `string.Empty` | `post.category` |
| `date` | `DateTime` | No nullable | `post.date` |
| `views` | `int` | No nullable | `post.views` |
| `imageUrl` | `string` | No nullable; `string.Empty` | `content.url_file`, normalizado para respuesta |
| `postStateId` | `int` | No nullable | `post.post_state_id` |

`url`, aunque se acepta y almacena al crear o reemplazar un post, **no es un campo de respuesta**. Tampoco se exponen `deleted`, `user_id` ni `content_id`. Fuente: [PostResponseDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/PostResponseDto.cs#L1-L21) y [proyecciones](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L20-L89).

### 5.2 `ContentResponseDto`

| Campo JSON | Tipo C# | Nulabilidad/default | Origen |
| --- | --- | --- | --- |
| `contentId` | `int` | No nullable | `content.content_id` |
| `urlFile` | `string` | No nullable; `string.Empty` | `content.url_file`, normalizado para respuesta |

El nombre original del archivo se almacena en `content.name`, pero no se devuelve. Fuente: [ContentResponseDto](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Dtos/ContentResponseDto.cs#L1-L8) y [ContentService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ContentService.cs#L18-L57).

## 6. Ejemplos sintéticos de caminos exitosos

Los ejemplos son inertes, no incluyen host, credenciales ni datos reales. Los ids de estado son ilustrativos: los caminos exitosos presuponen que esos registros existen; no afirman que estén sembrados o presentes en una base desplegada.

### 6.1 Crear un post (`multipart/form-data`)

```http
POST /api/posts HTTP/1.1
Content-Type: multipart/form-data; boundary=example-boundary

--example-boundary
Content-Disposition: form-data; name="title"

Jornada de investigación
--example-boundary
Content-Disposition: form-data; name="description"

Actividad académica abierta
--example-boundary
Content-Disposition: form-data; name="category"

Institucional
--example-boundary
Content-Disposition: form-data; name="url"

https://example.com/agenda/42
--example-boundary
Content-Disposition: form-data; name="postStateId"

1
--example-boundary
Content-Disposition: form-data; name="file"; filename="jornada.png"
Content-Type: image/png

<bytes sintéticos omitidos>
--example-boundary--
```

### 6.2 Reemplazar un post y conservar su imagen

```http
PUT /api/posts/42 HTTP/1.1
Content-Type: multipart/form-data; boundary=example-boundary

--example-boundary
Content-Disposition: form-data; name="title"

Jornada de investigación actualizada
--example-boundary
Content-Disposition: form-data; name="description"

Nuevo detalle completo
--example-boundary
Content-Disposition: form-data; name="category"

Académica
--example-boundary
Content-Disposition: form-data; name="url"

https://example.com/agenda/42
--example-boundary
Content-Disposition: form-data; name="postStateId"

2
--example-boundary--
```

La omisión de `file` conserva la relación de contenido. Los demás campos siguen siendo reemplazos completos.

### 6.3 Cargar contenido independiente

```http
POST /api/contents HTTP/1.1
Content-Type: multipart/form-data; boundary=example-boundary

--example-boundary
Content-Disposition: form-data; name="file"; filename="afiche.pdf"
Content-Type: application/pdf

<bytes sintéticos omitidos>
--example-boundary--
```

El ejemplo usa PDF deliberadamente: el código observado no restringe MIME ni extensión.

### 6.4 Cambiar sólo el estado

```http
PATCH /api/posts/42/state HTTP/1.1
Content-Type: application/json

{"postStateId":2}
```

### 6.5 Respuesta exitosa de post

```json
{
  "id": 42,
  "title": "Jornada de investigación actualizada",
  "description": "Nuevo detalle completo",
  "category": "Académica",
  "date": "2026-06-10T14:30:00Z",
  "views": 7,
  "imageUrl": "/images/3b2bb4b0-4cc5-4f31-920c-b32708711b00.png",
  "postStateId": 2
}
```

### 6.6 Respuesta exitosa de contenido

```json
{
  "contentId": 81,
  "urlFile": "/images/5d86be35-60ba-4ea8-a717-58fb78983a9e.pdf"
}
```

### 6.7 Listas y respuestas vacías

Una lista exitosa es un arreglo de `PostResponseDto`:

```json
[
  {
    "id": 42,
    "title": "Jornada de investigación actualizada",
    "description": "Nuevo detalle completo",
    "category": "Académica",
    "date": "2026-06-10T14:30:00Z",
    "views": 7,
    "imageUrl": "/images/example.png",
    "postStateId": 2
  }
]
```

Sin resultados, la forma es:

```json
[]
```

Los éxitos `204` de delete e incremento de vistas no llevan JSON ni otro cuerpo de respuesta.

## 7. Reglas implementadas por los servicios

### Lecturas

- El listado público filtra `deleted = false` y `post_state_id = 1`.
- El listado general filtra solamente `deleted = false`; puede incluir cualquier estado.
- La lectura de un post por id filtra `deleted = false`, pero no exige estado público. Por lo tanto puede leer un post no público si conoce su id.
- No hay orden explícito (`OrderBy`) en los listados; no debe suponerse un orden estable.
- La lectura de contenido por id no aplica estado ni borrado lógico, porque `content` no contiene esos campos.

Fuentes: [consultas de posts](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L20-L89) y [lectura de contenido](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ContentService.cs#L18-L33).

### Creación y actualización

- Crear un post guarda primero el archivo y un registro `content`; después resuelve y valida el estado, y finalmente inserta `post`.
- Si `postStateId` de creación es nulo o menor/igual a cero, se usa el id fijo `1`. El código asume que representa “Público”, pero ni la migración ni el snapshot insertan nombres o ids de estados.
- La creación fija `date = DateTime.UtcNow`, `views = 0` y `deleted = false` en el servicio. Esto no es un default SQL.
- `user_id` no se asigna durante creación y queda nulo por el modelo; no implica identidad, dueño ni autorización.
- El `PUT` busca sólo posts no eliminados, exige un estado existente y reemplaza todos los strings y el estado.
- Un archivo no vacío en `PUT` crea un nuevo `content` y cambia `content_id`; si no lo hay, conserva el contenido actual.
- Cambiar estado modifica únicamente `post_state_id`, siempre que el post no esté eliminado y el estado exista.

Fuente: [PostService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L91-L196).

### Borrado y vistas

- `DELETE` es borrado lógico: cambia `deleted` a `true`; no elimina filas ni archivos.
- Si el post ya está eliminado o no existe, el servicio no cambia datos y el controlador igualmente devuelve `204`. El resultado exitoso es idempotente respecto de ese estado.
- El incremento de vistas usa `FindAsync(id)`, incrementa `views` y no filtra `deleted`; puede incrementar un post eliminado.
- El incremento es un read-modify-write sin token de concurrencia ni actualización atómica observada. Esto registra una ausencia de control explícito; no demuestra por sí solo un resultado concreto bajo concurrencia.

Fuente: [borrado e incremento](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L198-L232) y [acciones HTTP](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Controllers/PostsController.cs#L72-L95).

## 8. Modelo EF actual y DDL versionado

> **Base desplegada: NO VERIFICADA.** No se abrió conexión ni se ejecutó SQL. Las tablas siguientes describen el modelo EF actual y la migración `20260609232815_InitialCreate`, no garantizan que una base concreta tenga ese esquema o esa versión.

El `AppDbContext` declara exactamente tres conjuntos: `Posts`, `Contents` y `PostStates`. No declara entidades de Users ni Authentication ([AppDbContext](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Data/AppDbContext.cs#L1-L35)).

### 8.1 Tabla `content`

| Columna | Tipo PostgreSQL versionado | Null | Clave/generación |
| --- | --- | ---: | --- |
| `content_id` | `integer` | No | PK; `IdentityByDefaultColumn` |
| `name` | `text` | No | — |
| `url_file` | `text` | No | — |

### 8.2 Tabla `post_state`

| Columna | Tipo PostgreSQL versionado | Null | Clave/generación |
| --- | --- | ---: | --- |
| `post_state_id` | `integer` | No | PK; `IdentityByDefaultColumn` |
| `name` | `text` | No | — |

### 8.3 Tabla `post`

| Columna | Tipo PostgreSQL versionado | Null | Clave/relación |
| --- | --- | ---: | --- |
| `post_id` | `integer` | No | PK; `IdentityByDefaultColumn` |
| `title` | `text` | No | — |
| `description` | `text` | No | — |
| `category` | `text` | No | — |
| `date` | `timestamp with time zone` | No | Sin default SQL |
| `views` | `integer` | No | Sin default SQL |
| `url` | `text` | Sí | — |
| `deleted` | `boolean` | No | Sin default SQL |
| `user_id` | `integer` | Sí | Sin FK |
| `content_id` | `integer` | No | FK a `content.content_id`, delete `Restrict` |
| `post_state_id` | `integer` | No | FK a `post_state.post_state_id`, delete `Restrict` |

La migración crea índices no únicos `IX_post_content_id` y `IX_post_post_state_id`. No define índice para `user_id`.

Evidencia: [migración inicial](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Migrations/20260609232815_InitialCreate.cs#L14-L88), [snapshot EF](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Migrations/AppDbContextModelSnapshot.cs#L18-L151) y [mapeo de relaciones](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Data/AppDbContext.cs#L20-L34).

### 8.4 Restricciones y datos que no aparecen en el DDL versionado

- No hay FK desde `post.user_id` ni entidad `User`; ese campo nullable no implementa propiedad ni autorización.
- No hay `ON DELETE CASCADE`: ambas FKs usan `Restrict`.
- No hay constraints `CHECK`, defaults SQL, índices únicos adicionales a los índices de PK ni límites de longitud.
- No hay seed en la migración para `post_state`, `content` o `post`.
- El id público fijo `1` usado por el servicio no prueba el nombre realmente desplegado de esa fila, la existencia de otros ids ni su catálogo.
- Los datos sembrados en `PublicationsApiFactory` pertenecen a una base SQLite aislada de pruebas, no a la migración PostgreSQL ni a una base desplegada ([factory de pruebas](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/tests/AimFaceaApi.Tests/Integration/PublicationsApiFactory.cs#L1-L89)).

## 9. Almacenamiento y resolución de URLs

- `LocalFileStorageService` crea `wwwroot/images`, conserva la extensión extraída del nombre original y genera el nombre físico con un GUID.
- El archivo se copia con `FileMode.Create`; el servicio devuelve una ruta `/images/{guid}{extensión}`.
- `ContentService` almacena el nombre original en `content.name` y esa ruta en `content.url_file`.
- No se observa validación explícita en la aplicación o el servicio de MIME, contenido, extensión permitida ni límite de tamaño; los límites por defecto del host o framework no fueron verificados. El nombre físico se reemplaza por un GUID.
- No se observa borrado de archivos ni de registros `content` al borrar o reemplazar un post.
- Como la creación de `content` se guarda antes de validar el estado y guardar `post`, una falla posterior puede dejar contenido/archivo huérfano. No se observa una transacción compartida ni compensación. El reemplazo también conserva el contenido anterior y una falla posterior a la carga puede dejar el nuevo contenido sin referencia.

Fuentes: [LocalFileStorageService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/LocalFileStorageService.cs#L12-L27), [ContentService](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ContentService.cs#L35-L57) y [orden de creación](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/PostService.cs#L91-L130).

`ImageUrlResolver` aplica estas reglas:

1. valor nulo, vacío o whitespace → string vacío;
2. URL absoluta → se conserva;
3. ruta relativa que no empieza con `/images/` → se conserva;
4. `/images/...` sin `PublicBaseUrl` → se conserva;
5. `/images/...` con `PublicBaseUrl` → se combina con esa base, evitando barras duplicadas.

Sólo se necesita conocer la clave de configuración `PublicBaseUrl`; este documento no leyó ni reproduce valores. La lógica está en [ImageUrlResolver](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Services/ImageUrlResolver.cs#L1-L29) y sus casos están reflejados en [pruebas unitarias](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/tests/AimFaceaApi.Tests/Services/ImageUrlResolverTests.cs#L1-L71).

## 10. Seguridad y límites observados

- `Program.cs` registra controladores, PostgreSQL, OpenAPI, servicios, archivos estáticos, una política CORS y `UseAuthorization()`.
- CORS permite el origen de frontend codificado en el programa, cualquier header y cualquier método. CORS es una política de navegador, no autenticación ni autorización.
- No se observa `AddAuthentication`, un esquema de autenticación, configuración JWT ni atributos `[Authorize]` en los dos controladores.
- Por lo tanto, el código C# actual no demuestra que los endpoints estén protegidos por identidad, rol o propiedad.
- `user_id` no tiene FK, queda sin asignar en creación y no participa en filtros; no demuestra dueño autenticado.
- No se observan precondiciones, ETags, tokens de concurrencia ni validación de versión para mutaciones.
- `UseHttpsRedirection()` está presente y `UseStaticFiles()` publica archivos desde el web root; las imágenes guardadas bajo `wwwroot/images` quedan en esa superficie estática.

Fuente: [Program.cs](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Program.cs#L1-L52), [controladores](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Controllers/PostsController.cs#L1-L96) y [modelo Post](https://github.com/iam-facea/FACEA-landing-page-Backend/blob/f46ba3952277c4339d09eadeaad3969a710484c1/Models/Post.cs#L1-L54).

## 11. Incertidumbres, brechas y notas para revisión

- **Despliegue:** esquema aplicado, versión de migración y datos actuales no fueron verificados contra una base.
- **Estados:** sólo se observa que el servicio trata el id `1` como público. Nombres, catálogo completo y existencia en producción no están demostrados por la migración.
- **Binding:** los DTO no declaran atributos de validación. Los efectos exactos de formularios faltantes, `null` explícito o conversión inválida dependen del binding de ASP.NET Core y no fueron ejecutados en este trabajo.
- **Contenido:** el upload independiente declara `File` no nullable, pero no tiene el control explícito de nulo/vacío que sí existe para crear posts.
- **Rutas:** la plantilla usa nombres de controlador; aquí se normaliza la documentación a minúsculas por el uso observado en pruebas, sin cambiar el código.
- **Orden y paginación:** no existen parámetros ni orden explícito; consumidores no deberían asumirlos.
- **Respuesta de post:** el campo de entrada/almacenamiento `url` no vuelve en `PostResponseDto`; confirmar si la asimetría es intencional antes de diseñar otro contrato.
- **Fecha:** creación usa UTC desde el servicio; el DDL no proporciona default. Inserts externos tendrían que proveer el valor.
- **Archivos:** no se observa validación explícita de contenido ni límite de tamaño en la aplicación o el servicio; los límites por defecto del host o framework no fueron verificados. Tampoco se observa política de limpieza ni transacción coordinada entre filesystem y base.
- **Concurrencia:** la ausencia de controles explícitos merece evaluación, pero este análisis estático no afirma una condición de carrera explotable ni su resultado.
- **Seguridad:** los documentos de Users/Authentication son propuestas futuras, no evidencia de protección actual y no agregan rutas o tablas a este inventario.
- **Traslado:** esta copia autorizada ya está incorporada como referencia histórica del producto con enlaces fijados al commit observado; su publicación continúa sujeta a una autorización separada.

## 12. Revisión humana y uso permitido

- [x] La matriz contiene exactamente 8 acciones de Posts y 2 de Contents.
- [x] Se registra la asimetría entre `url` de entrada/DB y su ausencia en la respuesta.
- [x] `PUT` se describe como reemplazo de strings/estado y no como patch parcial.
- [x] La base desplegada sigue marcada como no verificada.
- [x] Las propuestas de Users/Authentication no se mezclan con lo implementado.
- [x] No se incluyó un catálogo de errores ni de sus mensajes o payloads.

El usuario aprobó el contenido descriptivo del legacy y autorizó esta transferencia documental al repositorio del producto. La aprobación no afirma que el legacy sea seguro, correcto o vigente como requisito; tampoco autoriza reproducirlo, iniciar servicios, consultar una base, ejecutar builds o pruebas, desplegar ni publicar.

> **Advertencia no normativa:** este documento es evidencia histórica descriptiva. Antes de implementar, validá cada regla y necesidad; diseñá identidad, autorización y datos para Supabase y el producto nuevo, sin inventar roles, políticas RLS ni esquemas a partir del legado.
