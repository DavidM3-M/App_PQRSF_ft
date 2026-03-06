/// <reference types="vite/client" />
// ─────────────────────────────────────────────
//  API Service – Sistema PQRSF Institucional
//  Capa de comunicación HTTP con el backend Django REST.
//  Todas las llamadas a la API deben pasar por este módulo.
//  Base: http://localhost:8000 (configurable vía VITE_API_URL)
// ─────────────────────────────────────────────

/**
 * URL base del backend. Se lee de la variable de entorno VITE_API_URL.
 * Si la variable no está definida (entorno local sin .env), se usa http://localhost:8000.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── Token helpers ─────────────────────────────
/**
 * Objeto de utilidad para gestionar los JWT almacenados en localStorage.
 *
 * - `getAccess()`  → lee el access token (caduca en minutos).
 * - `getRefresh()` → lee el refresh token (caduca en días).
 * - `set()`        → persiste ambos tokens tras un login o refresco exitoso.
 * - `clear()`      → elimina tokens y datos de sesión; se llama en logout o 401 irrecuperable.
 */
export const tokens = {
  /** Devuelve el access token actual o null si no existe. */
  getAccess: () => localStorage.getItem("access_token"),
  /** Devuelve el refresh token actual o null si no existe. */
  getRefresh: () => localStorage.getItem("refresh_token"),
  /** Guarda access y refresh tokens en localStorage. */
  set: (access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  /** Elimina tokens y el objeto usuario de localStorage (cierre de sesión). */
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("usuario");
  },
};

// ── Core fetch wrapper ────────────────────────
/**
 * Función genérica de fetch centralizada para toda la aplicación.
 *
 * Flujo:
 *  1. Construye las cabeceras (Content-Type + Authorization Bearer si es autenticada).
 *  2. Ejecuta la petición HTTP.
 *  3. Si recibe 401 y la ruta es autenticada, intenta refrescar el token una sola vez.
 *     - Si el refresco es exitoso, reintenta la petición original con el nuevo token.
 *     - Si no, limpia la sesión y redirige al login.
 *  4. Para cualquier otro error HTTP, lanza un `ApiError` con status y datos del error.
 *  5. Las respuestas 204 (No Content) devuelven `undefined`.
 *
 * @template T - Tipo esperado de la respuesta JSON.
 * @param path - Ruta relativa al API_BASE (ej. "/api/pqrs/").
 * @param options - Opciones nativas de RequestInit (method, body, etc.).
 * @param authenticated - Si es true, adjunta el Bearer token en la cabecera.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  // Cabeceras base; se fusionan con las opciones adicionales del llamador
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Adjuntar JWT si la ruta requiere autenticación y el token existe
  if (authenticated) {
    const token = tokens.getAccess();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // 401 → intentar refrescar el token una sola vez antes de desloguear
  if (res.status === 401 && authenticated) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Reintento con el nuevo access token
      headers["Authorization"] = `Bearer ${tokens.getAccess()}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}));
        throw new ApiError(retry.status, err);
      }
      return retry.json() as Promise<T>;
    }
    // Refresco fallido → limpiar sesión y redirigir al login
    tokens.clear();
    window.location.href = "/login";
    throw new ApiError(401, { detail: "Su sesión ha expirado. Por favor inicie sesión de nuevo." });
  }

  // Cualquier otro error HTTP → lanzar ApiError con los datos del body
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err);
  }

  // 204 No Content no tiene cuerpo JSON
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

/**
 * Intenta renovar el access token usando el refresh token almacenado.
 *
 * - Si no hay refresh token, retorna false.
 * - Actualiza los tokens en localStorage si el refresco es exitoso.
 *
 * @returns `true` si el refresco fue exitoso, `false` en caso contrario.
 */
async function tryRefresh(): Promise<boolean> {
  const refresh = tokens.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/login/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    // Si el backend devuelve un nuevo refresh token se reemplaza; si no, se reutiliza el anterior
    tokens.set(data.access, data.refresh ?? refresh);
    return true;
  } catch {
    // Error de red: no se puede refrescar
    return false;
  }
}

// ── HTTP status → mensaje amigable ────────────
const HTTP_MESSAGES: Record<number, string> = {
  400: "Los datos enviados no son válidos. Revise el formulario.",
  401: "Credenciales incorrectas o sesión expirada.",
  403: "No tiene permiso para realizar esta acción.",
  404: "El recurso solicitado no fue encontrado.",
  405: "Operación no permitida.",
  408: "La solicitud tardó demasiado. Intente de nuevo.",
  409: "Conflicto: ya existe un registro con estos datos.",
  422: "Los datos enviados no son válidos.",
  429: "Demasiadas solicitudes. Espere un momento e intente de nuevo.",
  500: "Error interno del servidor. Intente más tarde.",
  502: "El servidor no está disponible en este momento.",
  503: "Servicio temporalmente no disponible.",
  504: "El servidor tardó demasiado en responder.",
};

