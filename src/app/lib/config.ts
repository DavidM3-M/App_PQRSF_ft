// ─────────────────────────────────────────────────────────────────────────────
//  Configuración global de la aplicación derivada de variables de entorno Vite
//  Importar desde aquí para centralizar el acceso a import.meta.env
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indica si el reCAPTCHA está deshabilitado.
 *
 * Se activa cuando VITE_DISABLE_CAPTCHA === "true" en el archivo .env.local
 * (o cualquier archivo .env cargado por Vite).
 *
 * - `true`  → entorno local/desarrollo: el formulario no exige CAPTCHA.
 * - `false` → producción: el widget reCAPTCHA es obligatorio para enviar.
 *
 * Uso:
 *   import { CAPTCHA_DISABLED } from "@/app/lib/config";
 */
export const CAPTCHA_DISABLED =
  import.meta.env.VITE_DISABLE_CAPTCHA === "true";

/**
 * Client ID de Google OAuth 2.0.
 *
 * Se lee de la variable de entorno VITE_GOOGLE_CLIENT_ID.
 * Configúrela en el archivo .env.local:
 *   VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
 */
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
