// Tipos do módulo de Configurações do Sistema.

export type AIProvider = "openai" | "google" | "anthropic";

export interface SystemWebhook {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SystemWebhookInput = Pick<
  SystemWebhook,
  "name" | "slug" | "url" | "description" | "is_active"
>;

export interface SystemLlmSetting {
  provider: AIProvider;
  default_model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  timeout_ms: number | null;
  context_window: number | null;
  extra_params: Record<string, unknown>;
  updated_at: string;
}

export type CredentialStatus = "empty" | "configured" | "valid" | "invalid";

export interface SystemAICredential {
  provider: AIProvider;
  masked_hint: string | null;
  status: CredentialStatus;
  last_validated_at: string | null;
  updated_at: string;
}

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI",
  google: "Google Gemini",
  anthropic: "Anthropic",
};
