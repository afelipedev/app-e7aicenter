/**
 * Catálogo único de modelos LLM (fonte da verdade).
 *
 * Centraliza provedor, id interno, id real do provedor e metadados de UI,
 * eliminando a duplicação que existia entre:
 *   - src/services/chatService.ts (type LLMModel)
 *   - src/components/assistants/ModelSelector.tsx (MODEL_INFO)
 *   - supabase/functions/chat-completion/index.ts (mapeamento de provedor)
 *   - migration do CHECK em chats.llm_model
 *
 * Regras:
 *  - NUNCA remover um id interno já existente (quebraria chats já gravados e o
 *    CHECK constraint). Apenas adicionar novos.
 *  - O `providerModelId` é o id enviado ao provedor; mantê-lo sincronizado com a
 *    Edge Function chat-completion (que espelha esta tabela por limite de runtime
 *    Deno x browser).
 */

export type LLMProvider = 'openai' | 'google' | 'anthropic';

/** Ícone lógico — mapeado para componente em ModelSelector (mantém este arquivo livre de React). */
export type LLMIcon = 'sparkles' | 'zap' | 'brain';

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
  /** Modelo legado mantido apenas por compatibilidade (não destacar na UI). */
  legacy?: boolean;
}

export const LLM_MODELS: readonly LLMModelDefinition[] = [
  // ---------------- OpenAI ----------------
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
    legacy: true,
  },

  // ---------------- Google Gemini ----------------
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
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'google',
    providerModelId: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    description: 'Modelo Gemini 3.5 Flash, rápido e eficiente.',
    icon: 'brain',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'google',
    providerModelId: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash-Lite',
    description: 'Modelo Gemini 3.1 Flash-Lite, mais econômico.',
    icon: 'zap',
    speed: 'Rápido',
    cost: 'Baixo',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
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
  },

  // ---------------- Anthropic Claude ----------------
  {
    id: 'claude-opus-4.8',
    provider: 'anthropic',
    providerModelId: 'claude-opus-4-8',
    displayName: 'Claude Opus 4.8',
    description: 'Modelo Claude mais capaz da Anthropic.',
    icon: 'brain',
    speed: 'Médio',
    cost: 'Alto',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
  },
  {
    id: 'claude-sonnet-4.6',
    provider: 'anthropic',
    providerModelId: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
    description: 'Melhor equilíbrio entre velocidade e inteligência.',
    icon: 'brain',
    speed: 'Rápido',
    cost: 'Médio',
    supports: { temperature: true, maxTokensParam: 'max_tokens' },
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
