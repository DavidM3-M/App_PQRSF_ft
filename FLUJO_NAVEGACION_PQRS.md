# 📋 Flujo de Navegación - Sistema PQRS

## 🎯 Estructura General del Sistema

### Roles de Usuario
1. **Anónimo** - Sin autenticación
2. **Usuario Registrado** - Rol: `usuario`
3. **Usuario de Área** - Rol: `area`
4. **Administrador** - Rol: `admin`

---

## 🌐 Pantallas Públicas (Sin Autenticación)

### 1. HOME (`/`)
**Página de inicio pública**
- **Elementos:**
  - Hero section con información del sistema
  - Botón principal "Crear PQRS"
  - Estadísticas generales del sistema
  - Llamados a la acción
- **Navegación:**
  - → `/crear-pqrs` (Crear nueva PQRS)
  - → `/consulta` (Consultar radicado)
  - → `/login` (Iniciar sesión)
  - → `/registro` (Registrarse)

### 2. CREAR PQRS (`/crear-pqrs`)
**Formulario de creación de PQRS**
- **Elementos:**
  - Formulario con validaciones
  - Tipos: Petición, Queja, Reclamo, Sugerencia
  - Campos: asunto, descripción, nombre, email, teléfono
  - Generación automática de radicado
- **Flujo:**
  - Completar formulario → Validación → Envío
  - Muestra radicado generado
  - Notificación de éxito
- **Navegación:**
  - → `/` (Volver al inicio)
  - → `/consulta` (Consultar el radicado creado)

### 3. CONSULTA RADICADO (`/consulta`)
**Búsqueda de PQRS por número de radicado**
- **Elementos:**
  - Campo de búsqueda de radicado
  - Panel de detalles de PQRS encontrada
  - Visualización de estado y respuestas
- **Acceso:** Público (cualquier persona con radicado)
- **Navegación:**
  - → `/` (Volver al inicio)

### 4. LOGIN (`/login`)
**Inicio de sesión**
- **Elementos:**
  - Formulario de email/password
  - Validaciones
  - Usuarios de prueba mostrados
- **Usuarios de Prueba:**
  - Admin: admin@pqrs.com / admin123
  - Usuario: juan@correo.com / usuario123
  - Área: maria.area@pqrs.com / area123
- **Flujo según rol:**
  - Admin → `/admin`
  - Área → `/area`
  - Usuario → `/dashboard`
- **Navegación:**
  - → `/registro` (Crear cuenta)

### 5. REGISTRO (`/registro`)
**Crear nueva cuenta**
- **Elementos:**
  - Formulario: nombre, email, password, confirmar password
  - Validaciones completas
- **Flujo:**
  - Registro exitoso → Auto-login → `/dashboard`
- **Navegación:**
  - → `/login` (Ya tengo cuenta)

---

## 👤 Área de USUARIO REGISTRADO

### 6. DASHBOARD USUARIO (`/dashboard`)
**Panel personal del usuario**
- **Protección:** Requiere autenticación
- **Elementos:**
  - Estadísticas personales (total, pendientes, resueltas)
  - Lista de PQRS propias
  - Botón "Crear Nueva PQRS"
  - Filtros por estado
  - Panel de detalles de PQRS seleccionada
- **Funcionalidades:**
  - Ver solo sus PQRS
  - Consultar estado y respuestas
  - Crear nuevas PQRS (redirige a `/crear-pqrs`)
- **Navegación:**
  - → `/crear-pqrs` (Nueva PQRS)
  - → Navbar (Consultar, Logout)

---

## 🏢 Área de USUARIO DE ÁREA

### 7. DASHBOARD ÁREA (`/area`)
**Panel de gestión de área**
- **Protección:** Requiere rol `area`
- **Elementos:**
  - Información del área asignada
  - Estadísticas del área (total, pendientes, en proceso, resueltas)
  - Lista de PQRS asignadas al área
  - Panel de respuesta y gestión
  - Filtros por estado
- **Funcionalidades:**
  - Ver PQRS asignadas a su área
  - Responder PQRS
  - Cambiar estado (pendiente → en proceso → resuelto → cerrado)
  - Agregar respuestas oficiales
- **Navegación:**
  - → Navbar (Logout)

---

## 👨‍💼 Área de ADMINISTRADOR

