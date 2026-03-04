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
| `*` | `NotFound` | Público |

---

## Módulos principales

### `AuthContext` — [src/app/context/AuthContext.tsx](src/app/context/AuthContext.tsx)

Gestiona el ciclo de vida de la sesión:

- Almacena `access_token` y `refresh_token` en `localStorage`.
- Al iniciar, verifica el token y carga el perfil desde el backend.
- Expone `usuario`, `isAuthenticated`, `loading`, `login()` y `logout()`.
- El modelo `Usuario` normaliza la respuesta del backend e incluye el rol derivado.

### `api.ts` — [src/app/lib/api.ts](src/app/lib/api.ts)

Capa HTTP centralizada:

- `apiFetch<T>()`: wrapper con adjunto de JWT, refresco automático en 401 y manejo de errores tipados (`ApiError`).
- Todos los endpoints del backend están exportados como funciones nombradas: `apiLogin`, `apiCreatePQRS`, `apiListPQRS`, `apiAssignPQRS`, `apiRespondPQRS`, `apiEscalatePQRS`, `apiConsultarRadicado`, etc.
- `formatApiError()`: traduce errores de la API a mensajes legibles para el usuario.

### `AdminDashboard` — [src/app/pages/AdminDashboard.tsx](src/app/pages/AdminDashboard.tsx)

Panel completo para administradores con:

- Listado y filtrado de todas las PQRSF.
- Detalle con pestañas: **Responder**, **Asignar**, **Escalar**, **Historial**.
- Acciones: asignar dependencia/responsable, responder (CITIZEN / FINAL / INTERNAL), escalar a otra área, cambiar estado.
- Estadísticas de conteo por estado.

### `Home` — [src/app/pages/Home.tsx](src/app/pages/Home.tsx)

Landing pública con modal de radicación inline:

- Formulario de envío de PQRSF sin necesidad de cuenta (anónimo).
- Validación reCAPTCHA (bypass automático en entorno local).
- Aceptación de términos y condiciones.
- Soporte para adjuntar archivos.
- Muestra el número de radicado generado al completarse.

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
# URL base de la API Django (sin barra final)
VITE_API_URL=http://localhost:8000

# Deshabilitar reCAPTCHA en desarrollo local
VITE_DISABLE_CAPTCHA=true

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
/registro          → Register
/crear-pqrs        → CrearPQRS (pública o autenticada)
/consulta          → ConsultaRadicado (pública)
/dashboard         → UserDashboard       [requiere sesión]
/admin             → AdminDashboard      [requiere rol admin]
/gestion-areas     → GestionAreas        [requiere rol admin]
/area-dashboard    → AreaDashboard       [requiere rol area]
*                  → NotFound
```

El componente `ProtectedRoute` en `routes.tsx` valida la sesión leyendo `localStorage` y redirige según el rol del usuario.

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

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `usuario` | Radicación, consulta y dashboard personal |
| `area` | Dashboard de área, gestión de PQRS asignadas |
| `admin` | Todas las rutas anteriores + AdminDashboard y GestionAreas |

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
| `npm run build` | Compila para producción en `dist/` |