// ── Nombres amigables para campos DRF ─────────
const FIELD_LABELS: Record<string, string> = {
  email:              "Correo electrónico",
  username:           "Nombre de usuario",
  password:           "Contraseña",
  password2:          "Confirmación de contraseña",
  nombre:             "Nombre",
  apellido:           "Apellido",
  tipo_documento:     "Tipo de documento",
  cedula:             "Número de documento",
  telefono:           "Teléfono",
  direccion:          "Dirección",
  ciudad:             "Ciudad",
  subject:            "Asunto",
  description:        "Descripción",
  pqrs_type:          "Tipo de PQRS",
  name:               "Nombre",
  code:               "Código",
  response_text:      "Respuesta",
  password_actual:    "Contraseña actual",
  password_nuevo:     "Nueva contraseña",
  password_nuevo2:    "Confirmación de nueva contraseña",
  reason:             "Motivo de escalación",
  notes:              "Notas",
  to_dependency:      "Área destino",
  to_user:            "Usuario destino",
};

/**
 * Error personalizado que extiende Error con información del backend.
 *
 * @property status - Código HTTP de la respuesta (ej. 400, 401, 422).
 * @property data   - Objeto JSON de error devuelto por el backend (campos de validación, detail, etc.).
 *
 * El mensaje principal se establece desde:
 *  1. `data.detail` (mensaje específico del backend)
 *  2. HTTP_MESSAGES según el código de estado
 *  3. Mensaje genérico con el código
 */
export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, data: Record<string, unknown>) {
    const detail = (data as { detail?: string })?.detail;
    const message = detail || HTTP_MESSAGES[status] || `Error inesperado (código ${status})`;
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Convierte cualquier error de la API en un string legible en español para mostrar al usuario.
 *
 * Casos manejados:
 *  1. `TypeError`  → error de red (backend caído o sin conexión).
 *  2. `ApiError` sin campos → usa HTTP_MESSAGES o el mensaje del error.
 *  3. `ApiError` con campos de validación DRF → itera sobre cada campo,
 *     traduce la clave al nombre visible usando FIELD_LABELS y une los mensajes.
 *  4. Cualquier otro error → mensaje genérico.
 *
 * @param err - Error capturado en un bloque catch.
 * @returns Mensaje de error listo para mostrar al usuario.
 */
export function formatApiError(err: unknown): string {
  // Error de red (backend no disponible o sin internet)
  if (err instanceof TypeError) {
    return "No se pudo conectar con el servidor. Verifique su conexión a internet o intente más tarde.";
  }

  if (err instanceof ApiError) {
    const { data, status } = err;

    // Respuesta sin campos de validación (sólo detail u objeto vacío)
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return HTTP_MESSAGES[status] ?? err.message;
    }

    const msgs: string[] = [];

    // Recorrer cada campo con error devuelto por DRF
    for (const [key, val] of Object.entries(data)) {
      // Normalizar el valor a array de strings
      const values: string[] = Array.isArray(val)
        ? val.map(String)
        : typeof val === "object" && val !== null
          ? Object.values(val).flat().map(String)
          : [String(val)];

      if (key === "detail" || key === "non_field_errors") {
        // Errores generales (no asociados a un campo específico)
        msgs.push(...values);
      } else {
        // Error de campo: mostrar el nombre amigable del campo
        const label = FIELD_LABELS[key] ?? key;
        msgs.push(`${label}: ${values.join(", ")}`);
      }
    }

    return msgs.join("\n") || err.message;
  }

  return "Ocurrió un error inesperado. Intente de nuevo.";
}

// ────────────────────────────────────────────
//  TYPES – aligned with backend models
// ────────────────────────────────────────────

export type PqrsStatus = "RAD" | "PRO" | "RES" | "CER";
export type PqrsType = "P" | "Q" | "R" | "S" | "F";
export type PqrsPriority = "LOW" | "MED" | "HIGH";
export type DocumentType = "CC" | "CE" | "TI" | "PA" | "NIT" | "PPT" | "RC";

export interface Dependency {
  id: string;
  name: string;
  code: string;
  email: string;
  description: string;
  active: boolean;
}

export interface UsuarioAPI {
  id: string;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  tipo_documento: DocumentType;
  cedula: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  /**
   * El backend puede devolver el objeto Dependency completo o sólo el UUID.
   * Usar `resolveDepId` / `resolveDepName` para normalizar.
   */
  dependency: Dependency | string | null;
  is_staff: boolean;
  activo: boolean;
  /** Códigos de roles asignados al usuario (ej. ["ADMIN", "GESTOR"]). */
  roles?: string[];
}

/**
 * Extrae el UUID de una dependencia independientemente de si el backend
 * devolvió el objeto completo o sólo el UUID como string.
 */
export function resolveDepId(dep: Dependency | string | null | undefined): string | undefined {
  if (!dep) return undefined;
  if (typeof dep === "string") return dep;
  return dep.id;
}

/**
 * Extrae el nombre de una dependencia. Devuelve undefined si solo hay UUID.
 */
export function resolveDepName(dep: Dependency | string | null | undefined): string | undefined {
  if (!dep || typeof dep === "string") return undefined;
  return dep.name;
}

export interface PqrsAPI {
  id: string;
  /** Número de radicado generado por el backend. */
  numero_radicado: string;
  /** Alias de compatibilidad — el backend devuelve `numero_radicado`. */
  radicado?: string;
  /** Código de tipo: P, Q, R, S, F (el backend usa `type`). */
  type: PqrsType;
  /** Alias de compatibilidad — el backend devuelve `type`. */
  pqrs_type?: PqrsType;
  /** Representación legible del tipo (del backend o resoluble por PQRS_TYPE_LABEL). */
  type_display?: string;
  /** Representación legible del estado (del backend o resoluble por PQRS_STATUS_LABEL). */
  status_display?: string;
  subject: string;
  description: string;
  status: PqrsStatus;
  priority: PqrsPriority;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  user: UsuarioAPI | null;
  anonymous_submitter: {
    nombre: string;
    email: string;
    telefono?: string;
  } | null;
  dependency: Dependency | null;
  sla_policy: { id: string; name: string } | null;
}

