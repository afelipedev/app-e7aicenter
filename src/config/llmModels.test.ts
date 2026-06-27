import { describe, it, expect } from "vitest";
import {
  LLM_MODELS,
  LLM_MODEL_IDS,
  DEFAULT_LLM_MODEL_ID,
  getLLMModel,
  resolveProviderModelId,
} from "./llmModels";

// Smoke tests do catálogo único de modelos LLM (fonte da verdade).
// Garante consistência entre frontend, Edge Function e CHECK constraint.
describe("catálogo LLM", () => {
  it("não possui ids internos duplicados", () => {
    expect(new Set(LLM_MODEL_IDS).size).toBe(LLM_MODEL_IDS.length);
  });

  it("o modelo padrão existe no catálogo", () => {
    expect(getLLMModel(DEFAULT_LLM_MODEL_ID)).toBeDefined();
  });

  it("todo modelo tem provedor e id de provedor válidos", () => {
    for (const m of LLM_MODELS) {
      expect(["openai", "google", "anthropic"]).toContain(m.provider);
      expect(m.providerModelId.length).toBeGreaterThan(0);
    }
  });

  it("resolve o id do provedor a partir do id interno", () => {
    expect(resolveProviderModelId("claude-opus-4.8")).toBe("claude-opus-4-8");
    expect(resolveProviderModelId("gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });

  it("retorna o próprio id como fallback para modelo desconhecido", () => {
    expect(resolveProviderModelId("modelo-inexistente")).toBe("modelo-inexistente");
  });
});
