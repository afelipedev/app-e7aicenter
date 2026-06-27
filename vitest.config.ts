import { defineConfig } from "vitest/config";
import path from "path";

// Configuração inicial de testes (Vitest).
// Fase 1: testes unitários de lógica pura (catálogo LLM, RBAC, adapters).
// Ambiente "node" por padrão; trocar para "jsdom" ao adicionar testes de componentes React.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
