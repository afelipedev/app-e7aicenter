// =============================================================================
// _shared/llm.ts -- Nucleo LLM reutilizavel do AI Center E7
// Reune roteamento multi-provedor (OpenAI/Gemini/Anthropic), resolucao de chave
// via Supabase Vault (get_ai_secret) com fallback p/ Deno.env, embeddings e
// calculo de custo (~R$). Extraido do padrao de chat-completion/index.ts.
// =============================================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export interface MensagemLLM {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RespostaLLM {
  content: string;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  finishReason?: string;
}

type ProviderInfo = {
  provider: "openai" | "google" | "anthropic";
  providerModelId: string;
  temperature: boolean;
  maxTokensParam: "max_tokens" | "max_completion_tokens";
};

// Catalogo espelhado de src/config/llmModels.ts e da precos_modelos. MANTER SYNC.
export const MODEL_PROVIDER_MAP: Record<string, ProviderInfo> = {
  "gpt-5.6-sol": { provider: "openai", providerModelId: "gpt-5.6-sol", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5.6-terra": { provider: "openai", providerModelId: "gpt-5.6-terra", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5.6-luna": { provider: "openai", providerModelId: "gpt-5.6-luna", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5.2": { provider: "openai", providerModelId: "gpt-5.2", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5.1": { provider: "openai", providerModelId: "gpt-5.1", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5": { provider: "openai", providerModelId: "gpt-5", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5-mini": { provider: "openai", providerModelId: "gpt-5-mini", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-5-nano": { provider: "openai", providerModelId: "gpt-5-nano", temperature: false, maxTokensParam: "max_completion_tokens" },
  "gpt-4.1": { provider: "openai", providerModelId: "gpt-4.1", temperature: true, maxTokensParam: "max_tokens" },
  "gpt-4.1-mini": { provider: "openai", providerModelId: "gpt-4.1-mini", temperature: true, maxTokensParam: "max_tokens" },
  "gpt-4o": { provider: "openai", providerModelId: "gpt-4o", temperature: true, maxTokensParam: "max_tokens" },
  "gpt-4o-mini": { provider: "openai", providerModelId: "gpt-4o-mini", temperature: true, maxTokensParam: "max_tokens" },
  "gpt-4-turbo": { provider: "openai", providerModelId: "gpt-4-turbo-preview", temperature: true, maxTokensParam: "max_tokens" },
  "gpt-4": { provider: "openai", providerModelId: "gpt-4", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-3.1-pro-preview": { provider: "google", providerModelId: "gemini-3.1-pro-preview", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-3-pro": { provider: "google", providerModelId: "gemini-3-pro", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-3.5-flash": { provider: "google", providerModelId: "gemini-3.5-flash", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-3-flash-preview": { provider: "google", providerModelId: "gemini-3-flash-preview", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-3.1-flash-lite": { provider: "google", providerModelId: "gemini-3.1-flash-lite", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-2.5-flash": { provider: "google", providerModelId: "gemini-2.5-flash", temperature: true, maxTokensParam: "max_tokens" },
  "gemini-2.5-pro": { provider: "google", providerModelId: "gemini-2.5-pro", temperature: true, maxTokensParam: "max_tokens" },
  "claude-opus-5": { provider: "anthropic", providerModelId: "claude-opus-5", temperature: true, maxTokensParam: "max_tokens" },
  "claude-sonnet-5": { provider: "anthropic", providerModelId: "claude-sonnet-5", temperature: true, maxTokensParam: "max_tokens" },
  "claude-opus-4.8": { provider: "anthropic", providerModelId: "claude-opus-4-8", temperature: true, maxTokensParam: "max_tokens" },
  "claude-opus-4.7": { provider: "anthropic", providerModelId: "claude-opus-4-7", temperature: true, maxTokensParam: "max_tokens" },
  "claude-opus-4.6": { provider: "anthropic", providerModelId: "claude-opus-4-6", temperature: true, maxTokensParam: "max_tokens" },
  "claude-sonnet-4.6": { provider: "anthropic", providerModelId: "claude-sonnet-4-6", temperature: true, maxTokensParam: "max_tokens" },
  "claude-haiku-4.5": { provider: "anthropic", providerModelId: "claude-haiku-4-5", temperature: true, maxTokensParam: "max_tokens" },
  "claude-sonnet-4.5": { provider: "anthropic", providerModelId: "claude-sonnet-4-5-20250929", temperature: true, maxTokensParam: "max_tokens" },
};

export function resolveProvider(model: string): ProviderInfo | undefined {
  return MODEL_PROVIDER_MAP[model];
}

const ENV_KEY_BY_PROVIDER: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

// Le a chave do Vault (modulo de Configuracoes); fallback p/ Deno.env.
export async function resolveApiKey(admin: any, provider: string): Promise<string | null> {
  try {
    const { data } = await admin.rpc("get_ai_secret", { p_name: `ai_api_key_${provider}` });
    if (data && typeof data === "string" && data.length > 0) return data;
  } catch (_) { /* fallback abaixo */ }
  return Deno.env.get(ENV_KEY_BY_PROVIDER[provider] ?? "") ?? null;
}

export type ModelCfg = { apiKey: string | null; maxTokens: number; temperature: number };

export async function resolveModelCfg(admin: any, model: string, overrides?: Partial<ModelCfg>): Promise<ModelCfg> {
  const provider = resolveProvider(model)?.provider ?? "openai";
  const apiKey = await resolveApiKey(admin, provider);
  let maxTokens = 2000;
  let temperature = 0.7;
  try {
    const { data } = await admin.from("system_llm_settings").select("max_tokens, temperature").eq("provider", provider).maybeSingle();
    if (data?.max_tokens) maxTokens = Number(data.max_tokens);
    if (data?.temperature != null) temperature = Number(data.temperature);
  } catch (_) { /* usa padroes */ }
  return {
    apiKey,
    maxTokens: overrides?.maxTokens ?? maxTokens,
    temperature: overrides?.temperature ?? temperature,
  };
}

async function callOpenAI(messages: MensagemLLM[], systemPrompt: string, model: string, cfg: ModelCfg): Promise<RespostaLLM> {
  if (!cfg.apiKey) throw new Error("OpenAI API key nao configurada");
  const info = resolveProvider(model);
  if (!info) throw new Error(`Modelo OpenAI desconhecido no catalogo: "${model}"`);
  const openaiModel = info.providerModelId;
  const body: Record<string, unknown> = {
    model: openaiModel,
    messages: [{ role: "system", content: systemPrompt }, ...messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))],
  };
  body[info.maxTokensParam] = cfg.maxTokens;
  if (info.temperature !== false) body.temperature = cfg.temperature;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${res.status} - ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    modelo: data.model || openaiModel,
    tokensEntrada: data.usage?.prompt_tokens ?? 0,
    tokensSaida: data.usage?.completion_tokens ?? 0,
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

async function callGemini(messages: MensagemLLM[], systemPrompt: string, model: string, cfg: ModelCfg): Promise<RespostaLLM> {
  if (!cfg.apiKey) throw new Error("Gemini API key nao configurada");
  const contents = messages.map((m, i) => {
    if (i === 0 && m.role === "user") return { role: "user", parts: [{ text: `${systemPrompt}\n\n${m.content}` }] };
    return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
  });
  if (contents.length === 0) contents.push({ role: "user", parts: [{ text: systemPrompt }] });
  const info = resolveProvider(model);
  if (!info) throw new Error(`Modelo Gemini desconhecido no catalogo: "${model}"`);
  const modelName = info.providerModelId;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cfg.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { temperature: cfg.temperature, maxOutputTokens: cfg.maxTokens } }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${res.status} - ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    modelo: modelName,
    tokensEntrada: data.usageMetadata?.promptTokenCount ?? 0,
    tokensSaida: data.usageMetadata?.candidatesTokenCount ?? 0,
    finishReason: data.candidates?.[0]?.finishReason,
  };
}

async function callClaude(messages: MensagemLLM[], systemPrompt: string, model: string, cfg: ModelCfg): Promise<RespostaLLM> {
  if (!cfg.apiKey) throw new Error("Anthropic API key nao configurada");
  const info = resolveProvider(model);
  if (!info) throw new Error(`Modelo Anthropic desconhecido no catalogo: "${model}"`);
  const modelName = info.providerModelId;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: modelName,
      max_tokens: cfg.maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${res.status} - ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return {
    content: data.content?.[0]?.text || "",
    modelo: data.model || modelName,
    tokensEntrada: data.usage?.input_tokens ?? 0,
    tokensSaida: data.usage?.output_tokens ?? 0,
    finishReason: data.stop_reason,
  };
}

// Roteia por prefixo do id, com fallback p/ gpt-4o quando o provedor falha.
export async function chamarLLM(admin: any, messages: MensagemLLM[], systemPrompt: string, model: string, overrides?: Partial<ModelCfg>): Promise<RespostaLLM> {
  const cfg = await resolveModelCfg(admin, model, overrides);
  try {
    if (model.startsWith("gpt-")) return await callOpenAI(messages, systemPrompt, model, cfg);
    if (model.startsWith("gemini-")) return await callGemini(messages, systemPrompt, model, cfg);
    if (model.startsWith("claude-")) return await callClaude(messages, systemPrompt, model, cfg);
    throw new Error(`Modelo nao suportado: ${model}`);
  } catch (error) {
    if (!model.startsWith("gpt-")) {
      const fb = await resolveModelCfg(admin, "gpt-4o", overrides);
      return await callOpenAI(messages, systemPrompt, "gpt-4o", fb);
    }
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Embeddings (RAG) -- OpenAI text-embedding-3-small (1536)
// -----------------------------------------------------------------------------
export async function gerarEmbedding(admin: any, texto: string): Promise<number[]> {
  const apiKey = await resolveApiKey(admin, "openai");
  if (!apiKey) throw new Error("OpenAI API key nao configurada (necessaria p/ embeddings)");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texto }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Embeddings API error: ${res.status} - ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.data?.[0]?.embedding ?? [];
}

// Embeddings em lote: uma unica chamada para ate ~N textos (reduz custo/tempo
// e evita estourar recursos da Edge Function em documentos grandes).
export async function gerarEmbeddingsLote(admin: any, textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return [];
  const apiKey = await resolveApiKey(admin, "openai");
  if (!apiKey) throw new Error("OpenAI API key nao configurada (necessaria p/ embeddings)");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: textos }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Embeddings API error: ${res.status} - ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return (data.data ?? []).sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

// OCR via Mistral (mistral-ocr-latest). Aceita base64; document_url para PDF,
// image_url para imagem. Retorna o markdown concatenado das paginas.
export async function ocrMistral(admin: any, base64: string, mime: string, ehPdf: boolean): Promise<string> {
  const apiKey = await resolveApiKey(admin, "mistral");
  if (!apiKey) throw new Error("Mistral API key nao configurada (necessaria p/ OCR de PDF escaneado)");
  const document = ehPdf
    ? { type: "document_url", document_url: `data:application/pdf;base64,${base64}` }
    : { type: "image_url", image_url: `data:${mime};base64,${base64}` };
  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "mistral-ocr-latest", document }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Mistral OCR error: ${res.status} - ${e.error?.message || e.detail || res.statusText}`);
  }
  const data = await res.json();
  return (data.pages ?? []).map((p: any) => p.markdown ?? p.text ?? "").join("\n\n").trim();
}

// -----------------------------------------------------------------------------
// Custo estimado (~R$) a partir de precos_modelos.
// Observacao: tarifas escalonadas por volume (Gemini/OpenAI acima de 200K
// tokens de contexto usado) nao sao representadas aqui -- usa-se sempre a
// tarifa base/menor cadastrada em precos_modelos (schema de taxa unica).
// -----------------------------------------------------------------------------
export async function estimarCustoReais(admin: any, modelo: string, tokensEntrada: number, tokensSaida: number): Promise<number> {
  try {
    const { data } = await admin.from("precos_modelos").select("preco_entrada_1k, preco_saida_1k, cambio_usd_brl").eq("modelo", modelo).maybeSingle();
    if (!data) {
      console.warn(`estimarCustoReais: sem preco cadastrado para modelo "${modelo}" -- custo registrado como 0.`);
      return 0;
    }
    const usd = (tokensEntrada / 1000) * Number(data.preco_entrada_1k) + (tokensSaida / 1000) * Number(data.preco_saida_1k);
    return Number((usd * Number(data.cambio_usd_brl)).toFixed(6));
  } catch (e) {
    console.warn(`estimarCustoReais: falha ao calcular custo p/ "${modelo}":`, e instanceof Error ? e.message : e);
    return 0;
  }
}
