# Guía de despliegue a Supabase Cloud

Esta guía documenta el procedimiento paso a paso para desplegar la base de datos y las Edge Functions de IAM FACEA en **Supabase Cloud**, asegurando la aplicación ordenada de migraciones, el desacoplamiento de secretos y el aprovisionamiento seguro de la identidad editora.

---

## 1. Principios y límites de seguridad

Antes de ejecutar cualquier comando, tené en cuenta los siguientes controles:

1. **Despliegue independiente:** El backend se despliega y verifica de forma autónoma antes de la existencia del frontend.
2. **Prohibición de `seed.sql` en producción:** El archivo `supabase/seed.sql` contiene datos sintéticos de prueba con dominios `.example.invalid` y UUIDs predecibles. **Nunca debe ejecutarse en Supabase Cloud**.
3. **Manejo de secretos:**
   - Nunca expongas la clave privilegiada `service_role` en repositorios, variables de cliente (`VITE_*`, `NEXT_PUBLIC_*`) ni herramientas públicas.
   - La contraseña de la base de datos física sólo se utiliza durante la vinculación local de la CLI (`supabase link`) y debe almacenarse en un gestor de contraseñas seguro.
4. **Falla cerrada de autorización:** Tras aplicar las migraciones, la configuración privada `app_private.editor_configuration.editor_subject` queda en `NULL`. Las rutas editoriales fallan cerradas (`403 Forbidden`) hasta que se complete el aprovisionamiento manual del Paso 5.

---

## 2. Requisitos previos

