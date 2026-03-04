import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { Plugin } from 'vite'

/**
 * Plugin personalizado para resolver importaciones de assets de Figma.
 *
 * Los proyectos exportados desde Figma Make usan el esquema `figma:asset/<nombre>`
 * para referenciar imágenes incrustadas. Este plugin intercepta esas rutas
 * y las redirige a un SVG placeholder local, evitando errores de build.
 *
 * @returns Plugin de Vite con el resolutor de IDs.
 */
function figmaAssetPlugin(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        // Redirigir al SVG placeholder local en lugar del asset de Figma
        return path.resolve(__dirname, 'src/assets/logo-placeholder.svg')
      }
    },
  }
}

/**
 * Configuración de Vite para el proyecto Sistema PQRS Institucional.
 *
 * Plugins activos:
 *  - figmaAssetPlugin : resuelve imports `figma:asset/`.
 *  - react            : soporte para JSX/TSX y Fast Refresh (HMR).
 *  - tailwindcss      : integración nativa de Tailwind CSS v4 sin PostCSS manual.
 *
 * Alias `@` → `./src` permite importaciones absolutas como `@/app/lib/api`.
 */
export default defineConfig({
  plugins: [
    figmaAssetPlugin(),
    // Los plugins React y Tailwind son requeridos por Figma Make; no eliminar
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // '@' apunta a la carpeta src/ para evitar rutas relativas largas
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    // Puerto fijo para que el origen siempre sea http://localhost:5173,
    // que es el único registrado en CORS_ALLOWED_ORIGINS del backend Django.
    // strictPort: true hace que Vite falle explícitamente si el puerto está
    // ocupado (en lugar de saltar a 5174/5175 silenciosamente y romper CORS).
    port: 5173,
    strictPort: true,
  },

  // Tipos de archivo soportados como importaciones raw (sin procesamiento CSS/TS)
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
