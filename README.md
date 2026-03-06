# Sistema PQRS Institucional — Frontend

Sistema web institucional para la gestión de **Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones (PQRSF)**. Desarrollado en React + TypeScript con Vite, conectado a un backend Django REST Framework.

---

## Tabla de contenidos

1. [Características principales](#características-principales)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura del proyecto](#arquitectura-del-proyecto)
4. [Roles y permisos](#roles-y-permisos)
5. [Rutas de la aplicación](#rutas-de-la-aplicación)
6. [Módulos principales](#módulos-principales)
7. [Variables de entorno](#variables-de-entorno)
8. [Instalación y ejecución](#instalación-y-ejecución)
9. [Build para producción](#build-para-producción)
10. [Comunicación con el backend](#comunicación-con-el-backend)

---

## Características principales

- **Radicación de PQRSF** pública (ciudadano anónimo o autenticado), con adjunto de archivos y verificación reCAPTCHA.
- **Consulta de radicado** pública por número de radicado sin necesidad de cuenta.
- **Dashboard de ciudadano** para seguimiento de PQRSF propias.
- **Dashboard de área** para gestión de PQRSF asignadas a una dependencia.
- **Dashboard de administrador** con visión global: asignación, respuesta, escalamiento, SLA y estadísticas.
- **Gestión de áreas, roles y SLA** exclusiva para administradores.
- Protección de rutas basada en roles con redirección automática.
- Refresco silencioso de JWT (access + refresh token) sin cerrar sesión.
- Soporte para envío **anónimo** de PQRSF (campos de remitente opcionales).
- Animaciones fluidas con **Framer Motion** y retroalimentación con **Sonner toasts**.

---

## Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework UI | React 19 + TypeScript |
| Build tool | Vite 6 |
| Estilos | Tailwind CSS v4 |
| Componentes base | Radix UI + shadcn/ui |
| Iconos | Lucide React + MUI Icons |
| Formularios | React Hook Form |
| Animaciones | Motion (Framer Motion) |
| Routing | React Router v7 (data router) |
| Notificaciones | Sonner |
| CAPTCHA | react-google-recaptcha |
| HTTP | Fetch nativo con wrapper centralizado |
| Backend | Django REST Framework (externo) |

---

## Arquitectura del proyecto

```
src/
├── main.tsx                   # Punto de entrada — monta <App />
└── app/
    ├── App.tsx                # Raíz: provee RouterProvider
    ├── routes.tsx             # Definición de rutas + guardias de acceso
    ├── context/
    │   └── AuthContext.tsx    # Estado global de autenticación (JWT + perfil)
    ├── lib/
    │   ├── api.ts             # Capa HTTP completa (todos los endpoints)
    │   ├── config.ts          # Variables de entorno centralizadas
    │   ├── utils.ts           # Helpers de formato y utilidades
    │   └── mockData.ts        # Datos de prueba para desarrollo
    ├── pages/
    │   ├── Home.tsx           # Landing pública + formulario PQRSF inline
    │   ├── Login.tsx          # Inicio de sesión
    │   ├── Register.tsx       # Registro de usuarios
    │   ├── CrearPQRS.tsx      # Formulario completo de radicación (autenticado)
    │   ├── ConsultaRadicado.tsx # Búsqueda pública por número de radicado
    │   ├── UserDashboard.tsx  # Panel del ciudadano
    │   ├── AdminDashboard.tsx # Panel del administrador
    │   ├── AreaDashboard.tsx  # Panel de la dependencia/área
    │   ├── GestionAreas.tsx   # CRUD de dependencias (admin)
    │   ├── GestionRoles.tsx   # Gestión de usuarios y roles (admin)
    │   ├── GestionSLA.tsx     # Configuración de SLA por tipo (admin)
    │   └── NotFound.tsx       # Página 404
    ├── components/
    │   ├── layout/            # Navbar institucional y Layout wrapper
    │   ├── ui/                # Componentes base shadcn/ui (Radix wrapped)
    │   ├── ChatBot.tsx        # Asistente integrado
    │   ├── PageTransition.tsx # Wrapper de animaciones entre páginas
    │   ├── TerminosModal.tsx  # Modal de términos y condiciones
    │   └── DiagonalStripes.tsx# Decorativo de fondo
    └── styles/                # CSS global, fuentes y tema
```

---

## Roles y permisos

El sistema define tres roles derivados automáticamente del perfil del backend:

| Rol | Condición de asignación | Acceso |
|---|---|---|
| `admin` | `is_staff === true` | Panel admin, gestión de áreas/roles/SLA, todas las PQRSF |
| `area` | Tiene `dependency` asignada y no es staff | Panel de área, PQRSF de su dependencia |
| `usuario` | Ninguno de los anteriores (ciudadano) | Panel de usuario, sus propias PQRSF |

Las rutas protegidas usan el componente `ProtectedRoute` en [src/app/routes.tsx](src/app/routes.tsx) que redirige automáticamente según el rol activo.

---

## Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Home` | Público |
| `/login` | `Login` | Público (redirige si ya autenticado) |
| `/register` | `Register` | Público |
| `/consulta` | `ConsultaRadicado` | Público |
| `/crear-pqrs` | `CrearPQRS` | Autenticado |
| `/dashboard` | `UserDashboard` | Rol `usuario` |
| `/admin` | `AdminDashboard` | Rol `admin` |
| `/area` | `AreaDashboard` | Rol `area` |
| `/admin/areas` | `GestionAreas` | Rol `admin` |
| `/admin/roles` | `GestionRoles` | Rol `admin` |
| `/admin/sla` | `GestionSLA` | Rol `admin` |
| `/perfil` | `Perfil` | Autenticado |
| `*` | `NotFound` | Público |

---

## Módulos principales

### `AuthContext` — [src/app/context/AuthContext.tsx](src/app/context/AuthContext.tsx)

Gestiona el ciclo de vida de la sesión:

- `access_token` se almacena en `sessionStorage` (no persiste entre pestañas ni al cerrar el navegador, reduciendo exposición XSS). `refresh_token` permanece en `localStorage`.
- Al iniciar, verifica el token y carga el perfil desde el backend. El backend siempre es **fuente de verdad** para roles y permisos; los valores de `localStorage` no elevan privilegios.
- Escucha el evento `auth:session-expired` (emitido por `apiFetch` al recibir un 401 irrecuperable) para limpiar sesión y redirigir al login de forma segura (sin `window.location.href`).
- `login()` y `loginWithGoogle()` retornan `{ ok, rol?, error? }` para que el componente de login pueda navegar al destino correcto sin leer `localStorage`.
- Expone `usuario`, `isAuthenticated`, `loading`, `login()`, `loginWithGoogle()`, `logout()` y `refreshPerfil()`.

### `api.ts` — [src/app/lib/api.ts](src/app/lib/api.ts)

Capa HTTP centralizada:

- **`tokens`**: helpers que almacenan el `access_token` en `sessionStorage` y el `refresh_token` en `localStorage`. `tokens.clear()` limpia ambos almacenamientos al cerrar sesión.
- `apiFetch<T>()`: wrapper con adjunto de JWT Bearer, refresco automático en 401, y ante fallo del refresco emite el evento `auth:session-expired` (en lugar de redirigir con `window.location.href`) para que `AuthContext` realice la navegación de forma segura dentro del router.
- `apiFetchBlob()`: variante especializada para respuestas binarias (`Blob`) con el mismo mecanismo de refresco, usada en la exportación de reportes.
- Endpoints de exportación: `apiExportCSV`, `apiExportExcel` (admin, todos las PQRSF) y `apiExportCSVArea`, `apiExportExcelArea` (área, PQRSF de la dependencia propia). Todos aceptan `ExportFilters` opcionales (estado, tipo, prioridad, fechas).
- Todos los endpoints del backend exportados como funciones nombradas: `apiLogin`, `apiCreatePQRS`, `apiListPQRS`, `apiAssignPQRS`, `apiRespondPQRS`, `apiEscalatePQRS`, `apiConsultarRadicado`, `apiGetDashboard`, `apiGetAttachments`, `apiUploadAttachment`, etc.
- `formatApiError()`: traduce errores de la API a mensajes legibles para el usuario.

### `AdminDashboard` — [src/app/pages/AdminDashboard.tsx](src/app/pages/AdminDashboard.tsx)

Panel completo para administradores con:

- Listado y filtrado de todas las PQRSF.
- Detalle con pestañas: **Responder**, **Asignar**, **Escalar**, **Historial**, **Adjuntos** (subir/descargar archivos adjuntos de la PQRS).
- Acciones: asignar dependencia/responsable, responder (CITIZEN / FINAL / INTERNAL), escalar a otra área, cambiar estado.
- Estadísticas de conteo por estado.
- **Vista Analytics** (toggle «Ver Analytics»): KPI cards, dona interactiva por estado, barras por tipo, área chart de tendencia diaria, barras horizontales por área, dona de prioridad, panel de comparativa temporal (mensual / año-vs-año / mes-vs-mes) con delta automático. Filtrado por período (7/30/90 días o todo). Métricas de SLA y perfil de solicitantes cargadas desde `apiGetDashboard`.
- **Panel de Exportación**: descarga de reportes CSV o Excel con filtros opcionales de estado, tipo, prioridad y rango de fechas mediante `apiExportCSV` / `apiExportExcel`.

### `Home` — [src/app/pages/Home.tsx](src/app/pages/Home.tsx)

Landing pública con modal de radicación inline:

- Formulario de envío de PQRSF sin necesidad de cuenta (anónimo).
- Validación reCAPTCHA (bypass automático en entorno local).
- Aceptación de términos y condiciones.
- Soporte para adjuntar archivos.
- Muestra el número de radicado generado al completarse.

### `AreaDashboard` — [src/app/pages/AreaDashboard.tsx](src/app/pages/AreaDashboard.tsx)

> _Actualizado el 2026-03-06._

Panel de gestión de PQRSF para funcionarios de dependencia/área. Permite visualizar, filtrar y responder las PQRSF asignadas a la dependencia del usuario autenticado.

- **Vista Analytics** (toggle «Ver Gráficas»): KPI cards, dona interactiva por estado, barras por tipo, área chart de tendencia diaria, dona de prioridad. Filtrado por período (7/30/90 días).
- **Panel de Exportación**: descarga de reportes CSV o Excel del área propia con filtros opcionales mediante `apiExportCSVArea` / `apiExportExcelArea`.

#### Estrategia de carga de datos

La función `cargarPQRS` utiliza `Promise.allSettled` para ejecutar dos consultas en paralelo:

1. **Consulta primaria** — PQRSF filtradas por el campo `dependency` del usuario.
2. **Consulta secundaria** — Lista global de asignaciones activas (falla silenciosamente si el endpoint no está disponible).

Las PQRSF referenciadas en asignaciones pero ausentes de la consulta primaria se recuperan de forma individual. El resultado final se **desduplicha por `id`** y se ordena de más reciente a más antigua.

#### Estados del componente

| Estado | Tipo | Descripción |
|---|---|---|
| `pqrsList` | `PqrsAPI[]` | Lista completa de PQRSF asignadas al área |
| `selected` | `PqrsAPI \| null` | PQRS actualmente abierta en el panel de detalle |
| `loading` | `boolean` | Indica si la carga/recarga está en curso |
| `submitting` | `boolean` | Indica si el formulario de respuesta está enviándose |
| `filtroEstado` | `string` | Filtro de estado activo (`"todos"` muestra todas) |

#### Funciones principales

| Función | Descripción |
|---|---|
| `cargarPQRS()` | Carga (o recarga) todas las PQRSF del área con la estrategia de 3 pasos |
| `onResponder(data)` | Registra la respuesta/nota y opcionalmente cambia el estado de la PQRS |
| `getStatusBadge(status)` | Genera una etiqueta visual coloreada según el código de estado (`RAD`, `PRO`, `RES`, `CER`) |
| `contactName(p)` | Resuelve el nombre del remitente con fallback: usuario registrado → anónimo → `"Anónimo"` |

#### Tipos de respuesta (`response_type`)

| Valor | Descripción |
|---|---|
| `CITIZEN` | Respuesta dirigida al ciudadano |
| `FINAL` | Respuesta final / cierre del caso |
| `INTERNAL` | Nota interna (no visible para el ciudadano) |

#### Layout responsivo

- **Escritorio (≥ 1024 px):** columna izquierda con la lista + columna derecha fija de 440 px para el detalle.
- **Móvil (< 1024 px):** lista y panel de detalle se alternan; al abrir detalle se bloquea el scroll del `body`.

### `Perfil` — [src/app/pages/Perfil.tsx](src/app/pages/Perfil.tsx)

Página de gestión del perfil del usuario autenticado, accesible en `/perfil`. Vinculada desde el nombre de usuario en la Navbar.

- **Pestaña «Datos personales»**: edición de nombre, apellido, nombre de usuario, teléfono, dirección y ciudad mediante `apiUpdatePerfil`.
- **Pestaña «Cambiar contraseña»**: validación de contraseña actual y nueva (con confirmación) mediante `apiChangePassword`.
- Recarga automática del perfil en `AuthContext` tras guardar.

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
# URL base de la API Django (sin barra final)
VITE_API_URL=http://localhost:8000

# Deshabilitar reCAPTCHA en desarrollo local (false en producción)
VITE_DISABLE_CAPTCHA=false

# Site key de Google reCAPTCHA v2 (requerido en producción)
VITE_RECAPTCHA_SITE_KEY=your_site_key_here
```

> En producción omitir `VITE_DISABLE_CAPTCHA` o establecerlo en `false`.

---

## Instalación y ejecución

### Requisitos previos

- Node.js ≥ 18
- npm ≥ 9
- Backend Django corriendo en `http://localhost:8000` (o la URL configurada en `VITE_API_URL`)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/DavidM3-M/App_PQRSF_ft.git
cd "Sistema PQRS Institucional"

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local   # editar con los valores correctos

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Build para producción

```bash
npm run build
```

Los archivos compilados se generan en `dist/`. Servir con cualquier servidor estático (Nginx, served, Vercel, etc.).

---

## Comunicación con el backend

El frontend espera un backend Django REST Framework con los siguientes prefijos de endpoint:

| Prefijo | Descripción |
|---|---|
| `/api/login/` | Autenticación JWT |
| `/api/token/refresh/` | Refresco de access token |
| `/api/users/` | Registro y perfil de usuarios |
| `/api/pqrs/` | CRUD y acciones sobre PQRSF |
| `/api/dependencies/` | Gestión de dependencias/áreas |
| `/api/sla/` | Configuración de SLA |

Todas las peticiones autenticadas incluyen el header `Authorization: Bearer <access_token>`. El refresco de token es transparente para el usuario.

Aplicación web para la gestión institucional de **Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones (PQRS/PQRSF)**, desarrollada con React + TypeScript + Vite. Permite a ciudadanos radicar solicitudes, a funcionarios de área gestionarlas y a administradores supervisar el sistema completo.

Diseño original disponible en [Figma](https://www.figma.com/design/1P3c6y78ae2YuhfYLwbWxm/Sistema-PQRS-Institucional).

---

## Tabla de contenidos

1. [Requisitos](#requisitos)
2. [Instalación y ejecución](#instalación-y-ejecución)
3. [Variables de entorno](#variables-de-entorno)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Arquitectura y flujo de navegación](#arquitectura-y-flujo-de-navegación)
6. [Módulos principales](#módulos-principales)
7. [Roles de usuario](#roles-de-usuario)
8. [Modo offline / Mock](#modo-offline--mock)
9. [Tecnologías](#tecnologías)
10. [Scripts disponibles](#scripts-disponibles)

---

## Requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Instalación y ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
```

---

## Variables de entorno

Cree un archivo `.env` en la raíz del proyecto con las siguientes variables:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base del backend Django REST | `http://localhost:8000` |

Si la variable no está definida, la aplicación apunta a `http://localhost:8000` automáticamente.

---

## Estructura del proyecto

```
src/
├── main.tsx                    # Punto de entrada; monta React en el DOM
└── app/
    ├── App.tsx                 # Raíz de la aplicación; provee AuthContext y el router
    ├── routes.tsx              # Definición de rutas con React Router (incluye ProtectedRoute)
    ├── context/
    │   └── AuthContext.tsx     # Estado global de autenticación (login / logout / perfil)
    ├── lib/
    │   ├── api.ts              # Servicio HTTP: tipos, helpers de token, llamadas a la API
    │   ├── mockData.ts         # Datos ficticios para modo offline
    │   └── utils.ts            # Utilidades compartidas
    ├── pages/
    │   ├── Home.tsx            # Página principal pública
    │   ├── Login.tsx           # Formulario de inicio de sesión
    │   ├── Register.tsx        # Formulario de registro de ciudadano
    │   ├── CrearPQRS.tsx       # Formulario de radicación de PQRS (anónimo o autenticado)
    │   ├── ConsultaRadicado.tsx# Consulta pública por número de radicado
    │   ├── UserDashboard.tsx   # Panel del ciudadano autenticado
    │   ├── AdminDashboard.tsx  # Panel de administrador con estadísticas y gestión
    │   ├── AreaDashboard.tsx   # Panel del funcionario de área
    │   ├── GestionAreas.tsx    # CRUD de dependencias/áreas (solo admin)
    │   └── NotFound.tsx        # Página 404
    └── components/
        ├── layout/
        │   ├── Layout.tsx      # Estructura base (navbar + outlet)
        │   ├── Navbar.tsx      # Barra de navegación ciudadana
        │   └── InstitutionalNavbar.tsx
        ├── ChatBot.tsx         # Asistente virtual PQRS
        ├── DiagonalStripes.tsx # Elemento decorativo SVG
        ├── TerminosModal.tsx   # Modal de términos y condiciones
        └── ui/                 # Componentes Radix UI / shadcn/ui
```

---

## Arquitectura y flujo de navegación

```
/                  → Home (pública)
/login             → Login
/register          → Register
/crear-pqrs        → CrearPQRS (pública o autenticada)
/consulta          → ConsultaRadicado (pública)
/dashboard         → UserDashboard       [requiere sesión]
/admin             → AdminDashboard      [requiere rol admin]
/admin/areas       → GestionAreas        [requiere rol admin]
/admin/roles       → GestionRoles        [requiere rol admin]
/admin/sla         → GestionSLA          [requiere rol admin]
/area              → AreaDashboard       [requiere rol area]
/perfil            → Perfil              [requiere sesión]
*                  → NotFound
```

El componente `ProtectedRoute` en `routes.tsx` verifica la sesión y el rol, redirigiendo al login o al dashboard según corresponda.

---

## Módulos principales

### `src/app/lib/api.ts`

Capa de servicio HTTP centralizada. Expone:

- **`tokens`** – Helpers para leer/escribir/borrar los JWT de `localStorage`.
- **`apiFetch<T>()`** – Función genérica de fetch con soporte de autenticación Bearer, reintento automático con `refresh_token` y manejo de errores HTTP.
- **`ApiError`** – Clase de error enriquecida con `status` y `data`.
- **`formatApiError()`** – Convierte errores de la API Django REST en mensajes legibles en español.
- **Funciones CRUD** – `apiLogin`, `apiRegister`, `apiGetPerfil`, `apiCreatePQRS`, `apiListPQRS`, `apiConsultarRadicado`, `apiUpdateEstado`, `apiAssignPQRS`, `apiRespondPQRS`, `apiListDependencies`, `apiGetDashboard`, etc.

### `src/app/context/AuthContext.tsx`

Contexto React que centraliza el estado de sesión:

- Restaura la sesión al montar desde `localStorage`.
- Expone `login()`, `logout()`, `refreshPerfil()` y los flags derivados `isAuthenticated`, `isAdmin` e `isArea`.
- Mapea el modelo `UsuarioAPI` (backend) al modelo `Usuario` (frontend) asignando el rol según `is_staff` y la existencia de dependencia.

### `src/app/routes.tsx`

Configuración del router con `createBrowserRouter`. Incluye el guardia `ProtectedRoute` que soporta las variantes `adminOnly` y `areaOnly`.

### `src/app/pages/GestionAreas.tsx`

CRUD de dependencias/áreas organizacionales y gestión de sus encargados. Solo accesible por administradores.

- Crear, editar, activar/desactivar y eliminar áreas.
- Modal **"Gestionar Usuarios"** — asigna el campo `dependency` del perfil del usuario (membresía organizacional, no otorga acceso a PQRSF por sí solo).
- Modal **"Encargados PQRS"** — crea registros `DependencyManager` via `POST /api/pqrs/dependencies/{depId}/managers/`. Esta es la única acción que concede al usuario visibilidad sobre las PQRSF del área en el backend. Al asignar también actualiza `user.dependency` para que el frontend detecte el rol `"area"` correctamente. Al desactivar un encargado, revoca `user.dependency` si ya no tiene managers activos.

### `src/app/pages/Home.tsx`

Landing pública con modal de radicación inline:

- Formulario de envío de PQRSF sin necesidad de cuenta (anónimo).
- Validación reCAPTCHA (bypass automático en entorno local).
- Aceptación de términos y condiciones.
- Soporte para adjuntar archivos.
- **Modal de radicado exitoso** (2026-03-05): al completar la radicación se muestra un `Dialog` independiente con el número de radicado en formato grande, botón de **copiar al portapapeles** con feedback visual, y opciones para consultar el estado, radicar otra PQRS o cerrar. El modal del formulario se cierra automáticamente al abrirse el de éxito para evitar conflictos de z-index.

### `src/app/pages/CrearPQRS.tsx`

Formulario completo de radicación para usuarios autenticados o anónimos:

- Campos de tipo, prioridad, asunto y descripción.
- Campos de contacto opcionales para usuarios anónimos (nombre, apellido, tipo/número de documento, email, teléfono, ciudad).
- **Modal de radicado exitoso** (2026-03-05): igual que en `Home.tsx`, reemplaza la vista de pantalla completa anterior. Muestra el número de radicado con botón de copia y mantiene el formulario en el fondo.

### `index.html`

- `lang="es"`, `translate="no"` y `<meta name="google" content="notranslate">` agregados (2026-03-05) para prevenir el error `removeChild` causado por extensiones de traducción automática (Google Translate) que modifican el DOM fuera del ciclo de React.

---

## Cambios recientes

### 2026-03-06 — Seguridad, Analytics, Exportación y página de Perfil

#### Seguridad

- **`index.html`**: cabeceras HTTP de seguridad vía meta tags (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`).
- **`vite.config.ts`**: esas mismas cabeceras replicadas en el servidor de desarrollo.
- **`api.ts`**: `access_token` movido a `sessionStorage` para reducir la superficie de ataque XSS (no persiste entre pestañas ni sesiones de navegador).
- **`AuthContext.tsx`**: el backend es la única fuente de verdad para roles; eliminada la fusión de privilegios desde `localStorage`. Se escucha el evento `auth:session-expired` para redirección SPA-segura.
- **`Login.tsx`**: bloqueo temporal de 30 s tras 5 intentos fallidos consecutivos. Soporte de parámetro `?redirect=` para redirigir al destino original post-login.
- **`mockData.ts`**: contraseñas ficticias eliminadas de los mocks; lecturas de `localStorage` envueltas en `try/catch` con limpieza automática ante datos corruptos.
- **`.env.example`**: `VITE_DISABLE_CAPTCHA` cambiado a `false` con nota de advertencia para producción.

#### Nuevas funcionalidades

- **Vista Analytics en `AdminDashboard`**: toggle «Ver Analytics» activa un panel con KPI cards, dona de estados (interactiva con hover), barras por tipo, gráfica de área de tendencia diaria, barras horizontales por área, dona de prioridad, comparativa temporal (mensual / año-vs-año / mes-vs-mes) con cálculo de delta automático, y métricas SLA/solicitantes desde `apiGetDashboard`.
- **Vista Analytics en `AreaDashboard`**: toggle «Ver Gráficas» con KPI cards y mismas gráficas (estado, tipo, prioridad, tendencia) filtradas por período.
- **Exportación de reportes**: panel «Exportar» en `AdminDashboard` (CSV/Excel global) y `AreaDashboard` (CSV/Excel de área) con filtros por estado, tipo, prioridad y rango de fechas. Usa `apiExportCSV`, `apiExportExcel`, `apiExportCSVArea`, `apiExportExcelArea`.
- **Pestaña Adjuntos** en `AdminDashboard`: visualización, subida y descarga de adjuntos por PQRS mediante `apiGetAttachments` y `apiUploadAttachment`.
- **Página `/perfil`** (`Perfil.tsx`): edición de datos personales y cambio de contraseña para usuarios autenticados. Vinculada desde la Navbar.
- **Verificación por email en `ConsultaRadicado`**: cuando el backend indica que la PQRS requiere correo, se muestra un formulario de verificación de identidad o la opción de iniciar sesión con redirección de vuelta.
- **Animaciones CSS**: clases `animate-fade-slide-up` y `animate-slide-down-fade` en `theme.css` para transiciones de paneles.

---

### 2026-03-06 — Corrección crítica: encargado de área no veía PQRSF

#### Diagnóstico del bug

El flujo de asignación de encargados de área involucra dos operaciones independientes en el backend:

| Operación | Endpoint | Efecto |
|---|---|---|
| Crear `DependencyManager` | `POST /api/pqrs/dependencies/{depId}/managers/` | Concede acceso a PQRSF en el backend (`_get_managed_dep_ids`) |
| Actualizar perfil del usuario | `PATCH /api/users/{id}/` `{ dependency }` | Permite al frontend detectar el rol `"area"` y conocer el `dependencyId` |

La UI anterior solo ejecutaba la primera operación al usar el botón **"Encargados"**, dejando el perfil del usuario con `dependency: null`. Al iniciar sesión, `mapApiUser` veía `hasDep = false` → asignaba `rol = "usuario"` → `DashboardGuard` redirigía a `UserDashboard` → el encargado nunca llegaba a `AreaDashboard`.

Además, aunque llegara, `cargarPQRS` en `AreaDashboard` filtraba por `usuario.dependencyId`, que también quedaba vacío.

#### Correcciones en `GestionAreas.tsx`

**`handleAssignEncargado`** — ahora ejecuta ambas operaciones en secuencia:

```typescript
await apiAssignManager(encargadosAreaId, userId);          // DependencyManager → acceso backend
await apiUpdateUser(userId, { dependency: encargadosAreaId }); // perfil → rol "area" en frontend
```

**`handleRemoveEncargado`** — al desactivar un manager, si el usuario ya no tiene managers activos en el área, limpia su `dependency`:

```typescript
await apiRemoveManager(encargadosAreaId, managerId);
if (remaining.length === 0) {
  await apiUpdateUser(targetUserId, { dependency: null });
}
```

#### Mejoras de UX en `GestionAreas.tsx`

- El botón **"Encargados"** fue renombrado a **"Encargados PQRS"** con icono `ShieldCheck` y estilo primario azul para diferenciarlo claramente del botón "Usuarios".
- El modal **"Gestionar Usuarios"** muestra un banner informativo advirtiendo que asignar un usuario al área solo establece membresía organizacional y **no** otorga acceso a PQRSF.
- El modal **"Encargados PQRS"** muestra un banner explicando que esta es la acción que concede visibilidad real sobre PQRSF (ver, responder, cambiar estado).
- La sección "Asignar nuevo encargado" incluye descripción contextual indicando el área sobre la que tendrá acceso el usuario.

#### Flujo correcto post-corrección

```
Admin → botón "Encargados PQRS" → "Asignar"
  ↓ crea DependencyManager  (backend filtra PQRSF por _get_managed_dep_ids)
  ↓ actualiza user.dependency (frontend detecta rol "area" en AuthContext)
  ↓
Encargado inicia sesión
  ↓ apiGetPerfil() → dependency != null → rol = "area"
  ↓ DashboardGuard → /area → AreaDashboard
  ↓ cargarPQRS() filtra por dependencyId → lista PQRSF del área ✅
```

---

## Roles de usuario

| Rol | Condición de asignación | Acceso |
|---|---|---|
| `usuario` | Sin `dependency` y sin `is_staff` | Radicación, consulta y dashboard personal |
| `area` | Tiene `dependency` asignada en el perfil y no es staff | Dashboard de área, gestión de PQRSF del área |
| `admin` | `is_staff === true` o tiene rol `ADMIN` | Todas las rutas anteriores + AdminDashboard, GestionAreas, GestionRoles, GestionSLA |

> **Nota:** El rol `"area"` requiere que el administrador use el botón **"Encargados PQRS"** en Gestión de Áreas. Este botón crea el `DependencyManager` (acceso backend) y actualiza el campo `dependency` del perfil (detección de rol en el frontend). Usar solo el botón "Usuarios" asigna membresía organizacional pero **no** activa el rol `"area"`.

---

## Modo offline / Mock

Cuando el backend **no está disponible** (error de red `TypeError`), la aplicación activa automáticamente un modo de datos locales:

- **Login/Registro**: valida contra usuarios precargados en `SEED_USERS` y datos guardados en `localStorage`.
- **Perfil**: devuelve el perfil almacenado en `mock_profile`.
- El token `mock_access_offline` identifica la sesión como offline y evita intentos de refresco al backend.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework UI | React 19 + TypeScript |
| Bundler | Vite |
| Estilos | Tailwind CSS v4 |
| Componentes | Radix UI / shadcn/ui |
| Iconos | Lucide React, MUI Icons |
| Router | React Router v7 |
| Animaciones | Motion (Framer Motion) |
| Formularios | React Hook Form + Zod |
| Backend esperado | Django REST Framework |

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo (Vite HMR) |
| `npm run build` | Verifica tipos TypeScript y compila para producción en `dist/` |
| `npm run typecheck` | Verificación de tipos TypeScript sin emitir archivos |