export interface PqrsResponseAPI {
  id: string;
  pqrs: string;
  /** Contenido de la respuesta (campo `content` en el backend). */
  content: string;
  response_type: "INTERNAL" | "CITIZEN" | "FINAL";
  /** Si esta respuesta cerró la PQRS como resuelta. */
  is_final: boolean;
  created_at: string;
  /**
   * Usuario que registró la respuesta.
   * El backend puede devolver el objeto completo (`UsuarioAPI`) o sólo el UUID.
   * También puede aparecer bajo el alias `user` o `created_by`.
   */
  responded_by: UsuarioAPI | string | null;
  /** Alias alternativo que algunos serializers usan en lugar de `responded_by`. */
  user?: UsuarioAPI | string | null;
  /** Alias alternativo que algunos serializers usan en lugar de `responded_by`. */
  created_by?: UsuarioAPI | string | null;
}

export interface AssignmentAPI {
  id: string;
  /** UUID de la PQRS asignada. */
  pqrs: string;
  /**
   * El backend puede devolver el UUID del responsable (flat) o el objeto completo.
   * Normalizar con `typeof val === 'string'` en los componentes.
   */
  responsible_user: UsuarioAPI | string | null;
  /**
   * El backend puede devolver el UUID de la dependencia (flat) o el objeto completo.
   * Normalizar con `typeof val === 'string'` en los componentes.
   */
  dependency: Dependency | string | null;
  /** Usuario que realizó la asignación (inferido automáticamente desde el JWT). */
  assigned_by_user: UsuarioAPI | string;
  is_active: boolean;
  created_at: string;
  notes: string;
}

export interface DashboardAPI {
  resumen: Record<string, unknown>;
  sla: Record<string, unknown>;
  areas: Record<string, unknown>;
  flujo: Record<string, unknown>;
  tendencia: Record<string, unknown>;
  retroalimentacion: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
}

export interface UserRole {
  id: string;
  user: string;
  /**
   * El backend puede devolver el objeto Role completo (nested)
   * o simplemente el UUID del rol como string.
   * Usar `resolveUserRole()` en los componentes para normalizar.
   */
  role: Role | string;
  assigned_at: string;
}

export interface DependencyManager {
  id: string;
  dependency: string | Dependency;
  /**
   * El backend puede devolver el objeto UsuarioAPI completo o sólo el UUID.
   * Usar un helper de resolución en los componentes para normalizar.
   */
  user: UsuarioAPI | string;
  assigned_by: UsuarioAPI | string;
  is_active: boolean;
  notes: string;
  assigned_at: string;
}

export interface SLAPolicy {
  id: string;
  name: string;
  pqrs_type: PqrsType;
  priority: PqrsPriority;
  business_days: number;
  description?: string;
}

/** Valores válidos para el campo `reason` de una escalación (choices del backend). */
export type EscalationReason = "SLA" | "COMPLEXITY" | "COMPETENCE" | "OTHER";

/** Etiquetas en español para cada motivo de escalación. */
export const ESCALATION_REASON_LABEL: Record<EscalationReason, string> = {
  SLA:        "Vencimiento SLA",
  COMPLEXITY: "Complejidad del caso",
  COMPETENCE: "Competencia de otra área",
  OTHER:      "Otro",
};

export interface PQRSEscalation {
  id: string;
  pqrs: string;
  from_user: UsuarioAPI | null;
  to_user: UsuarioAPI | null;
  from_dependency: Dependency | null;
  to_dependency: Dependency | null;
  /** Código del motivo (choices del backend). */
  reason: EscalationReason;
  /** Etiqueta legible del motivo (campo `reason_display` del serializer). */
  reason_display?: string;
  /** Texto libre adicional sobre la escalación. */
  notes: string;
  escalated_at: string;
}

export interface PQRSActivity {
  id: string;
  pqrs: string;
  activity_type: string;
  description: string;
  created_at: string;
  created_by: UsuarioAPI | null;
}

