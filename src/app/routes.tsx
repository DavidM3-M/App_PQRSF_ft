import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CrearPQRS } from "./pages/CrearPQRS";
import { ConsultaRadicado } from "./pages/ConsultaRadicado";
import { UserDashboard } from "./pages/UserDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AreaDashboard } from "./pages/AreaDashboard";
import { GestionAreas } from "./pages/GestionAreas";
import { GestionRoles } from "./pages/GestionRoles";
import { GestionSLA } from "./pages/GestionSLA";
import { Perfil } from "./pages/Perfil";
import { NotFound } from "./pages/NotFound";

// ── Spinner compartido ────────────────────────────────────────────────────────
function AuthSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}

// ── Guardia de rutas protegidas ───────────────────────────────────────────────
/**
 * Componente guardia que protege rutas según autenticación y rol.
 *
 * Usa el contexto `useAuth()` en lugar de leer localStorage directamente,
 * lo que garantiza que la decisión de acceso se toma con el estado de sesión
 * más actualizado (incluyendo la revalidación en background del perfil).
 *
 * Comportamiento:
 *  1. Mientras `loading=true` (revalidando token), muestra un spinner.
 *  2. Sin sesión activa → redirige a `/login`.
 *  3. `adminOnly=true` y el rol no es "admin" → redirige a la home del rol actual.
 *  4. `areaOnly=true` y el rol no es "area"   → redirige a la home del rol actual.
 *  5. Pasa todas las validaciones → renderiza `children`.
 */
function ProtectedRoute({
  children,
  adminOnly = false,
  areaOnly  = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  areaOnly?:  boolean;
}) {
  const { usuario, loading } = useAuth();

  // Aguardar mientras AuthContext verifica/refresca la sesión
  if (loading) return <AuthSpinner />;

  // Sin sesión activa → login
  if (!usuario) return <Navigate to="/login" replace />;

  // Ruta exclusiva para admin.
  // Se comprueba tanto rol como is_staff para resistir condiciones de carrera
  // donde el background refresh pudo haber llegado con datos inconsistentes.
  const esAdmin = usuario.rol === "admin" || usuario.is_staff;
  if (adminOnly && !esAdmin) {
    return <Navigate to={usuario.rol === "area" ? "/area" : "/dashboard"} replace />;
  }

  // Ruta exclusiva para área — también redirige si el usuario es admin (por rol o is_staff)
  if (areaOnly && (usuario.rol !== "area" || esAdmin)) {
    return <Navigate to={esAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

// ── Guardia inteligente para /dashboard ──────────────────────────────────────
/**
 * Redirige automáticamente a la vista correcta según el rol:
 *  - admin → /admin
 *  - área  → /area
 *  - usuario → muestra UserDashboard normalmente
 * Evita que un admin quede "atrapado" en el panel de usuario.
 */
function DashboardGuard() {
  const { usuario, loading } = useAuth();

  if (loading) return <AuthSpinner />;
  if (!usuario) return <Navigate to="/login" replace />;
  // Comprueba rol Y is_staff para resistir condiciones de carrera del background refresh
  if (usuario.rol === "admin" || usuario.is_staff) return <Navigate to="/admin" replace />;
  if (usuario.rol === "area")  return <Navigate to="/area"  replace />;
  return <UserDashboard />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: "login",
        Component: Login,
      },
      {
        path: "registro",
        Component: Register,
      },
      {
        path: "crear-pqrs",
        Component: CrearPQRS,
      },
      {
        path: "consulta",
        Component: ConsultaRadicado,
      },
      {
        path: "dashboard",
        element: <DashboardGuard />,
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "gestion-areas",
        element: (
          <ProtectedRoute adminOnly>
            <GestionAreas />
          </ProtectedRoute>
        ),
      },
      {
        path: "gestion-roles",
        element: (
          <ProtectedRoute adminOnly>
            <GestionRoles />
          </ProtectedRoute>
        ),
      },
      {
        path: "gestion-sla",
        element: (
          <ProtectedRoute adminOnly>
            <GestionSLA />
          </ProtectedRoute>
        ),
      },
      {
        path: "perfil",
        element: (
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        ),
      },
      {
        path: "area",
        element: (
          <ProtectedRoute areaOnly>
            <AreaDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);