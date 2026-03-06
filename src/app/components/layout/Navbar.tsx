import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { FileText, LogOut, User, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { usuario, logout, isAuthenticated, isAdmin, isArea } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (isAdmin) return "/admin";
    if (isArea) return "/area";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (isAdmin) return "Panel Admin";
    if (isArea) return "Mi Área";
    return "Mi Panel";
  };

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-lg">Sistema PQRS</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/consulta">
              <Button variant="ghost" size="sm">
                Consultar Radicado
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()}>
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="h-4 w-4" />
                    {getDashboardLabel()}
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <Link to="/perfil" className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{usuario?.nombre}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/registro">
                  <Button size="sm">Registrarse</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}