export interface Attachment {
  id: string;
  pqrs: string;
  file: string;
  filename: string;
  uploaded_by: UsuarioAPI;
  uploaded_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ────────────────────────────────────────────
//  STATUS & TYPE LABELS / MAPS
// ────────────────────────────────────────────

export const PQRS_STATUS_LABEL: Record<PqrsStatus, string> = {
  RAD: "Radicado",
  PRO: "En Proceso",
  RES: "Resuelto",
  CER: "Cerrado",
};

export const PQRS_TYPE_LABEL: Record<PqrsType, string> = {
  P: "Petición",
  Q: "Queja",
  R: "Reclamo",
  S: "Sugerencia",
  F: "Felicitación",
};

export const PQRS_PRIORITY_LABEL: Record<PqrsPriority, string> = {
  LOW:  "Baja",
  MED:  "Media",
  HIGH: "Alta",
};

// ────────────────────────────────────────────
//  AUTH
// ────────────────────────────────────────────

/**
 * Forma completa de la respuesta del endpoint /api/login/.
 * El backend devuelve los tokens JWT junto con los datos básicos del usuario,
 * lo que evita tener que hacer una llamada adicional a /api/users/perfil/
 * para determinar el rol en el momento del login.
 */
export interface LoginResponse {
  access: string;
  refresh: string;
  user_id: string;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  /** Array de códigos de roles asignados al usuario (ej. ["ADMIN"]). */
  roles: string[];
  is_staff: boolean;
  // Campos opcionales que el backend puede incluir o no
  tipo_documento?: DocumentType;
  cedula?: string;
  telefono?: string;
  ciudad?: string;
  dependency?: Dependency | null;
}

/**
 * Autentica al usuario contra el backend Django REST.
 * Almacena los tokens JWT en localStorage tras un login exitoso.
 * El backend incluye datos básicos del usuario en la respuesta (is_staff, nombre, etc.).
 *
 * @param email    - Correo electrónico del usuario.
 * @param password - Contraseña en texto plano.
 * @returns Objeto `LoginResponse` con tokens y datos del usuario.
 * @throws ApiError si las credenciales son incorrectas o el servidor no responde.
 */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>(
    "/api/login/",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  tokens.set(data.access, data.refresh);
  return data;
}

/**
 * Respuesta del endpoint de Google Sign-In del backend.
 */
export interface GoogleLoginResponse {
  access: string;
  refresh: string;
  /** `true` si se creó una cuenta nueva con los datos del perfil de Google. */
  created: boolean;
}

/**
 * Autentica al usuario mediante el `credential` (id_token) emitido por Google Identity Services.
 * El backend verifica el token con Google, crea la cuenta si no existe,
 * y retorna un par de tokens JWT propios.
 *
 * @param credential - El `id_token` JWT del callback de Google Sign-In.
 * @returns Objeto con `access`, `refresh` y `created`.
 * @throws ApiError si el token de Google es inválido o el servidor no responde.
 */
export async function apiGoogleLogin(credential: string): Promise<GoogleLoginResponse> {
  const data = await apiFetch<GoogleLoginResponse>(
    "/api/users/auth/google/",
    { method: "POST", body: JSON.stringify({ credential }) },
    false,
  );
  tokens.set(data.access, data.refresh);
  return data;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  password2: string;
  nombre: string;
  apellido?: string;
  tipo_documento: DocumentType;
  cedula: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
}

/**
 * Registra un nuevo usuario ciudadano en el backend.
 *
 * @param payload - Datos del formulario de registro.
 * @returns El objeto `UsuarioAPI` del usuario recién creado.
 * @throws ApiError 400 si la validación del backend falla (email duplicado, contraseñas débiles, etc.).
 */
export async function apiRegister(payload: RegisterPayload) {
  return apiFetch<UsuarioAPI>(
    "/api/users/registro/",
    { method: "POST", body: JSON.stringify(payload) },
    false,
  );
}

/**
 * Obtiene el perfil del usuario autenticado desde el backend.
 *
 * @returns Objeto `UsuarioAPI` con los datos del usuario actual.
 * @throws ApiError 401 si el token ha expirado o es inválido.
 */
export async function apiGetPerfil() {
  return apiFetch<UsuarioAPI>("/api/users/perfil/");
}

/**
 * Actualiza parcialmente los datos del perfil del usuario autenticado.
 *
 * @param data - Campos a actualizar (parcial de UsuarioAPI).
 * @returns El objeto `UsuarioAPI` actualizado.
 */
export async function apiUpdatePerfil(data: Partial<UsuarioAPI>) {
  return apiFetch<UsuarioAPI>("/api/users/perfil/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Cambia la contraseña del usuario autenticado.
 * El backend valida que `password_actual` sea correcto y que `password_nuevo`
 * y `password_nuevo2` coincidan.
 */
export async function apiChangePassword(payload: {
  password_actual: string;
  password_nuevo: string;
  password_nuevo2: string;
}) {
  return apiFetch<{ detail: string }>("/api/users/change-password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ────────────────────────────────────────────
//  PQRS
// ────────────────────────────────────────────

export interface CreatePqrsPayload {
  /** El backend espera `type`, no `pqrs_type`. */
  type: PqrsType;
  subject: string;
  description: string;
  priority?: PqrsPriority;
  // Campos del remitente anónimo — todos opcionales; el backend los acepta sin ninguno.
  /** Nombre del remitente (opcional). */
  anon_name?: string;
  /** Apellido del remitente (opcional). */
  anon_last_name?: string;
  /** Tipo de documento: CC, CE, TI, PA, PPT, RC (opcional, defecto CC). */
  anon_tipo_documento?: "CC" | "CE" | "TI" | "PA" | "PPT" | "RC";
  /** Número de documento (opcional). */
  anon_document_number?: string;
  /** Correo para notificaciones (opcional). Si se proporciona, se usará para verificar consultas. */
  anon_email?: string;
  /** Teléfono (opcional). */
  anon_phone?: string;
  /** Ciudad del remitente (opcional). */
  anon_city?: string;
}

/**
 * Crea una nueva solicitud PQRS.
 *
 * @param payload       - Datos del formulario de radicación.
 * @param authenticated - `true` si el ciudadano está logueado; `false` para envíos anónimos.
 *                        Esto controla si se envía el Bearer token en la petición.
 * @returns El objeto `PqrsAPI` recién creado con su número de radicado.
 */
export async function apiCreatePQRS(payload: CreatePqrsPayload, authenticated: boolean) {
  return apiFetch<PqrsAPI>(
    "/api/pqrs/",
    { method: "POST", body: JSON.stringify(payload) },
    authenticated,
  );
}

/**
 * Obtiene la lista paginada de PQRS del usuario autenticado (o todas si es admin/área).
 *
 * Construye los query params a partir de los filtros opcionales
 * antes de llamar al endpoint de listado.
 *
 * @param params - Filtros opcionales: estado, tipo, prioridad, página y tamaño de página.
 * @returns Respuesta paginada con el array de PQRS en `results`.
 */
export async function apiListPQRS(params?: {
  status?: PqrsStatus;
  type?: PqrsType;
  priority?: PqrsPriority;
  /** Si es `true`, filtra solo las PQRS activas sin responsable asignado. */
  sin_asignar?: boolean;
  /** Texto libre para buscar por radicado, asunto u otros campos. */
  search?: string;
  /** UUID de la dependencia/área para filtrar PQRS asignadas a esa área. */
  dependency?: string;
  page?: number;
  page_size?: number;
}) {
  // Construir query string solo con los parámetros definidos
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.type) q.set("type", params.type);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.sin_asignar) q.set("sin_asignar", "true");
  if (params?.search) q.set("search", params.search);
  if (params?.dependency) q.set("dependency", params.dependency);
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  const qs = q.toString() ? `?${q}` : "";
  return apiFetch<PaginatedResponse<PqrsAPI>>(`/api/pqrs/lista/${qs}`);
}

/**
 * Obtiene el detalle completo de una PQRS por su ID interno.
 *
 * @param id - UUID de la PQRS.
 */
export async function apiGetPQRS(id: string) {
  return apiFetch<PqrsAPI>(`/api/pqrs/${id}/`);
}

/**
 * Normaliza la respuesta del endpoint público de consulta.
 *
 * El endpoint `/api/pqrs/consultar/` puede devolver un objeto directo o
 * una respuesta paginada, y los nombres de campo pueden variar entre el
 * serializer público (a veces en español) y el serializer privado (inglés).
 * Esta función aplana ambos casos y mapea todos los alias conocidos.
 */
function normalizePqrsPublica(raw: Record<string, unknown>): PqrsAPI {
  // Si es respuesta paginada, tomar el primer resultado
  const src: Record<string, unknown> =
    Array.isArray((raw as { results?: unknown[] }).results) && (raw as { results: unknown[] }).results.length > 0
      ? (raw as { results: Record<string, unknown>[] }).results[0]
      : raw;

  // eslint-disable-next-line no-console
  console.debug("[ConsultaRadicado] raw API payload:", src);

  const pick = (...keys: string[]) => {
    for (const k of keys) if (src[k] !== undefined && src[k] !== null) return src[k];
    return undefined;
  };

  return {
    id:              (pick("id") as string) ?? "",
    numero_radicado: (pick("numero_radicado", "radicado") as string) ?? "",
    radicado:        pick("radicado", "numero_radicado") as string | undefined,
    type:            (pick("type", "pqrs_type") as PqrsType) ?? ("" as PqrsType),
    pqrs_type:       pick("pqrs_type", "type") as PqrsType | undefined,
    type_display:    (pick("type_display", "tipo") as string) ?? undefined,
    status_display:  (pick("status_display", "estado") as string) ?? undefined,
    subject:         (pick("subject", "asunto") as string) ?? "",
    description:     (pick("description", "descripcion", "descripci\u00f3n") as string) ?? "",
    status:          (pick("status") as PqrsStatus) ?? ("" as PqrsStatus),
    priority:        (pick("priority", "prioridad") as PqrsPriority) ?? ("MED" as PqrsPriority),
    created_at:      (pick("created_at", "creado_en", "fecha_creacion", "fecha_radicacion") as string) ?? "",
    updated_at:      (pick("updated_at", "actualizado_en", "fecha_actualizacion") as string) ?? "",
    due_date:        (pick("due_date", "fecha_limite", "fecha_vencimiento") as string | null) ?? null,
    user:            (pick("user", "usuario") as PqrsAPI["user"]) ?? null,
    anonymous_submitter:
      (pick("anonymous_submitter", "remitente_anonimo", "datos_anonimos") as PqrsAPI["anonymous_submitter"]) ?? null,
    dependency:      (pick("dependency", "dependencia", "area") as PqrsAPI["dependency"]) ?? null,
    sla_policy:      (pick("sla_policy", "sla") as PqrsAPI["sla_policy"]) ?? null,
  };
}

/**
 * Consulta pública de una PQRS por número de radicado.
 * No requiere autenticación; cualquier ciudadano puede usarla.
 *
 * @param radicado - Número de radicado (ej. "PQRS-2026-0001").
 */
export async function apiConsultarRadicado(radicado: string, email?: string) {
  const params = new URLSearchParams({ numero_radicado: radicado });
  if (email) params.set("email", email);
  const raw = await apiFetch<Record<string, unknown>>(
    `/api/pqrs/consultar/?${params.toString()}`,
    {},
    true, // enviar token si está disponible (el backend lo usa cuando existe)
  );
  return normalizePqrsPublica(raw);
}

/**
 * Actualiza el estado de una PQRS (admin o funcionario de área).
 *
 * @param id     - UUID de la PQRS.
 * @param status - Nuevo estado: RAD | PRO | RES | CER.
 * @param notes  - Nota interna opcional sobre el cambio de estado.
 */
export async function apiUpdateEstado(id: string, status: PqrsStatus, notes?: string) {
  return apiFetch<PqrsAPI>(`/api/pqrs/${id}/estado/`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

/**
 * Actualiza campos del PQRS directamente (PATCH parcial).
 * Útil para sincronizar el campo `dependency` después de una asignación,
 * de modo que el filtro `?dependency=` del backend devuelva resultados correctos.
 *
 * @param id    - UUID de la PQRS.
 * @param patch - Campos a actualizar (p. ej. `{ dependency: uuid }`).
 */
export async function apiPatchPQRS(id: string, patch: { dependency?: string | null; [key: string]: unknown }) {
  return apiFetch<PqrsAPI>(`/api/pqrs/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/**
 * Asigna una PQRS a un área/dependencia o usuario responsable.
 *
 * Endpoint del backend: POST /api/pqrs/assign/
 * El backend infiere `assigned_by_user` desde el JWT; no hay que enviarlo.
 * Solo una asignación activa por PQRS; el serializer desactiva las previas.
 *
 * @param payload.pqrs            - UUID de la PQRS a asignar.
 * @param payload.dependency      - UUID de la dependencia destino (opcional).
 * @param payload.responsible_user- UUID del usuario responsable (opcional).
 * @param payload.notes           - Nota interna sobre la asignación (opcional).
 */
export async function apiAssignPQRS(payload: {
  pqrs: string;
  /** UUID del usuario responsable. Campo REQUERIDO por el backend. */
  responsible_user: string;
  dependency?: string;
  notes?: string;
}) {
  return apiFetch<AssignmentAPI>("/api/pqrs/assign/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Registra una respuesta sobre una PQRS.
 *
 * @param payload.pqrs          - UUID de la PQRS.
 * @param payload.response_text - Texto de la respuesta.
 * @param payload.response_type - INTERNAL (solo funcionarios), CITIZEN (visible al ciudadano) o FINAL.
 */
export async function apiRespondPQRS(payload: {
  pqrs: string;
  /** Texto de la respuesta. El backend lo recibe en el campo `content`. */
  content: string;
  response_type?: "INTERNAL" | "CITIZEN" | "FINAL";
  /** Si es true, cierra la PQRS como resuelta. */
  is_final?: boolean;
}) {
  return apiFetch<PqrsResponseAPI>("/api/pqrs/respond/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Obtiene todas las respuestas registradas para una PQRS.
 *
 * @param pqrsId - UUID de la PQRS.
 */
export async function apiGetResponses(pqrsId: string) {
  return apiFetch<PaginatedResponse<PqrsResponseAPI>>(
    `/api/pqrs/${pqrsId}/responses/`,
  );
}

/**
 * Obtiene el historial de asignaciones de una PQRS.
 *
 * @param pqrsId - UUID de la PQRS.
 */
export async function apiGetAssignments(pqrsId: string) {
  return apiFetch<PaginatedResponse<AssignmentAPI>>(
    `/api/pqrs/${pqrsId}/assignments/`,
  );
}

/**
 * Lista todas las asignaciones de la plataforma (sin filtrar por PQRS).
 * Útil para calcular carga de trabajo por usuario o cargar PQRS de un área.
 *
 * Endpoint: GET /api/pqrs/assign/
 */
export async function apiListAllAssignments(params?: {
  is_active?: boolean;
  page_size?: number;
  /** Filtra asignaciones por UUID de dependencia destino. */
  dependency?: string;
  /** Filtra asignaciones por UUID del usuario responsable. */
  responsible_user?: string;
}) {
  const q = new URLSearchParams();
  if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  if (params?.dependency) q.set("dependency", params.dependency);
  if (params?.responsible_user) q.set("responsible_user", params.responsible_user);
  const qs = q.toString() ? `?${q}` : "";
  return apiFetch<PaginatedResponse<AssignmentAPI>>(`/api/pqrs/assign/${qs}`);
}

// ────────────────────────────────────────────
//  DEPENDENCIES (areas)
// ────────────────────────────────────────────

/**
 * Obtiene la lista de dependencias/áreas institucionales.
 *
 * @param all    - Si es `true`, solicita hasta 200 registros (para selectores/combos);
 *                 si es `false` usa la paginación por defecto del backend.
 * @param active - `true` solo activas, `false` solo inactivas, `undefined` todas (sin filtro).
 */
export async function apiListDependencies(all = false, active?: boolean) {
  const q = new URLSearchParams();
  if (all) q.set("page_size", "200");
  if (active !== undefined) {
    // Enviamos el filtro con ambos nombres habituales en backends Django
    // (el backend ignora el parámetro que no reconozca).
    q.set("active", String(active));
    q.set("is_active", String(active));
  }
  const qs = q.toString() ? `?${q}` : "";
  return apiFetch<PaginatedResponse<Dependency>>(`/api/pqrs/dependencies/${qs}`);
}

export interface DependencyPayload {
  name: string;
  code: string;
  email: string;
  description: string;
  active?: boolean;
}

/** Crea una nueva dependencia/área institucional. Solo accesible para administradores. */
export async function apiCreateDependency(payload: DependencyPayload) {
  return apiFetch<Dependency>("/api/pqrs/dependencies/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Actualiza parcialmente una dependencia existente.
 *
 * @param id      - UUID de la dependencia.
 * @param payload - Campos a actualizar.
 */
export async function apiUpdateDependency(id: string, payload: Partial<DependencyPayload>) {
  return apiFetch<Dependency>(`/api/pqrs/dependencies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Elimina una dependencia. Esta acción puede fallar si la dependencia
 * tiene PQRS o usuarios asociados.
 *
 * @param id - UUID de la dependencia a eliminar.
 */
export async function apiDeleteDependency(id: string) {
  return apiFetch<void>(`/api/pqrs/dependencies/${id}/`, { method: "DELETE" });
}

// ────────────────────────────────────────────
//  USERS (admin management)
// ────────────────────────────────────────────

/**
 * Lista todos los usuarios del sistema (solo administradores).
 *
 * @param params.page      - Número de página.
 * @param params.page_size - Registros por página.
 */
export async function apiListUsers(params?: { page?: number; page_size?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  const qs = q.toString() ? `?${q}` : "";
  return apiFetch<PaginatedResponse<UsuarioAPI>>(`/api/users/${qs}`);
}

/**
 * Actualiza datos de un usuario específico (uso administrativo).
 * Uso típico: asignar o reasignar la dependencia de un funcionario desde
 * el panel de administración (`GestionAreas`).
 *
 * Endpoint: `PATCH /api/users/<uuid>/`
 * Requiere `is_staff = true` en el token.
 *
 * @param id      - UUID del usuario a actualizar.
 * @param payload - Campos a actualizar (p. ej. `{ dependency: "<uuid>" }`).
 */
export async function apiUpdateUser(id: string, payload: Partial<Omit<UsuarioAPI, "dependency"> & { dependency: string | Dependency | null } & Record<string, unknown>>) {
  return apiFetch<UsuarioAPI>(`/api/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ────────────────────────────────────────────
//  DASHBOARD (admin)
// ────────────────────────────────────────────

/**
 * Obtiene los datos agregados del dashboard de administrador.
 *
 * Incluye: resumen de estados, métricas SLA, distribución por áreas,
 * flujo de PQRS, tendencia temporal y retroalimentación.
 *
 * @returns Objeto `DashboardAPI` con todas las secciones del panel.
 */
export async function apiGetDashboard() {
  return apiFetch<DashboardAPI>("/api/pqrs/dashboard/");
}

// ────────────────────────────────────────────
//  TOKEN VERIFY
// ────────────────────────────────────────────

/**
 * Verifica si un token (access o refresh) sigue siendo válido.
 * No devuelve datos adicionales; retorna `{}` si es válido.
 *
 * @param token - Access o Refresh token a verificar.
 * @throws ApiError 401 si el token ha expirado o es inválido.
 */
export async function apiVerifyToken(token: string) {
  return apiFetch<Record<string, never>>(
    "/api/login/verify/",
    { method: "POST", body: JSON.stringify({ token }) },
    false,
  );
}

// ────────────────────────────────────────────
//  ROLES
// ────────────────────────────────────────────

/**
 * Obtiene el catálogo completo de roles del sistema.
 */
export async function apiListRoles() {
  return apiFetch<PaginatedResponse<Role>>("/api/users/roles/");
}

export interface RolePayload {
  name: string;
  code: string;
  description?: string;
  active?: boolean;
}

/**
 * Crea un nuevo rol en el catálogo. Solo admin.
 *
 * @param payload - Datos del nuevo rol.
 */
export async function apiCreateRole(payload: RolePayload) {
  return apiFetch<Role>("/api/users/roles/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Obtiene los roles asignados a un usuario.
 *
 * @param userId - UUID del usuario.
 */
export async function apiGetUserRoles(userId: string) {
  return apiFetch<PaginatedResponse<UserRole>>(`/api/users/${userId}/roles/`);
}

/**
 * Asigna un rol a un usuario. Solo admin.
 *
 * @param userId - UUID del usuario destino.
 * @param roleId - UUID del rol a asignar.
 */
export async function apiAssignRole(userId: string, roleId: string) {
  return apiFetch<UserRole>(`/api/users/${userId}/roles/assign/`, {
    method: "POST",
    body: JSON.stringify({ role: roleId }),
  });
}

/**
 * Quita (elimina) un rol de un usuario. Solo admin.
 *
 * @param userRoleId - UUID del registro UserRole a eliminar.
 */
export async function apiRemoveRole(userRoleId: string) {
  return apiFetch<void>(`/api/users/roles/${userRoleId}/remove/`, {
    method: "DELETE",
  });
}

// ────────────────────────────────────────────
//  DEPENDENCY MANAGERS
// ────────────────────────────────────────────

/**
 * Obtiene el detalle de una dependencia por su ID.
 *
 * @param id - UUID de la dependencia.
 */
export async function apiGetDependency(id: string) {
  return apiFetch<Dependency>(`/api/pqrs/dependencies/${id}/`);
}

/**
 * Lista los encargados activos (y desactivados) de una dependencia.
 *
 * @param depId - UUID de la dependencia.
 */
export async function apiListManagers(depId: string) {
  return apiFetch<PaginatedResponse<DependencyManager>>(
    `/api/pqrs/dependencies/${depId}/managers/`,
  );
}

/**
 * Asigna un usuario como encargado de una dependencia. Solo admin.
 *
 * @param depId   - UUID de la dependencia.
 * @param userId  - UUID del usuario a asignar.
 * @param notes   - Notas opcionales sobre la asignación.
 */
export async function apiAssignManager(depId: string, userId: string, notes = "") {
  return apiFetch<DependencyManager>(`/api/pqrs/dependencies/${depId}/managers/`, {
    method: "POST",
    body: JSON.stringify({ user: userId, notes }),
  });
}

/**
 * Desactiva (soft-delete) un encargado de una dependencia. Solo admin.
 *
 * @param depId     - UUID de la dependencia.
 * @param managerId - UUID del registro DependencyManager a desactivar.
 */
export async function apiRemoveManager(depId: string, managerId: string) {
  return apiFetch<void>(
    `/api/pqrs/dependencies/${depId}/managers/${managerId}/`,
    { method: "DELETE" },
  );
}

// ────────────────────────────────────────────
//  SLA POLICIES
// ────────────────────────────────────────────

/**
 * Lista todas las políticas SLA registradas.
 */
export async function apiListSLA() {
  return apiFetch<PaginatedResponse<SLAPolicy>>("/api/pqrs/sla/");
}

export interface SLAPayload {
  name: string;
  pqrs_type: PqrsType;
  priority: PqrsPriority;
  business_days: number;
  description?: string;
}

/**
 * Crea una nueva política SLA. Solo admin.
 *
 * @param payload - Datos de la política.
 */
export async function apiCreateSLA(payload: SLAPayload) {
  return apiFetch<SLAPolicy>("/api/pqrs/sla/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Obtiene el detalle de una política SLA.
 *
 * @param id - UUID de la política SLA.
 */
export async function apiGetSLA(id: string) {
  return apiFetch<SLAPolicy>(`/api/pqrs/sla/${id}/`);
}

/**
 * Actualiza parcialmente una política SLA. Solo admin.
 *
 * @param id      - UUID de la política.
 * @param payload - Campos a actualizar.
 */
export async function apiUpdateSLA(id: string, payload: Partial<SLAPayload>) {
  return apiFetch<SLAPolicy>(`/api/pqrs/sla/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Elimina una política SLA. Solo admin.
 *
 * @param id - UUID de la política a eliminar.
 */
export async function apiDeleteSLA(id: string) {
  return apiFetch<void>(`/api/pqrs/sla/${id}/`, { method: "DELETE" });
}

// ────────────────────────────────────────────
//  PQRS – ESCALACIONES
// ────────────────────────────────────────────

export interface EscalatePayload {
  pqrs: string;
  to_user?: string;
  to_dependency?: string;
  /** Código del motivo: SLA | COMPLEXITY | COMPETENCE | OTHER (campo choices del backend). */
  reason: EscalationReason;
  /** Texto libre adicional (campo `notes` del backend). */
  notes?: string;
}

/**
 * Escala una PQRS a otra dependencia o usuario.
 * Dispara automáticamente un correo de notificación al área/usuario destino.
 *
 * @param payload - Datos de la escalación.
 */
export async function apiEscalatePQRS(payload: EscalatePayload) {
  return apiFetch<PQRSEscalation>("/api/pqrs/escalate/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Obtiene el historial de escalaciones de una PQRS.
 *
 * @param pqrsId - UUID de la PQRS.
 */
export async function apiGetEscalations(pqrsId: string) {
  return apiFetch<PaginatedResponse<PQRSEscalation>>(
    `/api/pqrs/${pqrsId}/escalations/`,
  );
}

// ────────────────────────────────────────────
//  PQRS – BITÁCORA DE ACTIVIDADES
// ────────────────────────────────────────────

/**
 * Obtiene el registro cronológico de todos los eventos de una PQRS.
 * El backend genera este registro automáticamente; no puede ser creado
 * ni modificado desde el cliente.
 *
 * @param pqrsId - UUID de la PQRS.
 */
export async function apiGetActivities(pqrsId: string) {
  return apiFetch<PaginatedResponse<PQRSActivity>>(
    `/api/pqrs/${pqrsId}/activities/`,
  );
}

// ────────────────────────────────────────────
//  PQRS – ADJUNTOS
// ────────────────────────────────────────────

/**
 * Sube un archivo adjunto vinculado a una PQRS.
 * Usa `multipart/form-data`; NO envía Content-Type: application/json.
 *
 * @param pqrsId - UUID de la PQRS a la que se adjunta el archivo.
 * @param file   - Objeto `File` proveniente de un `<input type="file">`.
 */
export async function apiUploadAttachment(pqrsId: string, file: File) {
  const form = new FormData();
  form.append("pqrs", pqrsId);
  form.append("file", file);

  // Cabeceras manuales: NO incluir Content-Type para que el browser
  // asigne automáticamente el boundary del multipart.
  const token = tokens.getAccess();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/pqrs/attachments/`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err);
  }
  return res.json() as Promise<Attachment>;
}

/**
 * Lista todos los archivos adjuntos de una PQRS.
 *
 * @param pqrsId - UUID de la PQRS.
 */
export async function apiGetAttachments(pqrsId: string) {
  return apiFetch<PaginatedResponse<Attachment>>(
    `/api/pqrs/${pqrsId}/attachments/`,
  );
}
