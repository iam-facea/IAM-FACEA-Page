# Contrato e Instrucciones de Integración Backend para IA (Frontend Bridge MVP)

> **DOCUMENTO DE CONTEXTO E INSTRUCCIONES PARA AGENTES DE IA.**  
> Este documento contiene la especificación estricta, contratos de datos, endpoints y políticas de seguridad del nuevo backend de **IAM FACEA** (basado en Supabase y Edge Functions).  
> Su propósito es guiar a una IA en la adaptación del frontend legacy como puente de aprendizaje (Etapa 6.2 del plan de migración).

---

## 1. Misión, Rol y Restricciones Estrictas

### Rol de la IA
Tu tarea es modificar y adaptar el frontend legacy existente para que consuma exclusivamente este nuevo backend en lugar de la API C# (.NET) histórica. Debes preservar la estructura visual y componentes utilizables de la interfaz, reemplazando la capa de servicios de datos, formularios y autenticación.

### Restricciones Críticas (No negociables)
1. **Cero claves privilegiadas en el cliente:** Solo debes utilizar la clave anónima pública (`VITE_SUPABASE_ANON_KEY`). La clave `service_role` **jamás** debe existir, importarse ni referenciarse en el frontend.
2. **Sin registro público:** El sistema es de editor único. No agregues pantallas ni botones de "Crear cuenta" o "Registrarse" (`signup`).
3. **No inventar endpoints:** El backend expone **exactamente 8 operaciones**. No existen rutas como `/api/v1/posts`, endpoints para cambiar estado por separado (`/status`), ni contadores de vistas (`/views`).
4. **Flujo de imágenes desacoplado:** El backend **no** acepta publicaciones con archivos adjuntos en la misma petición multipart. La carga de imagen y la creación de la publicación son dos pasos separados.
5. **Falla cerrada de autorización:** El backend valida que el usuario autenticado sea estrictamente la persona editora designada. Cualquier otro usuario autenticado recibirá un error `403 Forbidden`.

---

## 2. Variables de Entorno del Cliente

El frontend debe leer las siguientes variables de entorno (ejemplo con prefijo Vite):

```env
# URL base de Supabase (sin barra final)
VITE_SUPABASE_URL="https://<TU-PROJECT-REF>.supabase.co"

# Clave pública anónima de Supabase
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

* **Base URL de las Edge Functions:**
  ```text
  ${VITE_SUPABASE_URL}/functions/v1/
  ```

---

## 3. Autenticación y Gestión de Sesión

El backend utiliza **Supabase Auth** con email y contraseña para la única cuenta editora.

### Flujo de Login Editorial
El frontend puede utilizar el cliente oficial `@supabase/supabase-js` o llamar directamente a la API REST de Auth:

```http
POST https://<TU-PROJECT-REF>.supabase.co/auth/v1/token?grant_type=password
apikey: <VITE_SUPABASE_ANON_KEY>
Content-Type: application/json

{
  "email": "editor@institucion.edu.ar",
  "password": "password_segura"
}
```

**Respuesta exitosa (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "email": "editor@institucion.edu.ar"
  }
}
```

### Cabecera de Autorización
- **Rutas públicas:** No envían cabecera `Authorization`.
- **Rutas editoriales:** Requieren obligatoriamente la cabecera:
  ```http
  Authorization: Bearer <access_token>
  ```

### Renovación de Sesión (Refresh Token)
Cuando el `access_token` expira (o tras recibir un `401 Unauthorized`), renovar la sesión mediante:
```http
POST https://<TU-PROJECT-REF>.supabase.co/auth/v1/token?grant_type=refresh_token
apikey: <VITE_SUPABASE_ANON_KEY>
Content-Type: application/json

{
  "refresh_token": "<TU_REFRESH_TOKEN>"
}
```

---

## 4. Matriz de Endpoints (Las 8 Operaciones)

| # | Visibilidad | Método | Ruta | Headers | Payload / Params | Respuesta Éxito |
|---|---|---|---|---|---|---|
| **1** | Pública | `GET` | `/functions/v1/publications` | Ninguno | Query: `limit?` (1-50, def: 20), `cursor?` | `200 OK` + `PaginatedResponse<PublicPublication>` |
| **2** | Pública | `GET` | `/functions/v1/publications/{id}` | Ninguno | Path: `id` (UUID) | `200 OK` + `PublicPublication` |
| **3** | Editorial | `GET` | `/functions/v1/editor-publications` | `Authorization: Bearer <token>` | Query: `limit?` (1-50, def: 20), `cursor?` | `200 OK` + `PaginatedResponse<EditorPublication>` |
| **4** | Editorial | `GET` | `/functions/v1/editor-publications/{id}` | `Authorization: Bearer <token>` | Path: `id` (UUID) | `200 OK` + `EditorPublication` |
| **5** | Editorial | `POST` | `/functions/v1/editor-publications` | `Authorization: Bearer <token>` | JSON: `PublicationCreatePayload` | `201 Created` + `EditorPublication` (Header `Location`) |
| **6** | Editorial | `PUT` | `/functions/v1/editor-publications/{id}` | `Authorization: Bearer <token>` | Path: `id` (UUID) + JSON: `PublicationReplacePayload` | `200 OK` + `EditorPublication` |
| **7** | Editorial | `DELETE` | `/functions/v1/editor-publications/{id}` | `Authorization: Bearer <token>` | Path: `id` (UUID) | `204 No Content` (cuerpo vacío) |
| **8** | Editorial | `POST` | `/functions/v1/images` | `Authorization: Bearer <token>` | `multipart/form-data` con campo `file` | `201 Created` + `ImageUploadResponse` |

