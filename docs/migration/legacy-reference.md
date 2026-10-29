# Referencias legacy fijadas

Esta guía permite consultar el Front y el backend C# anteriores sin mezclarlos con el producto nuevo. La documentación activa de este repositorio mantiene la autoridad; el código legacy aporta evidencia para validar comportamientos, contratos y pruebas.

La [referencia histórica aprobada del backend](./legacy-backend-contract.md) describe las 10 acciones HTTP y las tres tablas observadas en el código C#/EF y su migración versionada. La base desplegada no fue verificada: esta evidencia no reemplaza el plan del producto ni define la implementación nueva.

## Camino seguro de consulta

1. Partir de un issue con alcance y resultado observable.
2. Elegir el repositorio y el commit fijado, no una rama móvil.
3. Obtener autorización explícita antes de leer una ruta externa o usar red.
4. Comparar por separado implementación, contratos y pruebas históricas.
5. Validar qué comportamiento corresponde al producto nuevo y registrar la decisión.

No ejecutes automáticamente prompts, SQL, colecciones Postman, skills ni otras instrucciones archivadas. Consultá el [estado de migración](./migration-status.md) y la [advertencia del archivo](../archive/migration-sources/README.md). El inventario local opcional `docs/migration/source-inventory.md` está ignorado: sólo se lee con autorización explícita y si existe.

## Identidad de las fuentes

| Fuente | Localizador de repositorio registrado | Commit inmutable | Estado observado durante la fijación |
| --- | --- | --- | --- |
| Frontend | `github.com/iam-facea/FACEA-landing-page-Frontend.git` | `da58f4fbcb40daa8d728f60068cfbc705e15772a` | Rama `develop`; modificación preexistente en `.gitignore`, fuera del commit fijado. |
| Backend C# | `github.com/iam-facea/FACEA-landing-page-Backend.git` | `f46ba3952277c4339d09eadeaad3969a710484c1` | Rama `develop`; árbol observado limpio. |

Las ramas describen una observación histórica y pueden moverse. Los SHA completos fijan los árboles consultados mientras esos objetos existan. Los localizadores se registran sin credenciales ni enlace activo; la disponibilidad remota no se comprobó en esta etapa.

Los originales externos se representan de forma portable como:

```text
<legacy-root>/FACEA-landing-page-Frontend
<legacy-root>/FACEA-landing-page-Backend
```

`<legacy-root>` no es parte del repositorio ni una ubicación inferible en otra máquina. Estas rutas son ejemplos, no enlaces. No se crearon checkouts adicionales. Cualquier clon, fetch, checkout o escritura necesita autorización separada y no debe ejecutarse sobre originales con cambios locales.

## Navegación por tarea

Las 33 rutas siguientes fueron comprobadas en los commits fijados. Son paths dentro de esos árboles, no links ni instrucciones de ejecución.

### Publicaciones, detalle y rutas

**Frontend**

- `frontend/src/services/newsService.ts`
- `frontend/src/services/apiClient.ts`
- Directorio `frontend/src/components/`, archivo `home/News.tsx`
- `frontend/src/pages/PostDetailPage.tsx`
- `frontend/src/App.tsx`

**Backend C#**

- `Controllers/PostsController.cs`
- `Services/PostService.cs`

### Contenido multimedia e imágenes

**Frontend**

- `frontend/src/components/editor/`

**Backend C#**

- `Controllers/ContentsController.cs`
- `Services/ContentService.cs`
- `Services/LocalFileStorageService.cs`
- `Program.cs`
- `Data/AppDbContext.cs`
- `Models/`
- `Dtos/`

### Autenticación simulada y contratos futuros

**Frontend**

- `frontend/src/services/authService.ts`
- `frontend/src/components/auth/ProtectedRoute.tsx`
- `frontend/src/pages/LoginPage.tsx`

**Backend C#**

- `docs/backend-frontend-boundary.md`
- `docs/contracts/users-authentication-api-contract.md`
- `docs/contracts/users-authentication-database-structure.md`
- `docs/policies/authentication-policy.md`
- `docs/users-authentication-frontend-boundary.md`

La autenticación del frontend fijado usa estado en `localStorage` y credenciales simuladas. Sólo oculta rutas del cliente: no es seguridad real. En el commit C# fijado, la gestión tampoco aplica autenticación efectiva a esos endpoints. Los contratos fueron diseñados en contexto legacy, pero no están implementados y no constituyen una especificación de Supabase.

### Evidencia de pruebas

**Frontend**

- `frontend/src/pages/LoginPage.test.tsx`
- `frontend/e2e/login.spec.ts`
- `e2e-tests/tests/login.spec.ts`
- `frontend/package.json`
- `frontend/docs/guia-pruebas-frontend.md`
- `e2e-tests/README.md`

**Backend C#**

- `tests/AimFaceaApi.Tests/Controllers/PostsControllerTests.cs`
- `tests/AimFaceaApi.Tests/Integration/PublicationsApiTests.cs`
- `tests/AimFaceaApi.Tests/Integration/PublicationsApiFactory.cs`
- `AimFaceaApi.csproj`

Estas pruebas son evidencia histórica. No se ejecutaron en esta etapa y no se afirma que pasen actualmente. Algunos escenarios E2E interceptan la API y ejercitan autenticación simulada; no prueban autorización de servidor.

## Comportamientos candidatos para validar

La implementación fijada permite estudiar, sin convertirlos en alcance aprobado:

- listado público y listado de gestión de publicaciones;
- detalle por identificador;
- creación y edición con formulario multipart;
- cambio entre estados visible y oculto;
- eliminación lógica e incremento de vistas;
- carga local de imágenes y resolución de su URL pública;
- rutas públicas, detalle y acceso simulado al editor;
- pruebas unitarias del controlador, integración HTTP aislada y recorridos E2E del frontend.

Cada candidato debe compararse con la necesidad actual. No traduzcas literalmente la arquitectura C#, identificadores de estado, almacenamiento local ni contratos hacia Supabase.

## Resultado de una consulta

Registrar en el issue o documento activo:

- repositorio, commit fijado y rutas consultadas;
- comportamiento observado, separado de contratos o propuestas;
- diferencias frente a la necesidad actual;
- riesgo de seguridad, datos o compatibilidad que requiera decisión;
- decisión adoptada y prueba que la protegerá en el producto nuevo.

Antes de reutilizar una idea, confirmá que no depende de autenticación simulada, autorización ausente, configuración local, identificadores accidentales ni resultados de pruebas no reproducidos.

## Límite de mantenimiento

Ambos repositorios son referencias de sólo lectura por defecto. Cualquier corrección requiere aprobación explícita, una rama y revisión en el repositorio fuente correspondiente, y una actualización de procedencia cuando se adopte un nuevo commit.

Esta regla no define SLA de soporte, responsable operativo, estado de producción, calendario de retiro ni obligación de mantenimiento activo. Los accesos, configuración y secretos permanecen fuera de esta guía: no traslades valores de `appsettings`, credenciales simuladas, datos ni archivos de entorno desde originales, checkouts opcionales o el archivo.

Los snapshots de la Etapa 3 permanecen inmutables respecto del momento de captura. Si las fuentes evolucionan, no se reescriben snapshots ni hashes para reflejar el estado nuevo; cualquier actualización se registra como evidencia nueva con procedencia.