- **Cuenta activa** en [supabase.com](https://supabase.com).
- **Supabase CLI** instalada localmente (versión oficial `2.122.0` o superior). Comprobá con:
  ```sh
  supabase --version
  ```
- **Token de acceso personal de Supabase (PAT):** Se genera en [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
- **Token de Vercel Blob (opcional para inicio):** `BLOB_READ_WRITE_TOKEN` provisto por Vercel para almacenamiento de imágenes en producción. Si aún no está disponible, las publicaciones podrán crearse en borrador y leerse, pero la subida de nuevas imágenes en la función `images` responderá error hasta configurarlo.

---

## 3. Procedimiento paso a paso

### Paso 1: Crear el proyecto en Supabase Cloud

1. Ingresá a [supabase.com/dashboard](https://supabase.com/dashboard) y seleccioná **New project**.
2. Completá los campos:
   - **Name:** Por ejemplo, `iam-facea-backend` (o el nombre institucional acordado).
   - **Database Password:** Generá una contraseña fuerte y guardala inmediatamente en tu gestor de contraseñas.
   - **Region:** Seleccioná la región más próxima a las personas usuarias (por ejemplo, `sa-east-1` São Paulo para Argentina y el Cono Sur).
   - **Plan:** Free tier es suficiente para esta etapa.
3. Esperá a que el aprovisionamiento termine (1 a 2 minutos).
4. Obtené el **Project Reference ID**:
   - En el menú lateral, andá a **Project Settings** (ícono de engranaje) > **General**.
   - Copiá el valor del campo **Reference ID**. En el proyecto activo de IAM FACEA es `cpeeairlzggsxbhurdas` (visible también en la URL del dashboard: `https://supabase.com/dashboard/project/cpeeairlzggsxbhurdas`).

---

### Paso 2: Autenticación y vinculación local de la CLI

1. **Iniciar sesión en la CLI con tu Access Token:**
   ```sh
   supabase login
   ```
   La CLI abrirá el navegador para autorizar la sesión o solicitará que pegues tu Personal Access Token.

2. **Vincular el repositorio local con el proyecto Cloud:**
   Ejecutá desde la raíz de este repositorio (`iam-facea-page`):
   ```sh
   supabase link --project-ref <TU_PROJECT_REF>
   ```
   La CLI te solicitará la **Database Password** generada en el Paso 1. Una vez ingresada, el proyecto quedará vinculado.

---

### Paso 3: Aplicar las migraciones a PostgreSQL Cloud

El esquema de base de datos se sincroniza aplicando estrictamente la cadena ordenada de 22 migraciones.

Si el puerto Postgres (5432) está habilitado en tu red:
```sh
supabase db push --linked
```

Si tu proveedor de internet bloquea conexiones TCP salientes en los puertos 5432/6543 (causando `Connection timed out`), se puede ejecutar la cadena de migraciones mediante la **Management API (HTTPS puerto 443)** o copiando el script consolidado `supabase/deploy_cloud_migrations.sql` directamente en el **SQL Editor** del dashboard web.

#### ¿Qué hace este comando?
- Compara las migraciones ya aplicadas en el entorno remoto contra la carpeta local `supabase/migrations/`.
- Aplica secuencialmente las 22 migraciones pendientes dentro de transacciones seguras.
- Instala:
  - Tablas: `public.content` y `public.publication`.
  - Esquema privado: `app_private.editor_configuration` (con `editor_subject = NULL`).
  - Triggers: ciclo técnico de timestamps (`trust_publication_timestamps`) y borrado lógico protegido (`soft_delete_publication_row`).
  - Funciones RPC: `read_publications` (helper SQL con RLS defense-in-depth) y `get_editor_subject` (helper `SECURITY DEFINER` para Edge Functions).
  - Políticas de seguridad a nivel de fila (RLS) y revocación de grants directos a `anon` y `authenticated`.

#### Verificación en el Dashboard
Ingresá al **Table Editor** en Supabase Cloud y comprobá que existan las tablas `content` y `publication` vacías, sin filas sintéticas.

---

### Paso 4: Configurar secrets y desplegar las Edge Functions

#### 1. Configurar secrets del servidor
Supabase Cloud inyecta automáticamente en cada función las variables de entorno `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

Si ya contás con las credenciales de producción de Vercel Blob, configuralas en el gestor de secretos de Supabase:
```sh
supabase secrets set BLOB_READ_WRITE_TOKEN="tu_token_de_vercel_blob"
```
*(Podés verificar los secrets activos con `supabase secrets list`).*

#### 2. Desplegar las tres Edge Functions
Desplegá cada función indicando el flag `--no-verify-jwt`:

```sh
supabase functions deploy publications --no-verify-jwt
supabase functions deploy editor-publications --no-verify-jwt
supabase functions deploy images --no-verify-jwt
```

> **¿Por qué usamos `--no-verify-jwt`?**
> La arquitectura aprobada resuelve la autenticación y autorización en la capa de aplicación:
> - `publications` admite solicitudes anónimas sin sesión y aplica RLS en la base.
> - `editor-publications` e `images` validan la sesión contra Supabase Auth y comparan estrictamente `auth.uid()` contra el singleton privado `get_editor_subject()`, impidiendo que cualquier usuario con JWT genérico tenga acceso de edición.

---

### Paso 5: Seguridad y aprovisionamiento de Auth real

En este paso se cierra la brecha de autorización de la Etapa 5, habilitando únicamente a la persona editora autorizada:

#### 1. Crear el usuario editor
- En el dashboard de Supabase, andá a **Authentication** > **Users**.
- Hacé clic en **Add user** > **Create user**.
- Ingresá el correo electrónico institucional del editor y una contraseña segura inicial.
- Marcá el usuario como confirmado (**Auto Confirm User = ON**).
- Copiá el **User UID** asignado (es un UUID con formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

#### 2. Deshabilitar el registro público (Signup abierto)
- En el dashboard, andá a **Authentication** > **Providers** > **Email**.
- Desmarcá la opción **"Allow new users to sign up"** (Permitir registro de nuevos usuarios).
- Guardá los cambios. Esto garantiza que nadie pueda crear cuentas en el sistema de forma no autorizada.

#### 3. Configurar la identidad editora en la base de datos
- Andá al **SQL Editor** del dashboard de Supabase.
- Ejecutá la siguiente consulta, reemplazando el placeholder por el UUID copiado en el punto 1:

```sql
BEGIN;

UPDATE app_private.editor_configuration
SET editor_subject = '<UUID_COPIADO_DEL_EDITOR>'::uuid
WHERE singleton;

COMMIT;
```

#### 4. Verificar la configuración
Ejecutá en el SQL Editor:
```sql
SELECT public.get_editor_subject();
```
Debe retornar exactamente el UUID del usuario editor.

---

### Paso 6: Pruebas de humo de la API remota (Smoke Testing)

Podés comprobar el correcto funcionamiento de los endpoints desplegados mediante `curl` o cualquier cliente HTTP:

#### 1. Probar listado público (Acción 1)
```sh
curl -i https://<TU_PROJECT_REF>.supabase.co/functions/v1/publications
```
* **Respuesta esperada:** `HTTP/1.1 200 OK` con `{ "items": [], "nextCursor": null }`.

#### 2. Probar autorización editorial sin token (Acción 3)
```sh
curl -i https://<TU_PROJECT_REF>.supabase.co/functions/v1/editor-publications
```
* **Respuesta esperada:** `HTTP/1.1 401 Unauthorized` con `{ "error": "Authentication required" }`.

#### 3. Probar login editorial y listado autenticado
Iniciá sesión mediante el endpoint oficial de Supabase Auth para obtener un access token:
```sh
curl -X POST https://<TU_PROJECT_REF>.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: <TU_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "editor@institucion.edu.ar",
    "password": "tu_password_segura"
  }'
```
Copiá el `access_token` retornado y probá el listado editorial:
```sh
curl -i https://<TU_PROJECT_REF>.supabase.co/functions/v1/editor-publications \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
* **Respuesta esperada:** `HTTP/1.1 200 OK` con `{ "items": [], "nextCursor": null }`.

---

### Paso 7: Datos necesarios para el futuro Frontend

Una vez completado el despliegue, guardá de manera segura los siguientes valores públicos para utilizarlos cuando construyamos la aplicación en `apps/web/`:

| Parámetro | Dónde obtenerlo | Uso |
|---|---|---|
| `SUPABASE_URL` | Dashboard > Project Settings > API | URL base del proyecto (`https://<PROJECT_REF>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Dashboard > Project Settings > API | Clave pública cliente para Auth y lectura |

> **Recordatorio:** La clave `service_role` **nunca** se comparte con el frontend ni se incluye en variables `VITE_*` o `NEXT_PUBLIC_*`.
