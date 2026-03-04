import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { FileQuestion } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <FileQuestion className="h-10 w-10 text-gray-600" />
          </div>
        </div>
        <h1 className="mb-2">404</h1>
        <h2 className="mb-4">Página no encontrada</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Lo sentimos, la página que está buscando no existe o ha sido movida.
        </p>
        <Link to="/">
          <Button size="lg">Volver al Inicio</Button>
        </Link>
      </div>
    </div>
  );
}
