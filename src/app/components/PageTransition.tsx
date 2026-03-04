import { useLocation } from "react-router";

/**
 * Envuelve el contenido de cada ruta con una animación suave de entrada
 * (fade + deslizamiento hacia arriba). La `key` basada en el pathname hace
 * que React desmonte/remonte el div en cada cambio de ruta, re-disparando
 * la animación sin necesidad de librerías externas.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
