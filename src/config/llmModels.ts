/**
 * Catálogo único de modelos LLM (fonte da verdade).
 *
 * Centraliza provedor, id interno, id real do provedor e metadados de UI,
 * eliminando a duplicação que existia entre:
 *   - src/services/chatService.ts (type LLMModel)
 *   - src/components/assistants/ModelSelector.tsx (MODEL_INFO)
 *   - supabase/functions/chat-completion/index.ts (mapeamento de provedor)
 *   - supabase/functions/_shared/llm.ts (mapeamento de provedor)
 *   - supabase/functions/agente-gerar/index.ts (allowlist de modelos)
 *   - migration do CHECK em chats.llm_model
 *   - tabela precos_modelos (custo real cobrado, em BRL)
 *
 * Regras:
 *  - NUNCA remover um id interno já existente (quebraria chats já gravados e o
 *    CHECK constraint). Apenas adicionar novos.
 *  - O `providerModelId` é o id enviado ao provedor; mantê-lo sincronizado com a
 *    Edge Function chat-completion (que espelha esta tabela por limite de runtime
 *    Deno x browser).
 *  - `pricing` é apenas referência informativa (USD por 1M tokens) para exibição;
 *    a cobrança real em BRL usa a tabela `precos_modelos` no banco.
 *  - Provedores com tarifa escalonada por volume (Gemini/OpenAI acima de 200K
 *    tokens de contexto usado) têm aqui apenas a tarifa base/menor — limitação
 *    aceita, sem suporte a tiers (schema de preço de taxa única).
 */

export type LLMProvider = 'openai' | 'google' | 'anthropic';

/** Ícone lógico — mapeado para componente em ModelSelector (mantém este arquivo livre de React). */
export type LLMIcon = 'sparkles' | 'zap' | 'brain';

export interface LLMPricing {
  /** USD por 1M tokens de entrada. */
  inputPer1M: number;
  /** USD por 1M tokens de saída. */
  outputPer1M: number;
  /** USD por 1M tokens de entrada em cache (quando suportado pelo provedor). */
  cachedInputPer1M?: number;
}

export interface LLMModelDefinition {
  /** Id interno persistido em chats.llm_model (estável, não alterar). */
  id: string;
  provider: LLMProvider;
  /** Id real enviado ao provedor (pode evoluir sem quebrar dados). */
  providerModelId: string;
  /** Rótulo amigável exibido na UI. */
  displayName: string;
  description: string;
  icon: LLMIcon;
  speed: 'Rápido' | 'Médio' | 'Lento';
  cost: 'Baixo' | 'Médio' | 'Alto';
  /** Parâmetros suportados — usados pelo módulo de configurações e Edge Function. */
  supports: {
    temperature: boolean;
    maxTokensParam: 'max_tokens' | 'max_completion_tokens';
  };
  /** Janela de contexto em tokens (entrada). Usada para truncar histórico em chat-completion. */
  contextWindowTokens: number;
  /** Máximo de tokens de saída suportado pelo provedor. */
  maxOutputTokens: number;
  /** Preço de referência (USD/1M tokens) — informativo, não usado para cobrança real. */
  pricing: LLMPricing;
  /** Modelo legado mantido apenas por compatibilidade (não destacar na UI). */
  legacy?: boolean;
}