### 8. DASHBOARD ADMIN (`/admin`)
**Panel de administración general**
- **Protección:** Requiere rol `admin`
- **Elementos:**
  - Estadísticas globales (todas las PQRS)
  - Botón "Gestionar Áreas"
  - Lista completa de PQRS del sistema
  - Panel de detalles y gestión
  - Múltiples filtros (estado, tipo, área)
  - Búsqueda por radicado/asunto/nombre
- **Funcionalidades:**
  - Ver todas las PQRS del sistema
  - Asignar PQRS a áreas
  - Desasignar PQRS de áreas
  - Responder PQRS
  - Cambiar estados
  - Filtrar por área (incluye "sin asignar")
- **Navegación:**
  - → `/gestion-areas` (Gestionar áreas)
  - → Navbar (Logout)

### 9. GESTIÓN DE ÁREAS (`/gestion-areas`)
**Administración de áreas del sistema**
- **Protección:** Requiere rol `admin`
- **Elementos:**
  - Botón "Nueva Área"
  - Grid de tarjetas de áreas
  - Formulario de creación/edición
  - Modal de asignación de usuarios
- **Funcionalidades:**
  - **CRUD de Áreas:**
    - Crear nueva área (nombre, descripción, color)
    - Editar área existente
    - Activar/Desactivar área
    - Eliminar área
  - **Gestión de Usuarios:**
    - Ver usuarios asignados por área
    - Asignar usuarios a áreas
    - Desasignar usuarios de áreas
    - Modal con lista completa de usuarios
- **Navegación:**
  - → `/admin` (Volver al panel)

---

## 🔒 Protección de Rutas

### Rutas Públicas
- `/` - Home
- `/login` - Login
- `/registro` - Registro
- `/crear-pqrs` - Crear PQRS
- `/consulta` - Consultar radicado

### Rutas Protegidas (Requieren Autenticación)
- `/dashboard` - Usuario registrado
- `/area` - Solo usuario con rol `area`
- `/admin` - Solo usuario con rol `admin`
- `/gestion-areas` - Solo usuario con rol `admin`

### Redirecciones Automáticas
- Usuario no autenticado en ruta protegida → `/login`
- Usuario sin permisos admin en `/admin` → `/dashboard`
- Usuario sin permisos área en `/area` → `/dashboard`
- Login exitoso según rol:
  - Admin → `/admin`
  - Área → `/area`
  - Usuario → `/dashboard`

---

## 🧭 Navbar (Navegación Global)

### Para Usuarios No Autenticados
- Logo → `/` (Home)
- "Consultar Radicado" → `/consulta`
- "Iniciar Sesión" → `/login`
- "Registrarse" → `/registro`

### Para Usuarios Autenticados
- Logo → `/` (Home)
- "Consultar Radicado" → `/consulta`
- Botón dinámico según rol:
  - Admin: "Panel Admin" → `/admin`
  - Área: "Mi Área" → `/area`
  - Usuario: "Mi Panel" → `/dashboard`
- Nombre del usuario (badge)
- Botón "Logout" → Cierra sesión y redirige a `/`

---

## 💬 Componentes Globales

### Chatbot Flotante
**Posición:** Esquina inferior izquierda (todas las páginas)
- **Elementos:**
  - Botón principal con animación
  - Menú en abanico (4 opciones):
    1. 📋 Información
    2. 📄 Documentos
    3. 📢 Comunicados
    4. 💬 Atención al Cliente
- **Funcionalidades:**
  - Chat interactivo por sección
  - Respuestas automáticas predefinidas
  - Completamente responsivo
  - Animaciones con Motion

### Notificaciones (Sonner)
- Toast de éxito
- Toast de error
- Toast de información
- Posición: Top-right

---

## 📊 Flujos de Trabajo Principales

### Flujo 1: Usuario Anónimo Crea PQRS
1. Home (`/`)
2. Click "Crear PQRS" → `/crear-pqrs`
3. Completa formulario
4. Submit → Genera radicado
5. Ve radicado en pantalla
6. Puede consultar en `/consulta`

### Flujo 2: Usuario Registrado Gestiona sus PQRS
1. Login → `/dashboard`
2. Ve sus PQRS
3. Click en PQRS → Ve detalles
4. Consulta estado y respuestas
5. Puede crear nueva → `/crear-pqrs`

### Flujo 3: Usuario de Área Resuelve PQRS
1. Login → `/area`
2. Ve PQRS asignadas a su área
3. Selecciona PQRS
4. Escribe respuesta
5. Cambia estado
6. Guarda

