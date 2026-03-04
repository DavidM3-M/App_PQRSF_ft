import { RouterProvider } from "react-router";
import { router } from "./routes";

/**
 * Componente raíz de la aplicación.
 *
 * `AuthProvider` vive dentro del árbol del router (en `Layout.tsx`) para que
 * los componentes de ruta renderizados por `RouterProvider` (data router de
 * React Router v7) tengan acceso al contexto de autenticación.
 * Colocar `AuthProvider` fuera de `RouterProvider` causaba que React Router
 * renderizara los elementos de ruta en su propio scope interno, fuera del
 * árbol de proveedores, lo que producía el error "useAuth fuera de AuthProvider".
 */
export default function App() {
  return <RouterProvider router={router} />;
}