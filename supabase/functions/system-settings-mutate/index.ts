import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Edge Function do módulo de Configurações do Sistema.
// Responsável por operações SENSÍVEIS: credenciais de IA (Vault) e teste de webhook.
// CRUD de webhooks/llm_settings é feito direto pelo frontend via RLS (admin-only).
// NUNCA retorna o segredo em texto — apenas máscara/status.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_ROLES = ["administrator", "it", "advogado_adm"];
const PROVIDERS = ["openai", "google", "anthropic"] as const;
type Provider = (typeof PROVIDERS)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function secretName(provider: Provider) {
  return `ai_api_key_${provider}`;
}

function mask(secret: string) {
  const tail = secret.slice(-4);
  return `••••${tail}`;
}

async function ensureAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autorizado");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) throw new Error("Configuração do Supabase incompleta");

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) throw new Error("Sessão inválida");

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile, error: pErr } = await admin
    .from("users").select("id, role, status").eq("auth_user_id", user.id).single();
  if (pErr || !profile) throw new Error("Perfil não encontrado");
  if (profile.status !== "ativo") throw new Error("Acesso negado: usuário inativo");
  if (!ADMIN_ROLES.includes(profile.role)) throw new Error("Acesso negado: requer perfil administrativo");

  return { admin, actorId: profile.id as string };
}

async function audit(admin: ReturnType<typeof createClient>, actorId: string, area: string, action: string, target: string, details: Record<string, unknown> = {}) {
  try {
    await admin.from("system_settings_audit").insert({ actor_id: actorId, area, action, target, details });
  } catch (_) { /* não bloquear */ }
}

// Valida a chave chamando um endpoint leve do provedor.
async function validateKey(provider: Provider, key: string): Promise<boolean> {
  try {
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return r.ok;
    }
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      });
      return r.ok;
    }
    if (provider === "google") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      return r.ok;
    }
  } catch (_) {
    return false;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { admin, actorId } = await ensureAdmin(req);
    const body = await req.json();
    const action: string = body?.action;
    const payload = body?.payload ?? {};

    // --------- Credenciais de IA ---------
    if (action === "credential.set") {
      const provider = payload.provider as Provider;
      const apiKey = (payload.apiKey as string ?? "").trim();
      if (!PROVIDERS.includes(provider)) return json({ error: "Provedor inválido" }, 400);
      if (apiKey.length < 8) return json({ error: "Chave inválida" }, 400);

      await admin.rpc("set_ai_secret", { p_name: secretName(provider), p_secret: apiKey });
      const masked = mask(apiKey);
      await admin.from("system_ai_credentials").update({
        masked_hint: masked, status: "configured", updated_by: actorId, updated_at: new Date().toISOString(),
      }).eq("provider", provider);
      await audit(admin, actorId, "credential", "rotate", provider, { masked });
      return json({ provider, masked_hint: masked, status: "configured" });
    }

    if (action === "credential.validate") {
      const provider = payload.provider as Provider;
      if (!PROVIDERS.includes(provider)) return json({ error: "Provedor inválido" }, 400);
      const { data: secret } = await admin.rpc("get_ai_secret", { p_name: secretName(provider) });
      if (!secret) {
        await admin.from("system_ai_credentials").update({ status: "empty" }).eq("provider", provider);
        return json({ provider, status: "empty" });
      }
      const ok = await validateKey(provider, secret as string);
      const status = ok ? "valid" : "invalid";
      await admin.from("system_ai_credentials").update({
        status, last_validated_at: new Date().toISOString(),
      }).eq("provider", provider);
      await audit(admin, actorId, "credential", "validate", provider, { result: status });
      return json({ provider, status });
    }

    if (action === "credential.delete") {
      const provider = payload.provider as Provider;
      if (!PROVIDERS.includes(provider)) return json({ error: "Provedor inválido" }, 400);
      await admin.rpc("delete_ai_secret", { p_name: secretName(provider) });
      await admin.from("system_ai_credentials").update({
        masked_hint: null, status: "empty", last_validated_at: null, updated_by: actorId, updated_at: new Date().toISOString(),
      }).eq("provider", provider);
      await audit(admin, actorId, "credential", "delete", provider, {});
      return json({ provider, status: "empty" });
    }

    // --------- Teste de webhook ---------
    if (action === "webhook.test") {
      const targetUrl = (payload.url as string ?? "").trim();
      if (!/^https?:\/\//i.test(targetUrl)) return json({ error: "URL inválida" }, 400);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "ping", source: "e7ai-system-settings", at: new Date().toISOString() }),
          signal: ctrl.signal,
        });
        await audit(admin, actorId, "webhook", "validate", payload.slug ?? targetUrl, { status: r.status });
        // Teste de CONECTIVIDADE: receber qualquer resposta HTTP prova que o endpoint
        // está acessível (ex.: n8n pode responder 400 ao ping e ainda assim recebeu).
        // Falha real = erro de rede/DNS/timeout (cai no catch).
        return json({ ok: true, reachable: true, status: r.status });
      } catch (e) {
        const aborted = e instanceof Error && e.name === "AbortError";
        return json({ ok: false, reachable: false, error: aborted ? "Tempo de conexão esgotado" : (e instanceof Error ? e.message : "Falha na conexão") });
      } finally {
        clearTimeout(timer);
      }
    }

    return json({ error: "Ação não suportada" }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    const status = msg.includes("Acesso negado") || msg.includes("autorizado") || msg.includes("Sessão") ? 403 : 500;
    return json({ error: msg }, status);
  }
});
