import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css"; // estilos globales (Tailwind + fuentes + tema)

/**
 * Punto de entrada de la aplicación React.
 *
 * `document.getElementById("root")!` selecciona el div#root de index.html.
 * El operador `!` asegura a TypeScript que el elemento siempre existe.
 * `createRoot` habilita el modo concurrente de React 18+.
 */
createRoot(document.getElementById("root")!).render(<App />);
