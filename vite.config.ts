import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Lovable Preview/Hosting serve o app pela raiz; manter base em subpasta
  // faz o preview procurar assets/rotas em /comercialtechnet/ e pode abrir em branco.
  base: '/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});