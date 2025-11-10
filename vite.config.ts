import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Alias para pasta shared (usar ~shared para evitar conflito com @)
      "~shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: {
    // Garantir hash nos arquivos para cache busting
    rollupOptions: {
      output: {
        // Hash baseado no conteúdo do arquivo
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // CSS e outros assets também com hash
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Otimizações de build
    cssCodeSplit: true,
    sourcemap: false, // Desabilitar sourcemaps em produção para melhor performance
    minify: 'esbuild',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
}));
