import { supabase } from "@/lib/supabase";
import type {
  AIProvider,
  CredentialStatus,
  SystemAICredential,
  SystemLlmSetting,
  SystemWebhook,
  SystemWebhookInput,
} from "../types";

// CRUD de webhooks e configurações LLM: direto via RLS (admin-only).
// Operações sensíveis (credenciais de IA, teste de webhook): via Edge Function.

// ---------------- Webhooks ----------------
export async function listWebhooks(): Promise<SystemWebhook[]> {
  const { data, error } = await supabase
    .from("system_webhooks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWebhook(input: SystemWebhookInput): Promise<SystemWebhook> {
  const { data, error } = await supabase
    .from("system_webhooks")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateWebhook(id: string, input: Partial<SystemWebhookInput>): Promise<SystemWebhook> {
  const { data, error } = await supabase
    .from("system_webhooks")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase.from("system_webhooks").delete().eq("id", id);
  if (error) throw error;
}

export async function testWebhook(url: string, slug?: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke("system-settings-mutate", {
    body: { action: "webhook.test", payload: { url, slug } },
  });
  if (error) throw error;
  return data;
}

// ---------------- Configurações LLM ----------------
export async function listLlmSettings(): Promise<SystemLlmSetting[]> {
  const { data, error } = await supabase.from("system_llm_settings").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertLlmSetting(setting: Partial<SystemLlmSetting> & { provider: AIProvider }): Promise<SystemLlmSetting> {
  const { data, error } = await supabase
    .from("system_llm_settings")
    .upsert(setting, { onConflict: "provider" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ---------------- Credenciais de IA ----------------
export async function listCredentials(): Promise<SystemAICredential[]> {
  const { data, error } = await supabase
    .from("system_ai_credentials")
    .select("provider, masked_hint, status, last_validated_at, updated_at")
    .order("provider", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setCredential(provider: AIProvider, apiKey: string): Promise<{ masked_hint: string; status: CredentialStatus }> {
  const { data, error } = await supabase.functions.invoke("system-settings-mutate", {
    body: { action: "credential.set", payload: { provider, apiKey } },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function validateCredential(provider: AIProvider): Promise<{ status: CredentialStatus }> {
  const { data, error } = await supabase.functions.invoke("system-settings-mutate", {
    body: { action: "credential.validate", payload: { provider } },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteCredential(provider: AIProvider): Promise<void> {
  const { data, error } = await supabase.functions.invoke("system-settings-mutate", {
    body: { action: "credential.delete", payload: { provider } },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