---

## 5. Contratos de Datos (Modelos TypeScript)

Copia y utiliza estas interfaces directamente en la capa de servicios del frontend:

```typescript
export type PublicationStatus = "draft" | "published";

// Respuesta pública para visitantes (sin datos de auditoría ni borrador)
export interface PublicPublication {
  id: string;              // UUID
  title: string;
  description: string;
  category: string;
  publicationDate: string; // Formato YYYY-MM-DD
  imageUrl: string;        // URL pública servida desde CDN / Vercel Blob
}

// Respuesta editorial completa para el panel de administración
export interface EditorPublication {
  id: string;              // UUID
  title: string;
  description: string;
  category: string;
  publicationDate: string; // Formato YYYY-MM-DD
  status: PublicationStatus;
  createdAt: string;       // Timestamp ISO 8601 UTC (ej. 2026-10-29T16:00:00Z)
  updatedAt: string;       // Timestamp ISO 8601 UTC
  publishedAt: string | null;
  image: {
    id: string;            // UUID del registro content
    url: string;           // URL pública de la imagen
  };
}

// Payload para crear una nueva publicación (POST /editor-publications)
export interface PublicationCreatePayload {
  title: string;                 // 1 a 160 caracteres (trim)
  description: string;           // 1 a 1000 caracteres (trim)
  category: string;              // 1 a 80 caracteres (trim)
  publicationDate?: string;      // Opcional en creación: YYYY-MM-DD (por defecto hoy en Arg)
  status?: PublicationStatus;    // Opcional en creación: default "draft"
  imageContentId: string;        // UUID obtenido previamente de /functions/v1/images
}

// Payload para reemplazar completamente una publicación (PUT /editor-publications/{id})
export interface PublicationReplacePayload {
  title: string;                 // Obligatorio: 1 a 160 caracteres
  description: string;           // Obligatorio: 1 a 1000 caracteres
  category: string;              // Obligatorio: 1 a 80 caracteres
  publicationDate: string;       // Obligatorio: YYYY-MM-DD
  status: PublicationStatus;     // Obligatorio: "draft" | "published"
  imageContentId: string;        // Obligatorio: UUID del contenido de imagen
}

// Respuesta al subir una imagen (POST /images)
export interface ImageUploadResponse {
  id: string;        // UUID del contenido de imagen (usar como imageContentId)
  url: string;       // URL pública de previsualización
  createdAt: string; // Timestamp ISO 8601 UTC
}

// Envoltorio de paginación para listados
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null; // Cadena opaca base64url o null si no hay más páginas
}

// Formato unificado de error del backend
export interface ApiErrorResponse {
  error: string;
}
```

---

## 6. Flujo de Carga de Imágenes en Dos Pasos

En el frontend legacy, la imagen solía enviarse junto con los textos en una única llamada `multipart`. En el nuevo backend, **la subida se realiza obligatoriamente en dos pasos**:

```
[Usuario selecciona imagen en Formulario]
                     │
                     ▼
Paso 1: POST /functions/v1/images (multipart/form-data, campo "file")
                     │
                     ▼
Retorna: { id: "uuid-1234", url: "https://blob...", createdAt: "..." }
                     │
                     ▼
Paso 2: POST o PUT /functions/v1/editor-publications
        Body JSON: { ..., imageContentId: "uuid-1234" }
```

### Reglas de Validación en el Cliente para Imágenes
Antes de enviar el archivo a `/functions/v1/images`, el frontend debe validar en el evento `onChange` del input:
1. **Formatos permitidos:** `image/jpeg`, `image/png`, `image/webp`.  
   *(Archivos GIF, SVG, BMP o TIFF serán rechazados con `422 Unprocessable Entity`).*
2. **Tamaño máximo:** **5 MiB** (`5 * 1024 * 1024` bytes).  
   *(Si excede 5 MiB, el backend devolverá `413 Payload Too Large`).*
3. **Dimensiones máximas:** Máximo 4096 x 4096 px.

---

## 7. Paginación Determinista por Cursor

Los listados públicos y editoriales no usan páginas numéricas (`?page=2`). Usan **cursores opacos**.

### Cómo Implementarlo en la UI
1. **Carga inicial:** Solicitar `GET /functions/v1/publications?limit=20` (sin parámetro `cursor`).
2. **Respuesta:** Guardar en el estado los `items` y el valor de `nextCursor`.
3. **Cargar más / Página siguiente:**
   - Si `nextCursor !== null`: solicitar `GET /functions/v1/publications?limit=20&cursor=${encodeURIComponent(nextCursor)}`.
   - Concatenar los nuevos elementos al listado existente.
