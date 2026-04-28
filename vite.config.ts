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
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Aumenta o limite de aviso (recharts/xlsx são grandes mas já isolados via lazy import)
    chunkSizeWarningLimit: 1500,
    // Sem `base` customizado: o preview publica os assets em /assets.
    // Com /comercialtechnet/, o HTML procura /comercialtechnet/assets/*,
    // recebe index.html como fallback e o navegador bloqueia por MIME text/html.
    // Removemos também o manualChunks customizado — deixamos o Rollup decidir.
    // O code-splitting por rota/aba (React.lazy) e o import dinâmico do XLSX
    // já garantem que o bundle inicial fique pequeno, sem risco de race
    // entre chunks ou de URLs antigas em cache no preview publicado.
  },
});