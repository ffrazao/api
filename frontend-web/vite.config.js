import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/

/* habilitar pra produção assim
export default defineConfig({
  plugins: [react()],
  server: {
      host: true, // Necessário para rodar no Docker (escutar em 0.0.0.0)
      port: 5173,
      allowedHosts: ['frontend-web', 'localhost', '127.0.0.1', '147.15.67.192'],
      strictPort: true,
    }
})
*/

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Necessário para rodar no Docker (escutar em 0.0.0.0)
    port: 5173,
    allowedHosts: true, // permite qualquer host — modo permissivo para dev
    strictPort: true,
  },
});