4. **Fin del listado:** Cuando `nextCursor === null`, deshabilitar el botón "Cargar más" o detener el scroll infinito.
5. **Filtro o recarga:** Al resetear el listado, limpiar el cursor y volver a pedir sin él.

---

## 8. Reglas de Error y Comportamiento de la UI

Todas las respuestas de error del backend utilizan el formato JSON `{ "error": "Mensaje descriptivo" }`. La IA debe configurar los interceptores de API (ej. Axios o fetch wrapper) para actuar según el código HTTP:

| Código HTTP | Motivo en el Backend | Acción Requerida en el Frontend |
|---|---|---|
| **`400 Bad Request`** | Parámetros inválidos: texto excede largo máximo, fecha no es `YYYY-MM-DD`, cursor corrupto, o falta el campo `file`. | Mostrar el mensaje de error directamente en el formulario o campo afectado. |
| **`401 Unauthorized`** | Falta el token, expiró o no tiene formato válido (`"Authentication required"`). | Intentar renovar con `refresh_token`. Si falla, limpiar el storage local de sesión y redirigir al `/login`. |
| **`403 Forbidden`** | La sesión es válida pero el UID de Auth no corresponde a la persona editora autorizada (`"Forbidden"`). | Mostrar un mensaje claro: *"Acceso denegado: tu usuario no tiene permisos de edición"*. **No** desloguear ni reintentar en bucle. |
| **`404 Not Found`** | ID inexistente o ruta equivocada. *(En la API pública, publicaciones en borrador o borradas lógicamente devuelven 404)*. | Mostrar componente o página de *"Publicación no encontrada"*. |
| **`405 Method Not Allowed`** | Método HTTP no permitido para la ruta (ej. `POST` en `/publications`). | Error de desarrollo. Verificar el método invocado según la matriz. |
| **`409 Conflict`** | El `imageContentId` no existe o ya fue asociado a otra publicación (`"Image content is unavailable"`). | Avisar en el formulario: *"La imagen seleccionada ya no está disponible. Por favor subí o seleccioná una nueva"*. |
| **`413 Payload Too Large`** | La imagen excede el límite de 5 MiB (`"Image files must not exceed 5 MiB"`). | Notificar en el selector de archivos: *"El archivo supera el tamaño máximo permitido de 5 MB"*. |
| **`422 Unprocessable Entity`** | Formato de imagen no soportado (ej. SVG/GIF) o dimensiones > 4096 px. | Notificar: *"Formato no soportado o dimensiones inválidas (use JPG, PNG o WebP)"*. |
| **`500 Internal Server Error`** | Error no controlado en base de datos o almacenamiento. | Mostrar notificación global: *"Ocurrió un error en el servidor. Intentá nuevamente más tarde"*. |

---

## 9. Matriz de Refactor: Mapeo Legacy (.NET) ➔ Nuevo Backend

Cuando la IA inspeccione el código del frontend legacy, debe aplicar las siguientes equivalencias exactas:

| Característica Legacy (.NET) | Nuevo Backend (Supabase / Edge Functions) | Acción de la IA en el Frontend |
|---|---|---|
| Rutas tipo `/api/v1/posts` o `/api/publications` | `/functions/v1/publications` (pública) y `/functions/v1/editor-publications` (editorial) | Reemplazar las URLs de la capa de servicios API. |
| Subida combinada (FormData con imagen + título + cuerpo) | 1º `POST /functions/v1/images` ➔ 2º `POST/PUT /functions/v1/editor-publications` | Desacoplar el formulario: subir imagen al seleccionarla o antes de guardar, y enviar el `imageContentId` en el JSON. |
| Campo `viewsCount` o contador de lecturas | **Eliminado deliberadamente del producto** | Quitar contadores de visitas de las cards y vistas de detalle. |
| Campo independiente `url` o `post.url` | **Eliminado deliberadamente del producto** | Quitar campos de enlace externo en formularios y vistas. |
| Fecha con formato .NET `DateTime` completo | Fecha civil estricta `YYYY-MM-DD` | Usar date pickers que devuelvan solo la fecha en formato `YYYY-MM-DD` sin zona horaria ni hora. |
| Eliminación física / borrado con retorno de objeto | `DELETE` con borrado lógico idempotente que retorna `204 No Content` | No esperar payload en el DELETE; actualizar la lista local tras recibir `204`. |
| Paginación tradicional `?page=1&pageSize=10` | Paginación por cursor `?limit=20&cursor=...` | Adaptar componentes de paginación a scroll infinito o botón "Cargar más" basado en `nextCursor`. |
| Autenticación con cookies de sesión o JWT .NET | Supabase Auth Bearer JWT | Reemplazar cliente de autenticación por `@supabase/supabase-js` o llamadas a `/auth/v1/token`. |