export const LLM_MODELS: readonly LLMModelDefinition[] = [
  // ---------------- OpenAI ----------------
  {
    id: 'gpt-5.6-sol',
    provider: 'openai',
    providerModelId: 'gpt-5.6-sol',
    displayName: 'GPT-5.6 Sol',
    description: 'Máxima capacidade de raciocínio e coding da OpenAI.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 4, outputPer1M: 20, cachedInputPer1M: 0.40 },
  },
  {
    id: 'gpt-5.6-terra',
    provider: 'openai',
    providerModelId: 'gpt-5.6-terra',
    displayName: 'GPT-5.6 Terra',
    description: 'Equilíbrio entre inteligência e custo, geração 5.6.',
    icon: 'sparkles',
    speed: 'Médio',
    cost: 'Médio',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 2, outputPer1M: 12, cachedInputPer1M: 0.20 },
  },
  {
    id: 'gpt-5.6-luna',
    provider: 'openai',
    providerModelId: 'gpt-5.6-luna',
    displayName: 'GPT-5.6 Luna',
    description: 'Alto volume e baixo custo, geração 5.6.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 0.20, outputPer1M: 1.20, cachedInputPer1M: 0.02 },
  },
  {
    id: 'gpt-5.2',
    provider: 'openai',
    providerModelId: 'gpt-5.2',
    displayName: 'GPT-5.2',
    description: 'Modelo avançado da OpenAI (sem temperatura).',
    icon: 'sparkles',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 1.75, outputPer1M: 14, cachedInputPer1M: 0.175 },
  },
  {
    id: 'gpt-5.1',
    provider: 'openai',
    providerModelId: 'gpt-5.1',
    displayName: 'GPT-5.1',
    description: 'Modelo da geração GPT-5 da OpenAI (sem temperatura).',
    icon: 'sparkles',
    speed: 'Médio',
    cost: 'Médio',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 1.25, outputPer1M: 10, cachedInputPer1M: 0.125 },
  },
  {
    id: 'gpt-5',
    provider: 'openai',
    providerModelId: 'gpt-5',
    displayName: 'GPT-5',
    description: 'Modelo base da geração GPT-5 da OpenAI (sem temperatura).',
    icon: 'sparkles',
    speed: 'Médio',
    cost: 'Médio',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 1.25, outputPer1M: 10, cachedInputPer1M: 0.125 },
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    providerModelId: 'gpt-5-mini',
    displayName: 'GPT-5 mini',
    description: 'Versão econômica do GPT-5 para coding e subagentes.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 0.25, outputPer1M: 2, cachedInputPer1M: 0.025 },
  },
  {
    id: 'gpt-5-nano',
    provider: 'openai',
    providerModelId: 'gpt-5-nano',
    displayName: 'GPT-5 nano',
    description: 'Alto volume e baixíssimo custo da geração GPT-5.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: false, maxTokensParam: 'max_completion_tokens' },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 0.05, outputPer1M: 0.40, cachedInputPer1M: 0.005 },
  },
  {
    id: 'gpt-4.1',
    provider: 'openai',
    providerModelId: 'gpt-4.1',
    displayName: 'GPT-4.1',
    description: 'Modelo GPT-4.1 com contexto estendido.',
    icon: 'sparkles',
    speed: 'Médio',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_047_576,
    maxOutputTokens: 32_768,
    pricing: { inputPer1M: 2, outputPer1M: 8, cachedInputPer1M: 0.50 },
  },
  {
    id: 'gpt-4.1-mini',
    provider: 'openai',
    providerModelId: 'gpt-4.1-mini',
    displayName: 'GPT-4.1 mini',
    description: 'Versão econômica do GPT-4.1 com contexto estendido.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_047_576,
    maxOutputTokens: 32_768,
    pricing: { inputPer1M: 0.40, outputPer1M: 1.60, cachedInputPer1M: 0.10 },
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    providerModelId: 'gpt-4o',
    displayName: 'GPT-4o',
    description: 'Modelo multimodal rápido e equilibrado da OpenAI.',
    icon: 'sparkles',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    pricing: { inputPer1M: 2.50, outputPer1M: 10, cachedInputPer1M: 1.25 },
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    providerModelId: 'gpt-4o-mini',
    displayName: 'GPT-4o mini',
    description: 'Versão econômica e veloz do GPT-4o.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    pricing: { inputPer1M: 0.15, outputPer1M: 0.60, cachedInputPer1M: 0.075 },
  },
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    providerModelId: 'gpt-4-turbo-preview',
    displayName: 'GPT-4 Turbo',
    description: 'Versão mais rápida do GPT-4.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 128_000,
    maxOutputTokens: 4_096,
    pricing: { inputPer1M: 10, outputPer1M: 30 },
    legacy: true,
  },
  {
    id: 'gpt-4',
    provider: 'openai',
    providerModelId: 'gpt-4',
    displayName: 'GPT-4',
    description: 'Modelo clássico da OpenAI.',
    icon: 'sparkles',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 8_192,
    maxOutputTokens: 4_096,
    pricing: { inputPer1M: 30, outputPer1M: 60 },
    legacy: true,
  },

  // ---------------- Google Gemini ----------------
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'google',
    providerModelId: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro',
    description: 'Alta capacidade e raciocínio, geração 3.1 (preview).',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 2, outputPer1M: 12, cachedInputPer1M: 0.20 },
  },
  {
    id: 'gemini-3-pro',
    provider: 'google',
    providerModelId: 'gemini-3-pro',
    displayName: 'Gemini 3 Pro',
    description: 'Modelo Gemini 3 Pro do Google.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 2, outputPer1M: 12 },
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'google',
    providerModelId: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    description: 'Alta inteligência e velocidade, geração 3.5.',
    icon: 'brain',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 1.50, outputPer1M: 9, cachedInputPer1M: 0.15 },
  },
  {
    id: 'gemini-3-flash-preview',
    provider: 'google',
    providerModelId: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash',
    description: 'Modelo rápido e multimodal, geração 3 (preview).',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 0.50, outputPer1M: 3, cachedInputPer1M: 0.05 },
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'google',
    providerModelId: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash-Lite',
    description: 'Alto volume e baixo custo, geração 3.1.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 0.25, outputPer1M: 1.50, cachedInputPer1M: 0.025 },
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    providerModelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Modelo mais capaz do Google para raciocínio.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 1.25, outputPer1M: 10, cachedInputPer1M: 0.125 },
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'google',
    providerModelId: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Modelo rápido e eficiente do Google.',
    icon: 'brain',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_048_576,
    maxOutputTokens: 65_536,
    pricing: { inputPer1M: 0.30, outputPer1M: 2.50, cachedInputPer1M: 0.03 },
  },

  // ---------------- Anthropic Claude ----------------
  {
    id: 'claude-opus-5',
    provider: 'anthropic',
    providerModelId: 'claude-opus-5',
    displayName: 'Claude Opus 5',
    description: 'Máxima capacidade da Anthropic para coding e trabalho complexo.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 5, outputPer1M: 25 },
  },
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    providerModelId: 'claude-sonnet-5',
    displayName: 'Claude Sonnet 5',
    description: 'Melhor equilíbrio entre velocidade e inteligência (Anthropic).',
    icon: 'brain',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    // Preço promocional vigente até 2026-08-31 (fonte: platform.claude.com/docs);
    // depois dessa data passa a USD 3 / USD 15 por 1M tokens. Revisar manualmente.
    pricing: { inputPer1M: 2, outputPer1M: 10 },
  },
  {
    id: 'claude-opus-4.8',
    provider: 'anthropic',
    providerModelId: 'claude-opus-4-8',
    displayName: 'Claude Opus 4.8',
    description: 'Frontier, extremamente poderoso.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 5, outputPer1M: 25 },
  },
  {
    id: 'claude-opus-4.7',
    provider: 'anthropic',
    providerModelId: 'claude-opus-4-7',
    displayName: 'Claude Opus 4.7',
    description: 'Modelo frontier da geração anterior da Anthropic.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 5, outputPer1M: 25 },
  },
  {
    id: 'claude-opus-4.6',
    provider: 'anthropic',
    providerModelId: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
    description: 'Alta capacidade da Anthropic.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 5, outputPer1M: 25 },
  },
  {
    id: 'claude-sonnet-4.6',
    provider: 'anthropic',
    providerModelId: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
    description: 'Excelente equilíbrio entre velocidade e inteligência.',
    icon: 'brain',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 128_000,
    pricing: { inputPer1M: 3, outputPer1M: 15 },
  },
  {
    id: 'claude-haiku-4.5',
    provider: 'anthropic',
    providerModelId: 'claude-haiku-4-5',
    displayName: 'Claude Haiku 4.5',
    description: 'Modelo Claude mais rápido e econômico.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 200_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 1, outputPer1M: 5 },
  },
  {
    id: 'claude-sonnet-4.5',
    provider: 'anthropic',
    providerModelId: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    description: 'Modelo Claude Sonnet 4.5 da Anthropic.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
    contextWindowTokens: 200_000,
    maxOutputTokens: 64_000,
    pricing: { inputPer1M: 3, outputPer1M: 15 },
    legacy: true,
  },
] as const;

/** Todos os ids internos válidos (para tipos e validação). */
export const LLM_MODEL_IDS = LLM_MODELS.map((m) => m.id);

/** Modelo padrão da aplicação. */
export const DEFAULT_LLM_MODEL_ID = 'gpt-5.2';

const MODEL_BY_ID = new Map(LLM_MODELS.map((m) => [m.id, m]));

export function getLLMModel(id: string): LLMModelDefinition | undefined {
  return MODEL_BY_ID.get(id);
}

/** Resolve o id real do provedor a partir do id interno (com fallback seguro). */
export function resolveProviderModelId(id: string): string {
  return MODEL_BY_ID.get(id)?.providerModelId ?? id;
}
