import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  apiLogin,
  apiGoogleLogin,
  apiGetPerfil,
  tokens,
  UsuarioAPI,
  LoginResponse,
  formatApiError,
  resolveDepId,
  resolveDepName,
} from "../lib/api";

// ── Modelo de usuario normalizado para el frontend ──────────────────────
/**
 * Representación del usuario autenticado usada por todos los componentes.
 * Es una versión simplificada y enriquecida de `UsuarioAPI` del backend.
 *
 * El campo `rol` se deriva automáticamente:
 *  - `is_staff === true`       → "admin"
 *  - tiene `dependency`        → "area" (funcionario de área)
 *  - ninguno de los anteriores → "usuario" (ciudadano)
 */
export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  tipo_documento: string;
  cedula: string;
  telefono: string;
  ciudad: string;
  /** Rol derivado: controla el acceso a rutas protegidas. */
  rol: "admin" | "usuario" | "area";
  /** Códigos de roles asignados por el sistema de roles (ej. ["ADMIN"]). */
  roles?: string[];
  /** ID de la dependencia asignada (solo rol "area"). */
  dependencyId?: string;
  /** Nombre de la dependencia asignada (solo rol "area"). */
  dependencyName?: string;
  is_staff: boolean;
}

/**
 * Convierte el modelo `UsuarioAPI` (respuesta del backend) al modelo `Usuario`
 * utilizado por la aplicación frontend.
 *
 * La lógica de rol:
 *  1. Si `is_staff` es true → rol "admin".
 *  2. Si tiene dependencia asignada → rol "area".
 *  3. En caso contrario → rol "usuario" (ciudadano).
 *
 * @param u - Objeto UsuarioAPI del endpoint /api/users/perfil/.
 * @returns Objeto Usuario normalizado.
 */
/**
 * Construye un `Usuario` parcial directamente desde la respuesta del endpoint /api/login/.
 * Se usa cuando el backend ya devuelve datos del usuario en el login, evitando la
 * llamada adicional a /api/users/perfil/ para usuarios administradores.
 *
 * Limitación: la respuesta de login no incluye `dependency`, por lo que los usuarios
 * de área (rol "area") aún requieren `apiGetPerfil()` para obtener ese dato.
 *
 * @param d - Payload completo de la respuesta del endpoint /api/login/.
 * @returns Objeto `Usuario` normalizado (rol siempre "admin" si is_staff=true).
 */
/** Determina si el usuario tiene capacidades de administrador. */
function hasAdminPrivilege(is_staff: boolean, roles?: string[]): boolean {
  return is_staff || (roles?.includes("ADMIN") ?? false);
}

function mapLoginUser(d: LoginResponse): Usuario {
  const esAdmin = hasAdminPrivilege(d.is_staff, d.roles);
  const rol: Usuario["rol"] = esAdmin ? "admin" : "usuario";
  return {
    id: d.user_id,
    nombre: d.nombre,
    apellido: d.apellido ?? "",
    email: d.email,
    username: d.username,
    tipo_documento: (d.tipo_documento ?? "CC") as UsuarioAPI["tipo_documento"],
    cedula: d.cedula ?? "",
    telefono: d.telefono ?? "",
    ciudad: d.ciudad ?? "",
    rol,
    roles: d.roles,
    dependencyId: d.dependency?.id,
    dependencyName: d.dependency?.name,
    is_staff: d.is_staff,
  };
}

function mapApiUser(u: UsuarioAPI): Usuario {
  const is_staff = u.is_staff;
  const esAdmin = hasAdminPrivilege(is_staff, u.roles);
  const hasDep = !!u.dependency;
  const rol: Usuario["rol"] = esAdmin ? "admin" : hasDep ? "area" : "usuario";
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido ?? "",
    email: u.email,
    username: u.username,
    tipo_documento: u.tipo_documento,
    cedula: u.cedula,
    telefono: u.telefono ?? "",
    ciudad: u.ciudad ?? "",
    rol,
    roles: u.roles,
    dependencyId: resolveDepId(u.dependency),
    dependencyName: resolveDepName(u.dependency),
    is_staff,
  };
}