### Flujo 4: Admin Asigna PQRS a Área
1. Login → `/admin`
2. Ve todas las PQRS
3. Filtra "Sin asignar"
4. Selecciona PQRS
5. Asigna a área desde dropdown
6. PQRS queda asignada (cambia a "en proceso")

### Flujo 5: Admin Gestiona Áreas
1. `/admin`
2. Click "Gestionar Áreas" → `/gestion-areas`
3. **Crear área:**
   - Click "Nueva Área"
   - Completa formulario
   - Guarda
4. **Asignar usuarios:**
   - Click "Usuarios" en tarjeta de área
   - Modal con usuarios
   - Asigna/Desasigna usuarios
5. Vuelve a `/admin`

---

## 🎨 Jerarquía Visual Recomendada para Figma

### Nivel 1: Pantallas Públicas
```
HOME
├── CREAR PQRS
├── CONSULTA RADICADO
├── LOGIN
└── REGISTRO
```

### Nivel 2: Dashboards por Rol
```
USUARIO REGISTRADO
└── DASHBOARD USUARIO
    └── Crear PQRS (reutiliza pantalla pública)

USUARIO DE ÁREA
└── DASHBOARD ÁREA
    └── Panel de respuesta

ADMINISTRADOR
├── DASHBOARD ADMIN
│   └── Panel de asignación
└── GESTIÓN DE ÁREAS
    ├── Form crear/editar área
    └── Modal asignar usuarios
```

### Nivel 3: Componentes Compartidos
```
COMPONENTES GLOBALES
├── Navbar (2 versiones: autenticado/no autenticado)
├── Chatbot Flotante
├── Toast Notifications
└── Footer
```

---

## 📐 Diagrama de Flujo Sugerido para Figma

### Estructura Recomendada:

**Página 1: Flujo Público**
- Coloca HOME en el centro
- Conecta con flechas a: Crear PQRS, Consulta, Login, Registro
- Muestra el flujo de crear PQRS completo

**Página 2: Flujo Usuario Registrado**
- Login → Dashboard Usuario
- Conexiones con funcionalidades

**Página 3: Flujo Usuario de Área**
- Login → Dashboard Área
- Panel de gestión de PQRS

**Página 4: Flujo Administrador**
- Login → Dashboard Admin
- Ramificación a Gestión de Áreas
- Flujos de asignación

**Página 5: Componentes y Estados**
- Estados de PQRS (Pendiente, En Proceso, Resuelto, Cerrado)
- Tipos de PQRS (Petición, Queja, Reclamo, Sugerencia)
- Componentes UI reutilizables

---

## 🎯 Elementos Clave para Modelar en Figma

### Para Cada Pantalla Incluye:
1. **Nombre de ruta** (ej: `/admin`)
2. **Nivel de protección** (Público/Protegido)
3. **Rol requerido** (Ninguno/Usuario/Área/Admin)
4. **Componentes principales**
5. **Acciones disponibles**
6. **Navegaciones posibles** (flechas)

### Colores Sugeridos para Conexiones:
- 🔵 Azul: Navegación pública
- 🟢 Verde: Flujo de usuario registrado
- 🟣 Morado: Flujo de área
- 🔴 Rojo: Flujo de administrador
- ⚫ Negro: Componentes globales

### Íconos por Rol:
- 👤 Usuario anónimo
- 👨‍💼 Usuario registrado
- 🏢 Usuario de área
- 👨‍💻 Administrador

---

## 📝 Datos de Referencia

### Estados de PQRS:
- 🟡 Pendiente
- 🔵 En Proceso
- 🟢 Resuelto
- ⚪ Cerrado

### Tipos de PQRS:
- 📋 Petición
- 😠 Queja
- ⚠️ Reclamo
- 💡 Sugerencia

### Áreas Predefinidas:
- 🔵 Atención al Ciudadano (bg-blue-500)
- 🟣 Recursos Humanos (bg-purple-500)
- 🟢 Servicios Técnicos (bg-green-500)
- 🟠 Calidad (bg-orange-500)

---

## 🚀 Recomendaciones para el Diagrama en Figma

1. **Usa frames separados** por nivel de acceso
2. **Conectores con flechas** para mostrar navegación
3. **Colores consistentes** según rol
4. **Anotaciones** para explicar lógica de negocio
5. **Mockups de pantallas** en miniatura
6. **Leyenda** explicando símbolos y colores
7. **Flujos de decisión** para rutas protegidas
8. **Estados de formularios** (vacío, con error, exitoso)

Este documento te servirá como base completa para crear un diagrama de flujo profesional en Figma que documente todo el sistema PQRS.
