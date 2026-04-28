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
  // Base necessária para o GitHub Pages: o site fica em /comercialtechnet/
  // Sem isso, os assets são gerados com caminhos /assets/* e dão 404
  base: '/comercialtechnet/',
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