/**
 * Forma del contexto de autenticación expuesto a los componentes.
 *
 * @property usuario         - Objeto del usuario autenticado o null si no hay sesión.
 * @property loading         - true mientras se verifica/restaura la sesión inicial.
 * @property login           - Autentica al usuario; retorna { ok, error? }.
 * @property logout          - Cierra la sesión y limpia el estado.
 * @property refreshPerfil   - Recarga el perfil desde el backend (ej. tras actualizar datos).
 * @property isAuthenticated - Atajos booleano: !!usuario.
 * @property isAdmin         - true si rol === "admin".
 * @property isArea          - true si rol === "area".
 */
interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ ok: boolean; error?: string; created?: boolean }>;
  logout: () => void;
  refreshPerfil: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isArea: boolean;
}

/** Contexto React; el valor inicial es undefined para forzar el uso dentro de AuthProvider. */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Proveedor del contexto de autenticación.
 * Debe envolver toda la aplicación (normalmente en App.tsx).
 *
 * Al montar:
 *  1. Intenta restaurar la sesión desde localStorage si hay un token y usuario guardados.
 *  2. Revalida el perfil contra el backend en segundo plano.
 *  3. Si el token es inválido o el backend rechaza la sesión, la limpia automáticamente.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true); // bloquea el render hasta tener estado de sesión

  // ── Restaurar sesión al montar el proveedor ────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("usuario");
    if (stored && tokens.getAccess()) {
      // Carga inmediata desde localStorage para evitar pantalla en blanco
      const storedUser: Usuario = JSON.parse(stored);
      setUsuario(storedUser);
      // Validación en background: sincroniza con el backend
      apiGetPerfil()
        .then((u) => {
          const mapped = mapApiUser(u);
          // Preservar is_staff y rol de admin del localStorage si era admin, igual que en el
          // flujo de login. Evita que una inconsistencia puntual del backend degrade el
          // rol de admin → area o usuario en cada recarga de página.
          const mergedIsStaff = storedUser.is_staff || mapped.is_staff;
          // Fusionar codigos de roles: los del perfil fresco + los almacenados (si los hay)
          const storedRoles: string[] = storedUser.roles ?? [];
          const freshRoles: string[] = u.roles ?? [];
          const mergedRoles = [...new Set([...storedRoles, ...freshRoles])];
          const mergedIsAdmin = hasAdminPrivilege(mergedIsStaff, mergedRoles);
          const merged: Usuario = {
            ...mapped,
            is_staff: mergedIsStaff,
            rol: mergedIsAdmin ? "admin" : mapped.rol,
            roles: mergedRoles.length > 0 ? mergedRoles : mapped.roles,
          };
          setUsuario(merged);
          localStorage.setItem("usuario", JSON.stringify(merged));
        })
        .catch(() => {
          // Token inválido o backend rechazó: limpiar sesión
          tokens.clear();
          setUsuario(null);
        })
        .finally(() => setLoading(false));
    } else {
      // Sin token o sin datos de usuario → limpiar cualquier estado residual
      tokens.clear();
      setLoading(false);
    }
  }, []);

  /**
   * Inicia sesión con email y contraseña.
   *
   * Flujo optimizado:
   *  1. Llama a `apiLogin` → obtiene tokens + datos del usuario desde el mismo endpoint.
   *  2. Si el usuario es admin (`is_staff: true`): mapea el usuario desde la respuesta
   *     del login de forma inmediata, sin llamada adicional al backend.
   *     En paralelo refresca el perfil en background para completar campos opcionales.
   *  3. Si no es admin: llama a `apiGetPerfil` para obtener la `dependency` asignada,
   *     necesaria para determinar si el rol es "area" o "usuario".
   *
   * @returns `{ ok: true }` si fue exitoso, `{ ok: false, error: string }` si hubo un error.
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      const loginData = await apiLogin(email, password); // 1. Auth + tokens + datos usuario

      const loginIsAdmin = hasAdminPrivilege(loginData.is_staff, loginData.roles);

      if (loginIsAdmin) {
        // Admin: rol determinado desde el login, no necesitamos otra llamada
        const mapped = mapLoginUser(loginData);
        setUsuario(mapped);
        localStorage.setItem("usuario", JSON.stringify(mapped));
        // Refresco en background para rellenar campos opcionales del perfil.
        // IMPORTANTE: se preservan is_staff y roles del login para evitar que una
        // inconsistencia puntual del backend degrade el rol de admin.
        apiGetPerfil()
          .then(p => {
            const full = mapApiUser(p);
            // Fusionar privilegios: si el login los reportó, se mantienen
            const mergedIsStaff = loginData.is_staff || full.is_staff;
            const mergedRoles = [...new Set([...(loginData.roles ?? []), ...(p.roles ?? [])])];
            const mergedIsAdmin = hasAdminPrivilege(mergedIsStaff, mergedRoles);
            const merged: Usuario = {
              ...full,
              is_staff: mergedIsStaff,
              rol: mergedIsAdmin ? "admin" : full.rol,
              roles: mergedRoles.length > 0 ? mergedRoles : full.roles,
            };
            setUsuario(merged);
            localStorage.setItem("usuario", JSON.stringify(merged));
          })
          .catch(() => { /* ignorar: el usuario ya está seteado */ });
      } else {
        // No-admin: necesitamos apiGetPerfil para obtener la dependencia (rol "area" vs "usuario")
        // También fusionamos los roles del login por si el endpoint de perfil no los devuelve.
        const perfil = await apiGetPerfil();
        const mergedRoles = [...new Set([...(loginData.roles ?? []), ...(perfil.roles ?? [])])];
        const mapped = mapApiUser({ ...perfil, roles: mergedRoles });
        setUsuario(mapped);
        localStorage.setItem("usuario", JSON.stringify(mapped));
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: formatApiError(err) };
    }
  }, []);

  /**
   * Inicia sesión con Google Identity Services.
   *
   * Flujo:
   *  1. Llama a `apiGoogleLogin` con el `credential` (id_token de Google).
   *  2. Llama a `apiGetPerfil` para obtener rol y dependencia del usuario.
   *
   * @param credential - El id_token JWT del callback de Google Sign-In.
   * @returns `{ ok: true, created }` si fue exitoso, `{ ok: false, error }` si hubo un error.
   */
  const loginWithGoogle = useCallback(async (credential: string) => {
    try {
      const googleData = await apiGoogleLogin(credential);
      const perfil = await apiGetPerfil();
      const mergedRoles: string[] = perfil.roles ?? [];
      const mapped = mapApiUser({ ...perfil, roles: mergedRoles });
      setUsuario(mapped);
      localStorage.setItem("usuario", JSON.stringify(mapped));
      return { ok: true, created: googleData.created };
    } catch (err) {
      return { ok: false, error: formatApiError(err) };
    }
  }, []);

  /** Cierra la sesión: limpia el estado React y elimina todos los datos de localStorage. */
  const logout = useCallback(() => {
    setUsuario(null);
    tokens.clear(); // elimina access_token, refresh_token y usuario de localStorage
  }, []);

  /**
   * Recarga el perfil del usuario desde el backend y actualiza el estado y localStorage.
   * Útil tras modificar el perfil (nombre, teléfono, dependencia, etc.).
   * Los errores se ignoran silenciosamente para no interrumpir la experiencia.
   */
  const refreshPerfil = useCallback(async () => {
    try {
      const perfil = await apiGetPerfil();
      const mapped = mapApiUser(perfil);
      setUsuario(mapped);
      localStorage.setItem("usuario", JSON.stringify(mapped));
    } catch {
      // ignore: no interrumpir al usuario si falla el refresco en background
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        loading,
        login,
        loginWithGoogle,
        logout,
        refreshPerfil,
        isAuthenticated: !!usuario,
        isAdmin: usuario?.rol === "admin",
        isArea: usuario?.rol === "area",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook personalizado para consumir el contexto de autenticación.
 *
 * Lanza un error descriptivo si se usa fuera de un `AuthProvider`,
 * lo que facilita la detección temprana de errores de estructura.
 *
 * @example
 * const { usuario, login, logout, isAdmin } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}